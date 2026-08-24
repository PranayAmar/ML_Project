const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();

const authRoute = require('./Routes/AuthRoute.js');
const predictionRoute = require("./Routes/PredictionRoute.js");

const { MONGO_URL } = process.env;
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:4000',
    ],
    methods: ['GET', 'PUT', 'POST', 'DELETE'],
    credentials: true,
  })
);

app.use("/", authRoute);
app.use("/", predictionRoute);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: 'Route not found.',
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  return res.status(500).json({
    success: false,
    message: 'Internal Server Error.',
  });
});

console.log("Testing MongoDB connection...");

mongoose
  .connect(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  })
  .then(() => {
    console.log("MongoDB connected successfully.");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB Connection Error:", err);
    process.exit(1);
  });
