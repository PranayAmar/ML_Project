from fastapi import FastAPI

app = FastAPI(title="DemandForecast AI")

@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "demand-forecasting-ml"
    }
