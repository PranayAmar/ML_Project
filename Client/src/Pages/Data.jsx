import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://ml-project-d6va.onrender.com";

const requiredColumns = [
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

function Data() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];

    setMessage("");
    setError("");

    if (!selectedFile) {
      setFile(null);
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith(".csv")) {
      setFile(null);
      setError("Only CSV files are allowed.");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setError("File size must be less than or equal to 10 MB.");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please choose a CSV dataset first.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");
      setError("");

      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${API_BASE}/datasets/upload`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const data = response.data;

      if (data.success) {
        setMessage(
          data.message ||
            `${data.insertedCount || 0} rows inserted successfully.`
        );
        setFile(null);

        const fileInput = document.getElementById("dataset-file");
        if (fileInput) {
          fileInput.value = "";
        }
      } else {
        setError(data.message || "Dataset upload failed.");
      }
    } catch (err) {
      console.error("Dataset Upload Error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to upload dataset. Please check your login and backend."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCleanup = async () => {
    const confirmed = window.confirm(
      "This will remove duplicate records from your dataset. Continue?"
    );

    if (!confirmed) return;

    try {
      setCleaning(true);
      setMessage("");
      setError("");

      const response = await axios.post(
        `${API_BASE}/datasets/cleanup-duplicates`,
        {},
        {
          withCredentials: true,
        }
      );

      const data = response.data;

      if (data.success) {
        setMessage(
          `${data.message} Deleted: ${data.deletedRecords} records. Remaining: ${data.remainingRecords} records.`
        );
      } else {
        setError(
          data.message || "Unable to clean duplicate dataset records."
        );
      }
    } catch (err) {
      console.error("Dataset Cleanup Error:", err);

      setError(
        err.response?.data?.message ||
          "Unable to clean duplicate records. Please make sure the backend cleanup route is deployed."
      );
    } finally {
      setCleaning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b18] text-white flex">
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-[255px] shrink-0 border-r border-white/10 bg-[#07101f] flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <h1 className="text-xl font-bold text-white">DemandForecast AI</h1>
          <p className="text-xs text-slate-500 mt-1">
            Demand intelligence platform
          </p>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            <span>⌂</span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => navigate("/predictions")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            <span>⌁</span>
            <span>Predictions</span>
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400"
          >
            <span>▤</span>
            <span>Data</span>
          </button>

          <button
            onClick={() => navigate("/models")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            <span>◇</span>
            <span>Models</span>
          </button>

          <button
            onClick={() => navigate("/reports")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            <span>▧</span>
            <span>Reports</span>
          </button>

          <div className="border-t border-white/10 my-4"></div>

          <button
            onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            <span>♙</span>
            <span>Profile</span>
          </button>

          <button
            onClick={() => navigate("/settings")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/5 hover:text-white transition"
          >
            <span>⚙</span>
            <span>Settings</span>
          </button>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-7 lg:px-10 py-8">
          {/* HEADER */}
          <div className="mb-8">
            <p className="text-sm text-emerald-400 font-medium mb-2">
              DATA MANAGEMENT
            </p>

            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              Dataset Management
            </h2>

            <p className="text-slate-400 mt-3 max-w-3xl leading-6">
              Upload your historical sales dataset for demand forecasting.
              The system will validate and process the data before it is used
              for machine learning.
            </p>
          </div>

          {/* MOBILE NAV */}
          <div className="md:hidden mb-6 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              <button
                onClick={() => navigate("/")}
                className="px-4 py-2 rounded-lg bg-white/5 text-slate-300"
              >
                Dashboard
              </button>

              <button
                onClick={() => navigate("/predictions")}
                className="px-4 py-2 rounded-lg bg-white/5 text-slate-300"
              >
                Predictions
              </button>

              <button
                className="px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400"
              >
                Data
              </button>

              <button
                onClick={() => navigate("/models")}
                className="px-4 py-2 rounded-lg bg-white/5 text-slate-300"
              >
                Models
              </button>

              <button
                onClick={() => navigate("/reports")}
                className="px-4 py-2 rounded-lg bg-white/5 text-slate-300"
              >
                Reports
              </button>
            </div>
          </div>

          {/* DATASET QUALITY - ALWAYS VISIBLE */}
<section className="mb-6 rounded-2xl border border-orange-500/30 bg-orange-500/5 p-5 sm:p-6">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
    <div className="flex items-start gap-4">
      <div className="w-11 h-11 shrink-0 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 text-xl">
        ⚠
      </div>

      <div>
          <h3 className="text-lg font-semibold text-white">
          DATASET QUALITY CHECK TEST
          </h3>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Remove duplicate records before model training to keep historical
          demand data clean and prevent repeated observations.
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={handleCleanup}
      disabled={cleaning}
      className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-xl border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
    >
      {cleaning ? "Cleaning..." : "Clean Duplicate Records"}
    </button>
  </div>
</section>

{/* GRID */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_0.9fr] gap-6">
            {/* UPLOAD CARD */}
            <section className="rounded-2xl border border-white/10 bg-[#07101f] p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-7">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl">
                  ↑
                </div>

                <div>
                  <h3 className="text-xl font-semibold">Dataset Upload</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    CSV files only • Maximum 10 MB
                  </p>
                </div>
              </div>

              <label
                htmlFor="dataset-file"
                className="block cursor-pointer border-2 border-dashed border-slate-700 hover:border-emerald-500/40 rounded-2xl p-8 sm:p-12 text-center transition"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-white/10 flex items-center justify-center text-emerald-400 text-3xl">
                  ↑
                </div>

                <h4 className="text-lg font-semibold mt-6">
                  Choose a CSV dataset
                </h4>

                <p className="text-sm text-slate-500 mt-2">
                  Click here to browse files
                </p>

                <input
                  id="dataset-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {file && (
                <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/50 p-4">
                  <p className="text-sm text-slate-300">Selected file</p>
                  <p className="text-sm text-emerald-400 mt-1 break-all">
                    {file.name}
                  </p>
                </div>
              )}

              {/* MESSAGE */}
              {message && (
                <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-400">
                  {message}
                </div>
              )}

              {/* ERROR */}
              {error && (
                <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-4 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* UPLOAD BUTTON */}
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full mt-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading Dataset..." : "Upload Dataset →"}
              </button>

              {/* DATASET QUALITY */}
              <div className="mt-8 rounded-2xl border border-orange-500/20 bg-orange-500/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 shrink-0 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                    ⚠
                  </div>

                  <div>
                    <h4 className="font-semibold text-white">
                      Dataset Quality
                    </h4>

                    <p className="text-sm text-slate-400 mt-1 leading-6">
                      Remove duplicate records before training the forecasting
                      model. This prevents repeated historical observations
                      from affecting model evaluation.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCleanup}
                  disabled={cleaning}
                  className="w-full mt-5 border border-orange-500/30 text-orange-400 hover:bg-orange-500/10 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl transition"
                >
                  {cleaning
                    ? "Cleaning Dataset..."
                    : "Clean Duplicate Records"}
                </button>
              </div>
            </section>

            {/* REQUIRED COLUMNS */}
            <section className="rounded-2xl border border-white/10 bg-[#07101f] p-6 sm:p-8">
              <h3 className="text-xl font-semibold">Required CSV Columns</h3>

              <p className="text-sm text-slate-500 mt-3 leading-6">
                Your CSV should contain these columns for the forecasting
                pipeline.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
                {requiredColumns.map((column) => (
                  <div
                    key={column}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3"
                  >
                    <span className="text-emerald-400">✓</span>
                    <span className="text-sm text-slate-300 break-all">
                      {column}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* PIPELINE INFO */}
          <section className="mt-6 rounded-2xl border border-white/10 bg-[#07101f] p-6 sm:p-8">
            <h3 className="text-xl font-semibold">Forecasting Data Pipeline</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="rounded-xl border border-white/10 bg-slate-900/30 p-5">
                <div className="text-emerald-400 text-lg">01</div>
                <h4 className="font-semibold mt-3">Upload</h4>
                <p className="text-sm text-slate-500 mt-2">
                  Upload historical sales data in CSV format.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/30 p-5">
                <div className="text-emerald-400 text-lg">02</div>
                <h4 className="font-semibold mt-3">Validate</h4>
                <p className="text-sm text-slate-500 mt-2">
                  Validate columns, dates, quantities and business factors.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/30 p-5">
                <div className="text-emerald-400 text-lg">03</div>
                <h4 className="font-semibold mt-3">Process</h4>
                <p className="text-sm text-slate-500 mt-2">
                  Generate historical and time-series forecasting features.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/30 p-5">
                <div className="text-emerald-400 text-lg">04</div>
                <h4 className="font-semibold mt-3">Predict</h4>
                <p className="text-sm text-slate-500 mt-2">
                  Use processed data for model training and forecasting.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default Data;
