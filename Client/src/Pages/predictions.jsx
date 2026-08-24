import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const Predictions = () => {
  const navigate = useNavigate();

  const [product, setProduct] = useState("");
  const [forecastDays, setForecastDays] = useState("7");
  const [dataset, setDataset] = useState("");

const handlePrediction = async (e) => {
  e.preventDefault();

  try {
    const { data } = await axios.post(
      "https://ml-project-d6va.onrender.com/predict",
      {
        product,
        dataset,
        forecastDays,
      },
      {
        withCredentials: true,
      }
    );

    console.log("Prediction Response:", data);
  } catch (error) {
    console.error("Prediction Error:", error);
  }
};

    console.log("Prediction Response:", data);
  } catch (error) {
    console.error("Prediction Error:", error);
  }
};
    console.log("Prediction Response:", data);

  } catch (error) {
    console.error("Prediction Error:", error);
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
              <h1 className="font-bold text-lg">
                DemandForecast
              </h1>
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
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/10"
          >
            <span>⌁</span>
            <span>Predictions</span>
          </button>

          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/70 hover:text-white transition">
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

        {/* TOP BAR */}
        <header className="h-20 border-b border-slate-800 bg-[#020617]/80 backdrop-blur flex items-center justify-between px-6 lg:px-10">

          <div>
            <p className="text-slate-500 text-sm">
              Machine Learning Workspace
            </p>

            <h1 className="text-lg font-semibold">
              Demand Predictions
            </h1>
          </div>

          <button
            onClick={() => navigate("/")}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Dashboard
          </button>

        </header>

        {/* CONTENT */}
        <section className="p-6 lg:p-10 max-w-[1400px] mx-auto">

          {/* TITLE */}
          <div className="mb-8">

            <p className="text-emerald-400 font-medium text-sm mb-2">
              AI FORECASTING
            </p>

            <h2 className="text-3xl lg:text-4xl font-bold">
              Create a Demand Forecast
            </h2>

            <p className="text-slate-400 mt-3 max-w-2xl">
              Select your product, dataset, and forecasting period.
              The trained machine learning model will generate the
              expected future demand.
            </p>

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

            {/* FORM */}
            <div className="xl:col-span-2 bg-[#07101f] border border-slate-800 rounded-3xl p-7">

              <div className="flex items-center gap-4 mb-7">

                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xl">
                  ↗
                </div>

                <div>
                  <h3 className="text-xl font-semibold">
                    Forecast Settings
                  </h3>

                  <p className="text-sm text-slate-500">
                    Configure your prediction
                  </p>
                </div>

              </div>

              <form onSubmit={handlePrediction} className="space-y-6">

                {/* PRODUCT */}
                <div>

                  <label className="block text-sm font-medium mb-2">
                    Product
                  </label>

                  <select
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-emerald-500 transition"
                    required
                  >

                    <option value="">
                      Select a product
                    </option>

                    <option value="Tomato">
                      Tomato
                    </option>

                    <option value="Potato">
                      Potato
                    </option>

                    <option value="Milk">
                      Milk
                    </option>

                    <option value="Rice">
                      Rice
                    </option>

                  </select>

                </div>

                {/* DATASET */}
                <div>

                  <label className="block text-sm font-medium mb-2">
                    Dataset
                  </label>

                  <select
                    value={dataset}
                    onChange={(e) => setDataset(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-emerald-500 transition"
                    required
                  >

                    <option value="">
                      Select a dataset
                    </option>

                    <option value="sales-history">
                      Sales History
                    </option>

                    <option value="uploaded-dataset">
                      Uploaded Dataset
                    </option>

                  </select>

                </div>

                {/* FORECAST PERIOD */}
                <div>

                  <label className="block text-sm font-medium mb-2">
                    Forecast Period
                  </label>

                  <select
                    value={forecastDays}
                    onChange={(e) => setForecastDays(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-700 rounded-xl px-4 py-3 text-slate-300 outline-none focus:border-emerald-500 transition"
                  >

                    <option value="7">
                      Next 7 Days
                    </option>

                    <option value="14">
                      Next 14 Days
                    </option>

                    <option value="30">
                      Next 30 Days
                    </option>

                  </select>

                </div>

                {/* BUTTON */}
                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-3.5 rounded-xl transition"
                >
                  Predict Demand →
                </button>

              </form>

            </div>

            {/* RESULT */}
            <div className="xl:col-span-3 bg-[#07101f] border border-slate-800 rounded-3xl p-7">

              <div className="flex items-center justify-between mb-7">

                <div>

                  <h3 className="text-xl font-semibold">
                    Prediction Result
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    Your ML forecast will appear here
                  </p>

                </div>

                <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-500">
                  MODEL: NOT TRAINED
                </div>

              </div>

              {/* PLACEHOLDER RESULT */}
              <div className="min-h-[390px] rounded-2xl bg-[#020617] border border-slate-800 flex flex-col items-center justify-center text-center px-6">

                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-3xl mb-5">
                  ◈
                </div>

                <h4 className="text-xl font-semibold">
                  Ready for Prediction
                </h4>

                <p className="text-slate-500 max-w-md mt-3 leading-6">
                  Configure your forecast settings and click
                  <span className="text-emerald-400">
                    {" "}Predict Demand
                  </span>.
                  The real machine learning model will be connected
                  here next.
                </p>

              </div>

            </div>

          </div>

          {/* HOW IT WORKS */}
          <div className="mt-6 bg-[#07101f] border border-slate-800 rounded-3xl p-7">

            <h3 className="text-xl font-semibold">
              How Demand Forecasting Works
            </h3>

            <p className="text-slate-500 text-sm mt-1">
              The prediction pipeline we will implement
            </p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-emerald-400 text-xl">
                  01
                </span>

                <h4 className="font-semibold mt-3">
                  Historical Data
                </h4>

                <p className="text-sm text-slate-500 mt-2">
                  Sales and demand history is provided to the system.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-emerald-400 text-xl">
                  02
                </span>

                <h4 className="font-semibold mt-3">
                  Data Processing
                </h4>

                <p className="text-sm text-slate-500 mt-2">
                  Data is cleaned and converted into ML features.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-emerald-400 text-xl">
                  03
                </span>

                <h4 className="font-semibold mt-3">
                  ML Model
                </h4>

                <p className="text-sm text-slate-500 mt-2">
                  The trained forecasting model processes the data.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-emerald-400 text-xl">
                  04
                </span>

                <h4 className="font-semibold mt-3">
                  Prediction
                </h4>

                <p className="text-sm text-slate-500 mt-2">
                  Future demand is generated and visualized.
                </p>
              </div>

            </div>

          </div>

        </section>

      </main>

    </div>
  );
};

export default Predictions;
