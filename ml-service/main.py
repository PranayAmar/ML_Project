from fastapi import FastAPI, HTTPException
from pymongo import MongoClient
import pandas as pd
import os

app = FastAPI(title="DemandForecast AI")


# =========================================================
# CONFIG
# =========================================================

MONGO_URL = os.getenv("MONGO_URL")


def get_mongo():
    if not MONGO_URL:
        raise RuntimeError("MONGO_URL environment variable is not set.")

    client = MongoClient(
        MONGO_URL,
        serverSelectionTimeoutMS=10000,
    )

    db = client["DemandForecast"]
    collection = db["datasets"]

    return client, collection


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "demand-forecasting-ml",
    }


# =========================================================
# DATABASE HEALTH
# =========================================================

@app.get("/db-health")
def database_health():
    try:
        client, collection = get_mongo()

        client.admin.command("ping")

        document_count = collection.count_documents({})

        client.close()

        return {
            "status": "ok",
            "mongodb": "connected",
            "datasetRecords": document_count,
        }

    except Exception as error:
        return {
            "status": "error",
            "mongodb": "connection_failed",
            "message": str(error),
        }


# =========================================================
# LOAD DATA
# =========================================================

def load_dataset(product=None):
    client, collection = get_mongo()

    query = {}

    if product:
        query["product"] = product

    documents = list(
        collection.find(
            query,
            {"_id": 0},
        )
    )

    client.close()

    if not documents:
        raise HTTPException(
            status_code=404,
            detail="No dataset records found.",
        )

    return pd.DataFrame(documents)


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

    df["discountPercent"] = df["discountPercent"].fillna(0)
    df["stockAvailable"] = df["stockAvailable"].fillna(0)

    if df["temperature"].notna().any():
        df["temperature"] = df["temperature"].fillna(
            df["temperature"].median()
        )
    else:
        df["temperature"] = 0

    return df


# =========================================================
# FEATURE ENGINEERING
# =========================================================

def create_features(df):
    df = df.copy()

    # Calendar
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["day"] = df["date"].dt.day
    df["dayOfWeek"] = df["date"].dt.dayofweek
    df["weekOfYear"] = df["date"].dt.isocalendar().week.astype(int)
    df["quarter"] = df["date"].dt.quarter

    df["isWeekend"] = (
        df["dayOfWeek"] >= 5
    ).astype(int)

    # Business features
    df["isHolidayFlag"] = (
        df["isHoliday"].astype(bool)
    ).astype(int)

    df["isWorkingDayFlag"] = (
        df["isWorkingDay"].astype(bool)
    ).astype(int)

    df["promotionFlag"] = (
        df["promotionActive"].astype(bool)
    ).astype(int)

    df["stockoutFlag"] = (
        df["stockout"].astype(bool)
    ).astype(int)

    # Trend
    min_date = df["date"].min()

    df["daysSinceStart"] = (
        df["date"] - min_date
    ).dt.days

    # Historical demand
    grouped = df.groupby(
        ["product", "storeId"]
    )["quantitySold"]

    df["lag1"] = grouped.shift(1)
    df["lag7"] = grouped.shift(7)
    df["lag14"] = grouped.shift(14)
    df["lag28"] = grouped.shift(28)

    # Rolling demand
    df["rollingMean7"] = (
        df.groupby(
            ["product", "storeId"]
        )["quantitySold"]
        .transform(
            lambda x: x.shift(1).rolling(7).mean()
        )
    )

    df["rollingMean14"] = (
        df.groupby(
            ["product", "storeId"]
        )["quantitySold"]
        .transform(
            lambda x: x.shift(1).rolling(14).mean()
        )
    )

    df["rollingMean30"] = (
        df.groupby(
            ["product", "storeId"]
        )["quantitySold"]
        .transform(
            lambda x: x.shift(1).rolling(30).mean()
        )
    )

    df["rollingStd7"] = (
        df.groupby(
            ["product", "storeId"]
        )["quantitySold"]
        .transform(
            lambda x: x.shift(1).rolling(7).std()
        )
    )

    # Price
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

    # Stock
    df["stockCoverageRatio"] = (
        df["stockAvailable"]
        / df["quantitySold"].replace(0, 1)
    )

    # Festival
    df["festivalActive"] = (
        df["festival"]
        .fillna("None")
        .astype(str)
        .str.lower()
        .ne("none")
        .astype(int)
    )

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
