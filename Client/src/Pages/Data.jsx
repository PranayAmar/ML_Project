import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Data = () => {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
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
      setError("File size must be 10 MB or less.");
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const { data } = await axios.post(
        "https://ml-project-d6va.onrender.com/datasets/upload",
        formData,
        {
          withCredentials: true,
        }
      );

      if (data.success) {
        setMessage(
          `${data.message} ${data.rowsInserted} rows inserted successfully.`
        );
        setFile(null);
        e.target.reset();
      } else {
        setError(data.message || "Upload failed.");
      }
    } catch (err) {
      console.error("Dataset Upload Error:", err);

      if (err.response) {
        setError(
          err.response.data?.message || "Unable to upload dataset."
        );
      } else if (err.request) {
        setError("Unable to connect to the server.");
      } else {
        setError("Something went wrong while uploading the dataset.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex">
      {/* SIDEBAR */}
      <aside className="hidden lg:flex w-64 min-h-screen bg-[#07101f] border-r border-slate-800 flex-col">
        <div className="h-20 px-6 flex items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-emerald-400 text-xl">↗</span>
            </div>

            <div>
              <h1 className="font-bold text-lg">DemandForecast</h1>
              <span className="text-emerald-400 text-sm font-semibold">
                AI
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/70 hover:text-white transition"
          >
            <span>⌂</span>
            <span>Home</span>
          </button>

          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/70 hover:text-white transition"
          >
            <span>▦</span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => navigate("/predictions")}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/70 hover:text-white transition"
          >
            <span>⌁</span>
            <span>Predictions</span>
          </button>

          <button
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/10"
          >
            <span>▤</span>
            <span>Data</span>
          </button>

          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/70 hover:text-white transition">
            <span>◈</span>
            <span>Models</span>
          </button>

          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/70 hover:text-white transition">
            <span>▧</span>
            <span>Reports</span>
          </button>

          <div className="pt-5 border-t border-slate-800 mt-5">
            <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/70 hover:text-white transition">
              <span>♙</span>
              <span>Profile</span>
            </button>

            <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/70 hover:text-white transition">
              <span>⚙</span>
              <span>Settings</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-auto">
        <header className="h-20 border-b border-slate-800 bg-[#020617]/80 backdrop-blur flex items-center justify-between px-6 lg:px-10">
          <div>
            <p className="text-slate-500 text-sm">
              Machine Learning Workspace
            </p>

            <h1 className="text-lg font-semibold">Dataset Management</h1>
          </div>

          <button
            onClick={() => navigate("/")}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Dashboard
          </button>
        </header>

        <section className="p-6 lg:p-10 max-w-[1400px] mx-auto">
          {/* TITLE */}
          <div className="mb-8">
            <p className="text-emerald-400 font-medium text-sm mb-2">
              DATA MANAGEMENT
            </p>

            <h2 className="text-3xl lg:text-4xl font-bold">
              Upload Historical Data
            </h2>

            <p className="text-slate-400 mt-3 max-w-3xl leading-7">
              Upload your historical sales dataset. The forecasting system
              will validate and process the data before it is used for
              machine learning.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* UPLOAD CARD */}
            <div className="xl:col-span-3 bg-[#07101f] border border-slate-800 rounded-3xl p-7">
              <div className="flex items-center gap-4 mb-7">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl">
                  ↑
                </div>

                <div>
                  <h3 className="text-xl font-semibold">
                    Dataset Upload
                  </h3>

                  <p className="text-sm text-slate-500">
                    CSV files only • Maximum 10 MB
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpload}>
                <label
                  htmlFor="dataset-file"
                  className="block border-2 border-dashed border-slate-700 hover:border-emerald-500/50 rounded-2xl p-10 text-center cursor-pointer transition"
                >
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400 text-3xl mb-5">
                    ↑
                  </div>

                  <h4 className="text-lg font-semibold">
                    Choose a CSV dataset
                  </h4>

                  <p className="text-slate-500 text-sm mt-2">
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

                {/* SELECTED FILE */}
                {file && (
                  <div className="mt-5 p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>

                    <span className="text-emerald-400 text-sm">
                      Ready
                    </span>
                  </div>
                )}

                {/* ERROR */}
                {error && (
                  <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                {/* SUCCESS */}
                {message && (
                  <div className="mt-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-slate-950 font-semibold py-3.5 rounded-xl transition"
                >
                  {uploading ? "Uploading..." : "Upload Dataset →"}
                </button>
              </form>
            </div>

            {/* REQUIREMENTS */}
            <div className="xl:col-span-2 bg-[#07101f] border border-slate-800 rounded-3xl p-7">
              <h3 className="text-xl font-semibold">
                Required CSV Columns
              </h3>

              <p className="text-sm text-slate-500 mt-2 leading-6">
                Your CSV should contain these columns for the forecasting
                pipeline.
              </p>

              <div className="mt-6 space-y-2">
                {[
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
                ].map((column) => (
                  <div
                    key={column}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800"
                  >
                    <span className="text-emerald-400">✓</span>
                    <code className="text-sm text-slate-300">
                      {column}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* PIPELINE INFO */}
          <div className="mt-6 bg-[#07101f] border border-slate-800 rounded-3xl p-7">
            <h3 className="text-xl font-semibold">
              What happens after upload?
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-emerald-400 text-xl">01</span>
                <h4 className="font-semibold mt-3">Validation</h4>
                <p className="text-sm text-slate-500 mt-2">
                  Required columns and values are checked.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-emerald-400 text-xl">02</span>
                <h4 className="font-semibold mt-3">Processing</h4>
                <p className="text-sm text-slate-500 mt-2">
                  Valid records are converted into structured data.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-emerald-400 text-xl">03</span>
                <h4 className="font-semibold mt-3">Storage</h4>
                <p className="text-sm text-slate-500 mt-2">
                  Dataset records are stored securely in MongoDB.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-emerald-400 text-xl">04</span>
                <h4 className="font-semibold mt-3">ML Ready</h4>
                <p className="text-sm text-slate-500 mt-2">
                  Data becomes available for model training.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Data;
