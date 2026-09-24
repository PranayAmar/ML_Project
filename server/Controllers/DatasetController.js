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

/*
==========================================================
UPLOAD DATASET
==========================================================
*/

module.exports.uploadDataset = async (req, res) => {
  let filePath = null;
  let session = null;

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
    const seenKeys = new Set();
    let duplicateRowsSkipped = 0;

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

      parsedDate.setUTCHours(0, 0, 0, 0);

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

      const product = row.product.trim();
      const category = row.category.trim();
      const storeId = row.storeId.trim();

      /*
        One valid observation per:
        date + product + store
      */

      const duplicateKey = [
        parsedDate.getTime(),
        product.toLowerCase(),
        storeId.toLowerCase(),
      ].join("|");

      if (seenKeys.has(duplicateKey)) {
        duplicateRowsSkipped++;
        continue;
      }

      seenKeys.add(duplicateKey);

      documents.push({
        companyId: req.user.userId,
        uploadedBy: req.user.userId,

        date: parsedDate,
        product,
        category,
        storeId,

        quantitySold,
        unitPrice,
        discountPercent,

        promotionActive:
          String(row.promotionActive).toLowerCase() === "true",

        stockAvailable,

        stockout:
          String(row.stockout).toLowerCase() === "true",

        isHoliday:
          String(row.isHoliday).toLowerCase() === "true",

        holidayName:
          row.holidayName?.trim() || "",

        festival:
          row.festival?.trim() || "None",

        isWorkingDay:
          row.isWorkingDay === ""
            ? true
            : String(row.isWorkingDay).toLowerCase() === "true",

        weather:
          row.weather?.trim() || "Unknown",

        temperature,
      });
    }

    if (documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid unique records were found in the CSV.",
      });
    }

    /*
      Replace old dataset only after validation succeeds.

      Transaction:
      old data is deleted + new data inserted atomically.
    */

    session = await Dataset.startSession();
    session.startTransaction();

    await Dataset.deleteMany(
      {
        companyId: req.user.userId,
      },
      {
        session,
      }
    );

    const insertedData = await Dataset.insertMany(
      documents,
      {
        session,
        ordered: true,
      }
    );

    await session.commitTransaction();

    return res.status(201).json({
      success: true,
      message:
        "Dataset uploaded successfully. Previous dataset replaced.",

      rowsReceived: rows.length,
      duplicateRowsSkipped,

      rowsInserted: insertedData.length,
      insertedCount: insertedData.length,
    });
  } catch (error) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error(
          "Dataset Transaction Abort Error:",
          abortError
        );
      }
    }

    console.error("Dataset Upload Error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.message || "Unable to process dataset.",
    });
  } finally {
    if (session) {
      await session.endSession();
    }

    if (filePath) {
      fs.unlink(filePath, (unlinkError) => {
        if (unlinkError) {
          console.error(
            "Temporary file cleanup error:",
            unlinkError
          );
        }
      });
    }
  }
};
/*
==========================================================
GET DATASET FOR ML SERVICE
==========================================================
*/
module.exports.getMLDataset = async (req, res) => {
  try {
    const companyId = req.query.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId is required.",
      });
    }

    const mongoose = require("mongoose");

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid companyId.",
      });
    }

    const page = Math.max(
      Number.parseInt(req.query.page || "1", 10),
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit || "5000", 10),
        1
      ),
      5000
    );

    const skip = (page - 1) * limit;

    const filter = {
      companyId: new mongoose.Types.ObjectId(companyId),
    };

    const [documents, total] = await Promise.all([
      Dataset.find(filter)
        .select("-_id -createdAt -updatedAt -companyId -uploadedBy")
        .sort({
          date: 1,
          product: 1,
          storeId: 1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Dataset.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      total,
      hasMore: skip + documents.length < total,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    console.error("ML Dataset Fetch Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch dataset for ML service.",
    });
  }
};
/*
==========================================================
CLEAN DUPLICATE DATASET RECORDS
==========================================================
*/

module.exports.cleanupDuplicateDatasets = async (req, res) => {
  try {
    const companyId = req.user.userId;

    /*
      Duplicate definition:

      Same:
      - company
      - date
      - product
      - store

      We keep the oldest record and delete the rest.
    */

    const duplicateGroups = await Dataset.aggregate([
      {
        $match: {
          companyId,
        },
      },

      {
        $sort: {
          createdAt: 1,
          _id: 1,
        },
      },

      {
        $group: {
          _id: {
            date: "$date",
            product: "$product",
            storeId: "$storeId",
          },

          ids: {
            $push: "$_id",
          },

          count: {
            $sum: 1,
          },
        },
      },

      {
        $match: {
          count: {
            $gt: 1,
          },
        },
      },
    ]);

    /*
      Collect all duplicate IDs.
      For every group:
      first ID = keep
      remaining IDs = delete
    */

    const idsToDelete = [];

    for (const group of duplicateGroups) {
      idsToDelete.push(...group.ids.slice(1));
    }

    let deletedCount = 0;

    if (idsToDelete.length > 0) {
      const deleteResult = await Dataset.deleteMany({
        companyId,
        _id: {
          $in: idsToDelete,
        },
      });

      deletedCount = deleteResult.deletedCount || 0;
    }

    const remainingRecords =
      await Dataset.countDocuments({ companyId });

    return res.status(200).json({
      success: true,
      message:
        deletedCount > 0
          ? "Duplicate dataset records cleaned successfully."
          : "No duplicate dataset records found.",

      duplicateGroups: duplicateGroups.length,

      duplicateRecordsDetected: idsToDelete.length,

      deletedRecords: deletedCount,

      remainingRecords,
    });
  } catch (error) {
    console.error(
      "Dataset Cleanup Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to clean duplicate dataset records.",
    });
  }
};
module.exports.getDatasetSummary = async (req, res) => {
  try {
    const companyId = req.user.userId;

    const [count, products, stores, dateStats] = await Promise.all([
      Dataset.countDocuments({ companyId }),

      Dataset.distinct("product", { companyId }),

      Dataset.distinct("storeId", { companyId }),

      Dataset.aggregate([
        {
          $match: { companyId },
        },
        {
          $group: {
            _id: null,
            start: { $min: "$date" },
            end: { $max: "$date" },
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,
      records: count,
      products: products.sort(),
      stores: stores.sort(),
      dateRange: {
        start: dateStats[0]?.start || null,
        end: dateStats[0]?.end || null,
      },
    });
  } catch (error) {
    console.error("Dataset Summary Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch dataset summary.",
    });
  }
};
