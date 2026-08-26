const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const {
  authenticateUser,
} = require("../Middlewares/AuthMiddleware.js");

const {
  uploadDataset,
} = require("../Controllers/DatasetController.js");

const router = express.Router();

const uploadDirectory = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}.csv`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed."));
    }
  },

  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.post(
  "/datasets/upload",
  authenticateUser,
  upload.single("file"),
  uploadDataset
);

module.exports = router;
