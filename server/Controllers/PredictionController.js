require("dotenv").config();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

module.exports.predictDemand = async (req, res) => {
  try {
    const { product, forecastDays } = req.body;

    if (!product || !forecastDays) {
      return res.status(400).json({
        success: false,
        message: "Product and forecast period are required.",
      });
    }

    if (!ML_SERVICE_URL) {
      return res.status(500).json({
        success: false,
        message: "ML_SERVICE_URL is not configured.",
      });
    }

    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found.",
      });
    }

    const mlResponse = await fetch(
      `${ML_SERVICE_URL.replace(/\/$/, "")}/predict`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyId: String(req.user.userId),
          product,
          forecastDays: Number(forecastDays),
        }),
      }
    );

    const mlData = await mlResponse.json();

    if (!mlResponse.ok) {
      return res.status(mlResponse.status).json({
        success: false,
        message:
          mlData.detail ||
          mlData.message ||
          "ML service failed to generate prediction.",
      });
    }

    return res.status(200).json(mlData);
  } catch (error) {
    console.error("Prediction Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate prediction.",
    });
  }
};
