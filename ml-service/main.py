
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import pandas as pd
import numpy as np
import os
import requests
import time
import joblib
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error

app = FastAPI(title="DemandForecast AI")

# =========================================================
# CONFIGURATION
# =========================================================

NODE_API_URL = os.getenv("NODE_API_URL")
ML_SERVICE_KEY = os.getenv("ML_SERVICE_KEY")

CACHED_DF = {}
CACHE_LOADED_AT = {}
CACHE_TTL_SECONDS = 30 * 60

TRAINED_MODELS = {}
MODEL_METADATA = {}

MODEL_DIR = os.getenv("MODEL_DIR", "/tmp/demandforecast_models")
os.makedirs(MODEL_DIR, exist_ok=True)


# =========================================================
# REQUEST MODELS
# =========================================================

class TrainRequest(BaseModel):
    companyId: str


class PredictRequest(BaseModel):
    companyId: str
    product: str
    forecastDays: int = Field(default=7, ge=1, le=30)


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "demand-forecasting-ml",
        "nodeApiConfigured": bool(NODE_API_URL),
        "mlKeyConfigured": bool(ML_SERVICE_KEY),
        "trainedCompanies": len(TRAINED_MODELS),
    }


# =========================================================
# FETCH DATA FROM NODE BACKEND
# =========================================================

def fetch_dataset_from_node(company_id, force_refresh=False):
    global CACHED_DF, CACHE_LOADED_AT

    if not company_id:
        raise RuntimeError("companyId is required.")

    now = time.time()

    cached_df = CACHED_DF.get(company_id)
    cached_at = CACHE_LOADED_AT.get(company_id, 0)

    if (
        not force_refresh
        and cached_df is not None
        and now - cached_at < CACHE_TTL_SECONDS
    ):
        return cached_df.copy()

    if not NODE_API_URL:
        raise RuntimeError(
            "NODE_API_URL environment variable is not set."
        )

    if not ML_SERVICE_KEY:
        raise RuntimeError(
            "ML_SERVICE_KEY environment variable is not set."
        )

    all_rows = []
    page = 1
    page_size = 5000

    while True:
        response = requests.get(
            f"{NODE_API_URL.rstrip('/')}/datasets/ml-data",
            params={
                "page": page,
                "limit": page_size,
                "companyId": company_id,
            },
            headers={
                "x-ml-service-key": ML_SERVICE_KEY,
            },
            timeout=120,
        )

        if response.status_code == 429:
            raise RuntimeError(
                f"Node API rate-limited page {page}."
            )

        response.raise_for_status()

        payload = response.json()

        if not payload.get("success"):
            raise RuntimeError(
                payload.get(
                    "message",
                    "Node API returned an unsuccessful response.",
                )
            )

        page_data = payload.get("data", [])

        if not isinstance(page_data, list):
            raise RuntimeError(
                f"Invalid dataset response on page {page}."
            )

        all_rows.extend(page_data)

        if not payload.get("hasMore", False):
            break

        page += 1
        time.sleep(0.5)

    if not all_rows:
        raise RuntimeError(
            "No dataset records found for this company."
        )

    df = pd.DataFrame(all_rows)

    CACHED_DF[company_id] = df.copy()
    CACHE_LOADED_AT[company_id] = time.time()

    return df.copy()


# =========================================================
# LOAD DATASET
# =========================================================

def load_dataset(product=None, company_id=None):
    if not company_id:
        raise HTTPException(
            status_code=400,
            detail="companyId is required.",
        )

    df = fetch_dataset_from_node(company_id)

    if product:
        df = df[
            df["product"].astype(str).str.strip().str.lower()
            == product.strip().lower()
        ].copy()

    if df.empty:
        raise HTTPException(
            status_code=404,
            detail="No dataset records found.",
        )

    return df


# =========================================================
# CLEAN RAW DATA
# =========================================================

