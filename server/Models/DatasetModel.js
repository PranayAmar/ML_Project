const mongoose = require("mongoose");

const datasetSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },

    product: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    storeId: {
      type: String,
      required: true,
      trim: true,
    },

    quantitySold: {
      type: Number,
      required: true,
      min: 0,
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    promotionActive: {
      type: Boolean,
      default: false,
    },

    stockAvailable: {
      type: Number,
      required: true,
      min: 0,
    },

    stockout: {
      type: Boolean,
      default: false,
    },

    isHoliday: {
      type: Boolean,
      default: false,
    },

    holidayName: {
      type: String,
      default: "",
      trim: true,
    },

    festival: {
      type: String,
      default: "None",
      trim: true,
    },

    isWorkingDay: {
      type: Boolean,
      default: true,
    },

    weather: {
      type: String,
      default: "Unknown",
      trim: true,
    },

    temperature: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Dataset", datasetSchema);
