require("dotenv").config();

module.exports.verifyMLService = (req, res, next) => {
  const serviceKey = req.headers["x-ml-service-key"];

  if (!serviceKey || serviceKey !== process.env.ML_SERVICE_KEY) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized ML service request.",
    });
  }

  next();
};