def clean_dataset(df):
    required_columns = [
        "date",
        "product",
        "category",
        "storeId",
        "quantitySold",
        "unitPrice",
        "discountPercent",
        "promotionActive",
        "stockAvailable",
        "stockout",
        "isHoliday",
        "holidayName",
        "festival",
        "isWorkingDay",
        "weather",
        "temperature",
    ]

    missing_columns = [
        c for c in required_columns if c not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    df = df.copy()

    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    for column in [
        "quantitySold",
        "unitPrice",
        "discountPercent",
        "stockAvailable",
        "temperature",
    ]:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    for column in [
        "promotionActive",
        "stockout",
        "isHoliday",
        "isWorkingDay",
    ]:
        df[column] = (
            df[column]
            .astype(str)
            .str.strip()
            .str.lower()
            .eq("true")
        )

    df = df.dropna(
        subset=[
            "date",
            "product",
            "quantitySold",
            "unitPrice",
        ]
    )

    df["discountPercent"] = df["discountPercent"].fillna(0)
    df["stockAvailable"] = df["stockAvailable"].fillna(0)

    if df["temperature"].notna().any():
        df["temperature"] = df["temperature"].fillna(
            df["temperature"].median()
        )
    else:
        df["temperature"] = 0

    for column, default in [
        ("holidayName", "None"),
        ("festival", "None"),
        ("weather", "Unknown"),
    ]:
        df[column] = df[column].fillna(default).astype(str)

    return df.sort_values(
        ["date", "product", "storeId"]
    ).reset_index(drop=True)


# =========================================================
# AGGREGATE STORE DATA TO PRODUCT-DAY
# =========================================================

def aggregate_product_day(raw_df):
    df = raw_df.copy()

    numeric = df.groupby(
        ["date", "product"],
        as_index=False
    ).agg(
        quantitySold=("quantitySold", "sum"),
        unitPrice=("unitPrice", "mean"),
        discountPercent=("discountPercent", "mean"),
        promotionRate=("promotionActive", "mean"),
        stockAvailable=("stockAvailable", "sum"),
        stockoutRate=("stockout", "mean"),
        temperature=("temperature", "mean"),
        isHoliday=("isHoliday", "max"),
        isWorkingDay=("isWorkingDay", "max"),
    )

    def mode_or_default(series, default):
        modes = series.dropna().astype(str).mode()
        return modes.iloc[0] if not modes.empty else default

    categorical = df.groupby(
        ["date", "product"],
        as_index=False
    ).agg(
        category=("category", "first"),
        holidayName=(
            "holidayName",
            lambda x: mode_or_default(x, "None"),
        ),
        festival=(
            "festival",
            lambda x: mode_or_default(x, "None"),
        ),
        weather=(
            "weather",
            lambda x: mode_or_default(x, "Unknown"),
        ),
    )

    daily = numeric.merge(
        categorical,
        on=["date", "product"],
        how="left",
    )

    return daily.sort_values(
        ["product", "date"]
    ).reset_index(drop=True)


# =========================================================
# FEATURE ENGINEERING
# =========================================================

def create_features(daily_df):
    df = daily_df.copy()

    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["day"] = df["date"].dt.day
    df["dayOfWeek"] = df["date"].dt.dayofweek

    df["weekOfYear"] = (
        df["date"]
        .dt.isocalendar()
        .week
        .astype(int)
    )

    df["quarter"] = df["date"].dt.quarter
    df["isWeekend"] = (df["dayOfWeek"] >= 5).astype(int)

    df["holidayFlag"] = df["isHoliday"].astype(int)
    df["workingFlag"] = df["isWorkingDay"].astype(int)

    df["promotionFlag"] = (
        df["promotionRate"] > 0
    ).astype(int)

    df["daysSinceStart"] = (
        df["date"] - df["date"].min()
    ).dt.days

    grouped = df.groupby("product")["quantitySold"]

    for lag in [1, 7, 14, 28]:
        df[f"lag{lag}"] = grouped.shift(lag)

    for window in [7, 14, 30]:
        df[f"rollingMean{window}"] = grouped.transform(
            lambda x, w=window:
            x.shift(1).rolling(w).mean()
        )

    df["rollingStd7"] = grouped.transform(
        lambda x:
        x.shift(1).rolling(7).std()
    )

    df["priceChange"] = (
        df.groupby("product")["unitPrice"]
        .pct_change()
        .replace(
            [np.inf, -np.inf],
            0,
        )
        .fillna(0)
    )

    df["stockCoverageRatio"] = (
        df["stockAvailable"]
        / df["rollingMean7"].fillna(1).clip(lower=1)
    )

    df["festivalActive"] = (
        df["festival"]
        .fillna("None")
        .astype(str)
        .str.strip()
        .str.lower()
        .ne("none")
        .astype(int)
    )

    return df


# =========================================================
# MODEL FEATURES
# =========================================================

CATEGORICAL_FEATURES = [
    "product",
    "category",
    "holidayName",
    "festival",
    "weather",
]

NUMERIC_FEATURES = [
    "year",
    "month",
    "day",
    "dayOfWeek",
    "weekOfYear",
    "quarter",
    "isWeekend",
    "holidayFlag",
    "workingFlag",
    "promotionFlag",
    "promotionRate",
    "stockoutRate",
    "discountPercent",
    "unitPrice",
    "temperature",
    "stockAvailable",
    "stockCoverageRatio",
    "daysSinceStart",
    "lag1",
    "lag7",
    "lag14",
    "lag28",
    "rollingMean7",
    "rollingMean14",
    "rollingMean30",
    "rollingStd7",
    "priceChange",
    "festivalActive",
]

FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES
TARGET = "quantitySold"


# =========================================================
# METRICS
# =========================================================

def calculate_metrics(actual, predicted):
    actual = np.asarray(actual, dtype=float)
    predicted = np.asarray(predicted, dtype=float)

    denominator = np.where(
        np.abs(actual) < 1e-9,
        1.0,
        np.abs(actual),
    )

    mae = mean_absolute_error(actual, predicted)

    rmse = np.sqrt(
        mean_squared_error(actual, predicted)
    )

    mape = np.mean(
        np.abs(actual - predicted) / denominator
    ) * 100

    return {
        "mae": round(float(mae), 4),
        "rmse": round(float(rmse), 4),
        "mape": round(float(mape), 4),
    }


# =========================================================
# TRAIN MODEL
# =========================================================

def train_company_model(company_id, force_refresh=False):
    raw = fetch_dataset_from_node(
        company_id,
        force_refresh=force_refresh,
    )

    raw = clean_dataset(raw)

    daily = aggregate_product_day(raw)

    if daily["date"].nunique() < 90:
        raise RuntimeError(
            "At least 90 days of historical data are required."
        )

    features_df = create_features(daily)

    features_df = features_df.dropna(
        subset=[
            "lag28",
            "rollingMean30",
        ]
    ).reset_index(drop=True)

    if len(features_df) < 500:
        raise RuntimeError(
            "Not enough usable records after feature engineering."
        )

    unique_dates = sorted(
        features_df["date"].unique()
    )

    split_index = max(
        1,
        int(len(unique_dates) * 0.80)
    )

    split_date = unique_dates[split_index]

    train_df = features_df[
        features_df["date"] < split_date
    ].copy()

    validation_df = features_df[
        features_df["date"] >= split_date
    ].copy()

    if train_df.empty or validation_df.empty:
        raise RuntimeError(
            "Unable to create time-based train/validation split."
        )

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "categorical",
                OneHotEncoder(
                    handle_unknown="ignore"
                ),
                CATEGORICAL_FEATURES,
            ),
        ],
        remainder="passthrough",
        sparse_threshold=0,
    )

    candidate_models = {
        "HistGradientBoosting": HistGradientBoostingRegressor(
            max_iter=350,
            learning_rate=0.05,
            max_leaf_nodes=31,
            l2_regularization=1.0,
            random_state=42,
        ),
        "RandomForest": RandomForestRegressor(
            n_estimators=250,
            max_depth=18,
            min_samples_leaf=2,
            n_jobs=-1,
            random_state=42,
        ),
    }

    results = []
    best_pipeline = None
    best_name = None
    best_metrics = None

    for name, model in candidate_models.items():
        pipeline = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("model", model),
            ]
        )

        pipeline.fit(
            train_df[FEATURES],
            train_df[TARGET],
        )

        validation_predictions = np.maximum(
            pipeline.predict(validation_df[FEATURES]),
            0,
        )

        metrics = calculate_metrics(
            validation_df[TARGET],
            validation_predictions,
        )

        results.append({
            "model": name,
            **metrics,
        })

        if (
            best_metrics is None
            or metrics["rmse"] < best_metrics["rmse"]
        ):
            best_pipeline = pipeline
            best_name = name
            best_metrics = metrics

    # Calculate residual variability for a simple prediction band.
    best_validation_predictions = np.maximum(
        best_pipeline.predict(validation_df[FEATURES]),
        0,
    )

    residual_std = float(
        np.std(
            validation_df[TARGET].to_numpy()
            - best_validation_predictions
        )
    )

    metadata = {
        "model": best_name,
        "metrics": best_metrics,
        "candidates": results,
        "trainingRecords": int(len(train_df)),
        "validationRecords": int(len(validation_df)),
        "trainingStart": (
            train_df["date"].min().strftime("%Y-%m-%d")
        ),
        "trainingEnd": (
            train_df["date"].max().strftime("%Y-%m-%d")
        ),
        "validationStart": (
            validation_df["date"].min().strftime("%Y-%m-%d")
        ),
        "validationEnd": (
            validation_df["date"].max().strftime("%Y-%m-%d")
        ),
        "products": sorted(
            daily["product"].unique().tolist()
        ),
        "residualStd": residual_std,
        "featureCount": len(FEATURES),
        "trainedAt": pd.Timestamp.utcnow().isoformat(),
    }

    TRAINED_MODELS[company_id] = best_pipeline
    MODEL_METADATA[company_id] = {
        **metadata,
        "dailyHistory": daily,
    }

    artifact_path = os.path.join(
        MODEL_DIR,
        f"{company_id}.joblib",
    )

    joblib.dump(
        {
            "model": best_pipeline,
            "metadata": {
                k: v
                for k, v in metadata.items()
                if k != "dailyHistory"
            },
            "dailyHistory": daily,
        },
        artifact_path,
    )

    return metadata


