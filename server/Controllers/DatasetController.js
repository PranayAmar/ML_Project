const csv = require("csv-parser");
const fs = require("fs");
const Dataset = require("../Models/DatasetModel.js");

const REQUIRED_COLUMNS = [
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
];

module.exports.uploadDataset = async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "CSV file is required.",
      });
    }

    filePath = req.file.path;

    const rows = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("headers", (headers) => {
          const missingColumns = REQUIRED_COLUMNS.filter(
            (column) => !headers.includes(column)
          );

          if (missingColumns.length > 0) {
            reject(
              new Error(
                `Missing required columns: ${missingColumns.join(", ")}`
              )
            );
          }
        })
        .on("data", (row) => {
          rows.push(row);
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "CSV file contains no data rows.",
      });
    }

    const documents = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;

      const parsedDate = new Date(row.date);
      const quantitySold = Number(row.quantitySold);
      const unitPrice = Number(row.unitPrice);
      const discountPercent = Number(row.discountPercent || 0);
      const stockAvailable = Number(row.stockAvailable);
      const temperature =
        row.temperature === "" || row.temperature == null
          ? null
          : Number(row.temperature);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid date at CSV row ${rowNumber}.`);
      }

      if (Number.isNaN(quantitySold) || quantitySold < 0) {
        throw new Error(`Invalid quantitySold at CSV row ${rowNumber}.`);
      }

      if (Number.isNaN(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid unitPrice at CSV row ${rowNumber}.`);
      }

      if (
        Number.isNaN(discountPercent) ||
        discountPercent < 0 ||
        discountPercent > 100
      ) {
        throw new Error(
          `Invalid discountPercent at CSV row ${rowNumber}.`
        );
      }

      if (Number.isNaN(stockAvailable) || stockAvailable < 0) {
        throw new Error(
          `Invalid stockAvailable at CSV row ${rowNumber}.`
        );
      }

      if (temperature !== null && Number.isNaN(temperature)) {
        throw new Error(`Invalid temperature at CSV row ${rowNumber}.`);
      }

      if (!row.product || !row.category || !row.storeId) {
        throw new Error(
          `Product, category and storeId are required at CSV row ${rowNumber}.`
        );
      }

      documents.push({
        companyId: req.user.userId,
        uploadedBy: req.user.userId,

        date: parsedDate,
        product: row.product.trim(),
        category: row.category.trim(),
        storeId: row.storeId.trim(),

        quantitySold,
        unitPrice,
        discountPercent,

        promotionActive:
          String(row.promotionActive).toLowerCase() === "true",

        stockAvailable,
        stockout: String(row.stockout).toLowerCase() === "true",

        isHoliday: String(row.isHoliday).toLowerCase() === "true",

        holidayName: row.holidayName?.trim() || "",
        festival: row.festival?.trim() || "None",

        isWorkingDay:
          row.isWorkingDay === ""
            ? true
            : String(row.isWorkingDay).toLowerCase() === "true",

        weather: row.weather?.trim() || "Unknown",

        temperature,
      });
    }

    const insertedData = await Dataset.insertMany(documents);

    return res.status(201).json({
      success: true,
      message: "Dataset uploaded successfully.",
      rowsInserted: insertedData.length,
    });
  } catch (error) {
    console.error("Dataset Upload Error:", error);

    return res.status(400).json({
      success: false,
      message: error.message || "Unable to process dataset.",
    });
  } finally {
    if (filePath) {
      fs.unlink(filePath, (unlinkError) => {
        if (unlinkError) {
          console.error("Temporary file cleanup error:", unlinkError);
        }
      });
    }
  }
};
