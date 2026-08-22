import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import axios from "axios";
import { ToastContainer } from "react-toastify";

const Home = () => {
  const navigate = useNavigate();
  const [cookies, removeCookie] = useCookies([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      try {
        const { data } = await axios.post(
          "http://localhost:4000",
          {},
          {
            withCredentials: true,
          }
        );

        const { success, username } = data;

        if (!success) {
          navigate("/login");
          return;
        }

        setUsername(username);
      } catch (error) {
        console.error(error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, [navigate]);

  const logout = () => {
    removeCookie("token");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-emerald-400 text-lg animate-pulse">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white flex">

      {/* ================= SIDEBAR ================= */}
      <aside className="hidden lg:flex w-64 min-h-screen bg-[#07101f] border-r border-slate-800 flex-col">

        {/* Logo */}
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

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">

          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/10">
            <span>⌂</span>
            <span>Home</span>
          </button>

          <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800/70 hover:text-white transition">
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

        {/* Plan */}
        <div className="p-4">

          <div className="rounded-2xl bg-[#0b1729] border border-slate-800 p-5">

            <p className="text-sm text-slate-400">
              Current Plan
            </p>

            <p className="text-emerald-400 font-semibold mt-2">
              ML Workspace
            </p>

            <p className="text-xs text-slate-500 mt-2">
              Demand forecasting workspace
            </p>

          </div>

          <button
            onClick={logout}
            className="w-full mt-4 flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition"
          >
            <span>↪</span>
            <span>Logout</span>
          </button>

        </div>
      </aside>

      {/* ================= MAIN ================= */}
      <main className="flex-1 overflow-auto">

        {/* TOP BAR */}
        <header className="h-20 border-b border-slate-800 bg-[#020617]/80 backdrop-blur flex items-center justify-between px-6 lg:px-10">

          <div className="lg:hidden">
            <h1 className="font-bold">
              DemandForecast <span className="text-emerald-400">AI</span>
            </h1>
          </div>

          <div className="hidden lg:block">
            <p className="text-slate-500 text-sm">
              Demand Forecasting Platform
            </p>
          </div>

          <div className="flex items-center gap-5">

            {/* Notification */}
            <button className="relative text-slate-400 hover:text-white transition text-xl">
              ♧
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full"></span>
            </button>

            {/* User */}
            <div className="flex items-center gap-3">

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center font-bold">
                {username?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className="hidden sm:block">
                <p className="font-medium text-sm">
                  {username || "User"}
                </p>

                <p className="text-xs text-slate-500">
                  Administrator
                </p>
              </div>

            </div>

          </div>
        </header>

        {/* CONTENT */}
        <section className="p-6 lg:p-10 max-w-[1600px] mx-auto">

          {/* HERO */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-[#0b1729] to-[#07101f] p-8 lg:p-10">

            <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 blur-3xl rounded-full"></div>

            <div className="relative z-10 max-w-2xl">

              <p className="text-emerald-400 font-medium mb-3">
                DEMAND FORECASTING WORKSPACE
              </p>

              <h2 className="text-3xl lg:text-5xl font-bold leading-tight">
                Welcome back,{" "}
                <span className="text-emerald-400">
                  {username || "User"}
                </span>
                ! 👋
              </h2>

              <p className="text-slate-400 mt-4 text-base lg:text-lg leading-7">
                Monitor your demand predictions, manage datasets,
                and use machine learning to make smarter forecasting
                decisions.
              </p>

              <div className="flex flex-wrap gap-3 mt-7">

                <div className="px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-700 text-sm">
                  🛡️ Role: Administrator
                </div>

                <div className="px-4 py-2 rounded-xl bg-slate-900/70 border border-slate-700 text-sm">
                  🏢 Company Workspace
                </div>

              </div>

            </div>

          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mt-6">

            <div className="bg-[#07101f] border border-slate-800 rounded-2xl p-6">

              <div className="flex justify-between items-start">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-xl">
                  ↗
                </div>

                <span className="text-xs text-emerald-400">
                  +12%
                </span>
              </div>

              <p className="text-slate-400 mt-5">
                Total Predictions
              </p>

              <h3 className="text-3xl font-bold mt-1">
                128
              </h3>

              <p className="text-xs text-slate-500 mt-2">
                From all forecasting sessions
              </p>

            </div>

            <div className="bg-[#07101f] border border-slate-800 rounded-2xl p-6">

              <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400 text-xl">
                ◷
              </div>

              <p className="text-slate-400 mt-5">
                This Month
              </p>

              <h3 className="text-3xl font-bold mt-1">
                24
              </h3>

              <p className="text-xs text-slate-500 mt-2">
                Predictions generated
              </p>

            </div>

            <div className="bg-[#07101f] border border-slate-800 rounded-2xl p-6">

              <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400 text-xl">
                ◈
              </div>

              <p className="text-slate-400 mt-5">
                Models Available
              </p>

              <h3 className="text-3xl font-bold mt-1">
                3
              </h3>

              <p className="text-xs text-slate-500 mt-2">
                ML forecasting models
              </p>

            </div>

            <div className="bg-[#07101f] border border-slate-800 rounded-2xl p-6">

              <div className="w-12 h-12 rounded-xl bg-orange-500/15 flex items-center justify-center text-orange-400 text-xl">
                ◎
              </div>

              <p className="text-slate-400 mt-5">
                Model Accuracy
              </p>

              <h3 className="text-3xl font-bold mt-1">
                --
              </h3>

              <p className="text-xs text-slate-500 mt-2">
                Will appear after model training
              </p>

            </div>

          </div>

          {/* LOWER SECTION */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">

            {/* QUICK ACTIONS */}
            <div className="bg-[#07101f] border border-slate-800 rounded-2xl p-6">

              <div className="flex justify-between items-center mb-5">

                <div>
                  <h3 className="text-xl font-semibold">
                    Quick Actions
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    Start working with your forecasting system
                  </p>
                </div>

              </div>

              <div className="space-y-3">

                <button
                  onClick={() => navigate("/predictions")}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 hover:bg-slate-900 transition"
                >

                  <div className="flex items-center gap-4">

                    <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 text-2xl">
                      +
                    </div>

                    <div className="text-left">
                      <p className="font-medium">
                        New Prediction
                      </p>

                      <p className="text-sm text-slate-500">
                        Run a new demand forecast
                      </p>
                    </div>

                  </div>

                  <span className="text-slate-500 text-xl">
                    →
                  </span>

                </button>

                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-900 transition">

                  <div className="flex items-center gap-4">

                    <div className="w-11 h-11 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
                      ↑
                    </div>

                    <div className="text-left">
                      <p className="font-medium">
                        Upload Data
                      </p>

                      <p className="text-sm text-slate-500">
                        Upload your sales dataset
                      </p>
                    </div>

                  </div>

                  <span className="text-slate-500 text-xl">
                    →
                  </span>

                </button>

                <button className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/40 hover:bg-slate-900 transition">

                  <div className="flex items-center gap-4">

                    <div className="w-11 h-11 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                      ◷
                    </div>

                    <div className="text-left">
                      <p className="font-medium">
                        Prediction History
                      </p>

                      <p className="text-sm text-slate-500">
                        View previous forecasts
                      </p>
                    </div>

                  </div>

                  <span className="text-slate-500 text-xl">
                    →
                  </span>

                </button>

              </div>

            </div>

            {/* RECENT ACTIVITY */}
            <div className="bg-[#07101f] border border-slate-800 rounded-2xl p-6">

              <div className="flex justify-between items-center mb-5">

                <div>
                  <h3 className="text-xl font-semibold">
                    Recent Activity
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    Latest activity in your workspace
                  </p>
                </div>

                <button className="text-emerald-400 text-sm hover:text-emerald-300">
                  View All
                </button>

              </div>

              <div className="space-y-1">

                <div className="flex items-center gap-4 p-4 border-b border-slate-800">

                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    ↗
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Demand prediction
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Awaiting your first prediction
                    </p>
                  </div>

                  <span className="text-xs text-slate-500">
                    —
                  </span>

                </div>

                <div className="flex items-center gap-4 p-4 border-b border-slate-800">

                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
                    ↑
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      Dataset management
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      No datasets uploaded yet
                    </p>
                  </div>

                  <span className="text-xs text-slate-500">
                    —
                  </span>

                </div>

                <div className="flex items-center gap-4 p-4">

                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                    ◈
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      ML model
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Model training will appear here
                    </p>
                  </div>

                  <span className="text-xs text-slate-500">
                    —
                  </span>

                </div>

              </div>

            </div>

          </div>

        </section>

      </main>

      <ToastContainer />
    </div>
  );
};

export default Home;