# =========================================================
# LOAD SAVED MODEL IF AVAILABLE
# =========================================================

def get_trained_model(company_id):
    if company_id in TRAINED_MODELS:
        return (
            TRAINED_MODELS[company_id],
            MODEL_METADATA[company_id],
        )

    artifact_path = os.path.join(
        MODEL_DIR,
        f"{company_id}.joblib",
    )

    if not os.path.exists(artifact_path):
        return None, None

    artifact = joblib.load(artifact_path)

    TRAINED_MODELS[company_id] = artifact["model"]

    metadata = artifact["metadata"]

    # Re-fetch current company data for future forecasting.
    try:
        raw = clean_dataset(
            fetch_dataset_from_node(company_id)
        )

        metadata["dailyHistory"] = aggregate_product_day(
            raw
        )
    except Exception:
        metadata["dailyHistory"] = None

    MODEL_METADATA[company_id] = metadata

    return (
        TRAINED_MODELS[company_id],
        MODEL_METADATA[company_id],
    )


# =========================================================
# FUTURE EXOGENOUS FEATURES
# =========================================================

def build_future_rows(daily_history, product, forecast_days):
    product_history = daily_history[
        daily_history["product"]
        .astype(str)
        .str.lower()
        == product.strip().lower()
    ].copy()

    if product_history.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No historical data found for product '{product}'.",
        )

    product_history = product_history.sort_values("date")

    last_date = product_history["date"].max()

    recent = product_history.tail(
        min(30, len(product_history))
    )

    def safe_median(column, default=0):
        values = pd.to_numeric(
            recent[column],
            errors="coerce",
        ).dropna()

        if values.empty:
            return default

        return float(values.median())

    def safe_mode(column, default):
        modes = (
            recent[column]
            .dropna()
            .astype(str)
            .mode()
        )

        return modes.iloc[0] if not modes.empty else default

    # Historical calendar mapping lets future dates inherit
    # known holiday/festival patterns from previous years.
    calendar_history = product_history.copy()
    calendar_history["month"] = calendar_history["date"].dt.month
    calendar_history["day"] = calendar_history["date"].dt.day

    future_dates = pd.date_range(
        last_date + pd.Timedelta(days=1),
        periods=forecast_days,
        freq="D",
    )

    rows = []

    for future_date in future_dates:
        month = future_date.month
        day = future_date.day

        same_calendar = calendar_history[
            (calendar_history["month"] == month)
            & (calendar_history["day"] == day)
        ]

        if same_calendar.empty:
            holiday_name = "None"
            festival = "None"
            is_holiday = False
        else:
            holiday_name = (
                same_calendar["holidayName"]
                .mode()
                .iloc[0]
            )

            festival = (
                same_calendar["festival"]
                .mode()
                .iloc[0]
            )

            is_holiday = bool(
                same_calendar["isHoliday"].max()
            )

        is_working_day = (
            future_date.dayofweek < 5
            and not is_holiday
        )

        rows.append({
            "date": future_date,
            "product": product_history["product"].iloc[0],
            "category": product_history["category"].iloc[0],
            "holidayName": holiday_name,
            "festival": festival,
            "weather": safe_mode(
                "weather",
                "Unknown",
            ),
            "isHoliday": is_holiday,
            "isWorkingDay": is_working_day,
            "promotionRate": safe_median(
                "promotionRate",
                0,
            ),
            "discountPercent": safe_median(
                "discountPercent",
                0,
            ),
            "unitPrice": safe_median(
                "unitPrice",
                0,
            ),
            "stockAvailable": safe_median(
                "stockAvailable",
                0,
            ),
            "stockoutRate": 0.0,
            "temperature": safe_median(
                "temperature",
                0,
            ),
        })

    return pd.DataFrame(rows)


