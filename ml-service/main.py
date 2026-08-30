from fastapi import FastAPI, HTTPException
import pandas as pd
import os
import requests

app = FastAPI(title="DemandForecast AI")


# =========================================================
# CONFIGURATION
# =========================================================

NODE_API_URL = os.getenv("NODE_API_URL")
ML_SERVICE_KEY = os.getenv("ML_SERVICE_KEY")


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
    }
# =========================================================
# FETCH DATA FROM NODE BACKEND
# =========================================================

def fetch_dataset_from_node():
    if not NODE_API_URL:
        raise RuntimeError(
            "NODE_API_URL environment variable is not set."
        )

    if not ML_SERVICE_KEY:
        raise RuntimeError(
            "ML_SERVICE_KEY environment variable is not set."
        )

    response = requests.get(
        f"{NODE_API_URL.rstrip('/')}/datasets/ml-data",
        headers={
            "x-ml-service-key": ML_SERVICE_KEY,
        },
        timeout=60,
    )

    response.raise_for_status()

    payload = response.json()

    if not payload.get("success"):
        raise RuntimeError(
            payload.get(
                "message",
                "Unable to fetch dataset from Node API.",
            )
        )

    data = payload.get("data", [])

    if not data:
        raise RuntimeError(
            "Node API returned an empty dataset."
        )

    return pd.DataFrame(data)


# =========================================================
# LOAD DATA
# =========================================================

def load_dataset(product=None):
    df = fetch_dataset_from_node()

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
# DATA CLEANING
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
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing_columns:
        raise ValueError(
            f"Missing required columns: {missing_columns}"
        )

    df["date"] = pd.to_datetime(
        df["date"],
        errors="coerce",
    )

    numeric_columns = [
        "quantitySold",
        "unitPrice",
        "discountPercent",
        "stockAvailable",
        "temperature",
    ]

    for column in numeric_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce",
        )

    df = df.dropna(
        subset=[
            "date",
            "product",
            "quantitySold",
        ]
    )

    df = df.sort_values(
        ["product", "storeId", "date"]
    ).reset_index(drop=True)

    df["discountPercent"] = (
        df["discountPercent"].fillna(0)
    )

    df["stockAvailable"] = (
        df["stockAvailable"].fillna(0)
    )

    if df["temperature"].notna().any():
        df["temperature"] = (
            df["temperature"]
            .fillna(df["temperature"].median())
        )
    else:
        df["temperature"] = 0

    return df


# =========================================================
# FEATURE ENGINEERING
# =========================================================

def create_features(df):
    df = df.copy()

    # -----------------------------
    # CALENDAR FEATURES
    # -----------------------------

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

    df["isWeekend"] = (
        df["dayOfWeek"] >= 5
    ).astype(int)

    # -----------------------------
    # BUSINESS FEATURES
    # -----------------------------

    df["isHolidayFlag"] = (
        df["isHoliday"]
        .astype(bool)
        .astype(int)
    )

    df["isWorkingDayFlag"] = (
        df["isWorkingDay"]
        .astype(bool)
        .astype(int)
    )

    df["promotionFlag"] = (
        df["promotionActive"]
        .astype(bool)
        .astype(int)
    )

    df["stockoutFlag"] = (
        df["stockout"]
        .astype(bool)
        .astype(int)
    )

    # -----------------------------
    # TREND
    # -----------------------------

    min_date = df["date"].min()

    df["daysSinceStart"] = (
        df["date"] - min_date
    ).dt.days

    # -----------------------------
    # HISTORICAL DEMAND
    # -----------------------------

    grouped = (
        df.groupby(
            ["product", "storeId"]
        )["quantitySold"]
    )

    df["lag1"] = grouped.shift(1)
    df["lag7"] = grouped.shift(7)
    df["lag14"] = grouped.shift(14)
    df["lag28"] = grouped.shift(28)

    # -----------------------------
    # ROLLING DEMAND
    # -----------------------------

    grouped_demand = (
        df.groupby(
            ["product", "storeId"]
        )["quantitySold"]
    )

    df["rollingMean7"] = (
        grouped_demand.transform(
            lambda x:
                x.shift(1)
                .rolling(7)
                .mean()
        )
    )

    df["rollingMean14"] = (
        grouped_demand.transform(
            lambda x:
                x.shift(1)
                .rolling(14)
                .mean()
        )
    )

    df["rollingMean30"] = (
        grouped_demand.transform(
            lambda x:
                x.shift(1)
                .rolling(30)
                .mean()
        )
    )

    df["rollingStd7"] = (
        grouped_demand.transform(
            lambda x:
                x.shift(1)
                .rolling(7)
                .std()
        )
    )

    # -----------------------------
    # PRICE
    # -----------------------------

    df["priceChange"] = (
        df.groupby(
            ["product", "storeId"]
        )["unitPrice"]
        .pct_change()
        .replace(
            [float("inf"), float("-inf")],
            0,
        )
        .fillna(0)
    )

    # -----------------------------
    # STOCK
    # -----------------------------

    df["stockCoverageRatio"] = (
        df["stockAvailable"]
        / df["quantitySold"].replace(0, 1)
    )

    # -----------------------------
    # FESTIVAL
    # -----------------------------

    df["festivalActive"] = (
        df["festival"]
        .fillna("None")
        .astype(str)
        .str.strip()
        .str.lower()
        .ne("none")
        .astype(int)
    )

    # -----------------------------
    # WEATHER
    # -----------------------------

    df["weather"] = (
        df["weather"]
        .fillna("Unknown")
        .astype(str)
    )

    return df


# =========================================================
# DATA SUMMARY
# =========================================================

@app.get("/data-summary")
def data_summary(product=None):
    try:
        df = load_dataset(product)
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
                "start": (
                    df["date"]
                    .min()
                    .strftime("%Y-%m-%d")
                ),
                "end": (
                    df["date"]
                    .max()
                    .strftime("%Y-%m-%d")
                ),
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
    product=None,
    limit: int = 10,
):
    try:
        if limit < 1 or limit > 100:
            raise HTTPException(
                status_code=400,
                detail="limit must be between 1 and 100.",
            )

        df = load_dataset(product)
        df = clean_dataset(df)
        df = create_features(df)

        preview = df.tail(limit).copy()

        preview["date"] = (
            preview["date"]
            .dt.strftime("%Y-%m-%d")
        )

        preview = preview.replace(
            [float("inf"), float("-inf")],
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
