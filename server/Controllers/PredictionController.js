module.exports.predictDemand = async (req, res) => {
  try {
    const { product, dataset, forecastDays } = req.body;

    if (!product || !dataset || !forecastDays) {
      return res.status(400).json({
        success: false,
        message: "Product, dataset and forecast period are required.",
      });
    }

    // Temporary response.
    // Real ML model will be connected here next.
    return res.status(200).json({
      success: true,
      message: "Prediction request received successfully.",
      prediction: {
        product,
        dataset,
        forecastDays: Number(forecastDays),
      },
    });
  } catch (error) {
    console.error("Prediction Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate prediction.",
    });
  }
};