# =========================================================
# RECURSIVE FORECAST
# =========================================================

def forecast_product(
    model,
    metadata,
    product,
    forecast_days,
):
    daily_history = metadata.get("dailyHistory")

    if daily_history is None or daily_history.empty:
        raise RuntimeError(
            "Historical data is unavailable for forecasting."
        )

    history = daily_history.copy()

    history = history.sort_values(
        ["product", "date"]
    ).reset_index(drop=True)

    future = build_future_rows(
        history,
        product,
        forecast_days,
    )

    product_history = history[
        history["product"]
        .astype(str)
        .str.lower()
        == product.strip().lower()
    ].copy()

    combined = product_history[
        [
            "date",
            "product",
            "category",
            "quantitySold",
            "unitPrice",
            "discountPercent",
            "promotionRate",
            "stockAvailable",
            "stockoutRate",
            "temperature",
            "isHoliday",
            "isWorkingDay",
            "holidayName",
            "festival",
            "weather",
        ]
    ].copy()

    predictions = []

    for index in range(len(future)):
        row = future.iloc[index].copy()

        temp = pd.concat(
            [
                combined,
                pd.DataFrame([row]),
            ],
            ignore_index=True,
        )

        temp = temp.sort_values("date").reset_index(drop=True)

        features_temp = create_features(temp)

        current = features_temp.iloc[-1].copy()

        # Some rolling/lag fields can still be missing if
        # historical data is shorter than the requested horizon.
        for feature in [
            "lag1",
            "lag7",
            "lag14",
            "lag28",
            "rollingMean7",
            "rollingMean14",
            "rollingMean30",
            "rollingStd7",
        ]:
            if pd.isna(current[feature]):
                current[feature] = (
                    float(
                        product_history["quantitySold"]
                        .tail(30)
                        .mean()
                    )
                    if feature.startswith("lag")
                    or feature.startswith("rollingMean")
                    else 0
                )

        if pd.isna(current["priceChange"]):
            current["priceChange"] = 0

        if pd.isna(current["stockCoverageRatio"]):
            current["stockCoverageRatio"] = (
                row["stockAvailable"]
                / max(
                    float(current["rollingMean7"]),
                    1,
                )
            )

        if pd.isna(current["temperature"]):
            current["temperature"] = (
                float(
                    product_history["temperature"]
                    .tail(30)
                    .median()
                )
            )

        X_future = pd.DataFrame(
            [current[FEATURES].to_dict()]
        )

        predicted = float(
            max(
                0,
                model.predict(X_future)[0],
            )
        )

        predictions.append({
            "date": row["date"].strftime("%Y-%m-%d"),
            "predictedDemand": round(
                predicted,
                2,
            ),
            "holiday": (
                row["holidayName"]
                if row["holidayName"] != "None"
                else None
            ),
            "festival": (
                row["festival"]
                if row["festival"] != "None"
                else None
            ),
            "promotionRate": round(
                float(row["promotionRate"]) * 100,
                2,
            ),
            "discountPercent": round(
                float(row["discountPercent"]),
                2,
            ),
        })

        row["quantitySold"] = predicted

        combined = pd.concat(
            [
                combined,
                pd.DataFrame([row]),
            ],
            ignore_index=True,
        )

    residual_std = float(
        metadata.get("residualStd", 0)
    )

    for item in predictions:
        predicted = item["predictedDemand"]

        # 1.96 approximates a 95% residual band.
        band = 1.96 * residual_std

        item["lowerBound"] = round(
            max(0, predicted - band),
            2,
        )

        item["upperBound"] = round(
            predicted + band,
            2,
        )

    return predictions


