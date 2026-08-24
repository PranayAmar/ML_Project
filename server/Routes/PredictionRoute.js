const express = require("express");
const { predictDemand } = require("../Controllers/PredictionController.js");

const router = express.Router();

router.post("/predict", predictDemand);

module.exports = router;