# =========================================================
# DATA SUMMARY
# =========================================================

@app.get("/data-summary")
def data_summary(
    companyId: str = None,
    product: str = None,
):
    try:
        df = load_dataset(product, companyId)
        df = clean_dataset(df)

        return {
            "status": "ok",
            "records": int(len(df)),
            "products": sorted(
                df["product"]
                .dropna()
                .unique()
                .tolist()
            ),
            "stores": sorted(
                df["storeId"]
                .dropna()
                .unique()
                .tolist()
            ),
            "dateRange": {
                "start": df["date"]
                .min()
                .strftime("%Y-%m-%d"),
                "end": df["date"]
                .max()
                .strftime("%Y-%m-%d"),
            },
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Data summary failed: {str(error)}",
        )


# =========================================================
# FEATURE PREVIEW
# =========================================================

@app.get("/feature-preview")
def feature_preview(
    companyId: str = None,
    product: str = None,
    limit: int = 10,
):
    try:
        if limit < 1 or limit > 100:
            raise HTTPException(
                status_code=400,
                detail="limit must be between 1 and 100.",
            )

        df = load_dataset(product, companyId)
        df = clean_dataset(df)
        daily = aggregate_product_day(df)
        daily = create_features(daily)

        preview = daily.tail(limit).copy()

        preview["date"] = (
            preview["date"]
            .dt.strftime("%Y-%m-%d")
        )

        preview = preview.replace(
            [np.inf, -np.inf],
            None,
        )

        preview = preview.where(
            pd.notnull(preview),
            None,
        )

        return {
            "status": "ok",
            "rows": preview.to_dict(
                orient="records"
            ),
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Feature generation failed: {str(error)}",
        )


# =========================================================
# TRAIN
# =========================================================

@app.post("/train")
def train_model(request: TrainRequest):
    try:
        metadata = train_company_model(
            request.companyId,
            force_refresh=True,
        )

        return {
            "success": True,
            "message": "Demand forecasting model trained successfully.",
            "model": {
                "name": metadata["model"],
                "metrics": metadata["metrics"],
                "candidates": metadata["candidates"],
                "trainingRecords": metadata["trainingRecords"],
                "validationRecords": metadata["validationRecords"],
                "trainingPeriod": {
                    "start": metadata["trainingStart"],
                    "end": metadata["trainingEnd"],
                },
                "validationPeriod": {
                    "start": metadata["validationStart"],
                    "end": metadata["validationEnd"],
                },
                "featureCount": metadata["featureCount"],
                "products": metadata["products"],
                "trainedAt": metadata["trainedAt"],
            },
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Model training failed: {str(error)}",
        )


# =========================================================
# MODEL STATUS
# =========================================================

@app.get("/model-status")
def model_status(companyId: str = None):
    if not companyId:
        raise HTTPException(
            status_code=400,
            detail="companyId is required.",
        )

    _, metadata = get_trained_model(companyId)

    if metadata is None:
        return {
            "success": True,
            "trained": False,
        }

    return {
        "success": True,
        "trained": True,
        "model": {
            "name": metadata["model"],
            "metrics": metadata["metrics"],
            "candidates": metadata["candidates"],
            "trainingRecords": metadata["trainingRecords"],
            "validationRecords": metadata["validationRecords"],
            "trainingPeriod": {
                "start": metadata["trainingStart"],
                "end": metadata["trainingEnd"],
            },
            "validationPeriod": {
                "start": metadata["validationStart"],
                "end": metadata["validationEnd"],
            },
            "featureCount": metadata["featureCount"],
            "products": metadata["products"],
            "trainedAt": metadata["trainedAt"],
        },
    }


# =========================================================
# PREDICT
# =========================================================

@app.post("/predict")
def predict(request: PredictRequest):
    try:
        if request.forecastDays < 1 or request.forecastDays > 30:
            raise HTTPException(
                status_code=400,
                detail="forecastDays must be between 1 and 30.",
            )

        model, metadata = get_trained_model(
            request.companyId
        )

        if model is None or metadata is None:
            metadata = train_company_model(
                request.companyId,
                force_refresh=True,
            )

            model = TRAINED_MODELS[
                request.companyId
            ]

        predictions = forecast_product(
            model=model,
            metadata=MODEL_METADATA[
                request.companyId
            ],
            product=request.product,
            forecast_days=request.forecastDays,
        )

        return {
            "success": True,
            "product": request.product,
            "forecastDays": request.forecastDays,
            "model": {
                "name": metadata["model"],
                "metrics": metadata["metrics"],
            },
            "forecast": predictions,
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(error)}",
        )
