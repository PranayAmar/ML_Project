import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCookies } from "react-cookie";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const Home = () => {
  const navigate = useNavigate();
  const [cookies, removeCookie] = useCookies([]);
  const [username, setUsername] = useState("");
  useEffect(() => {
    const verifyUser = async () => {
      try {
        const { data } = await axios.post(
          "http://localhost:4000",
          {},
          {
            withCredentials: true,
          },
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
      }
    };

    verifyUser();
  }, [navigate]);
  const Logout = () => {
    removeCookie("token");
    navigate("/login");
  };
  return (
    <>
      <div className="min-h-screen bg-[#020617] flex items-center justify-center px-6">
        <div className="w-full max-w-3xl bg-[#0F172A] border border-slate-800 rounded-3xl shadow-2xl p-10">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Welcome back,</h1>

              <p className="text-emerald-400 text-xl mt-1">{username}</p>
            </div>

            <button
              onClick={Logout}
              className="px-5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-red-500 hover:text-white transition"
            >
              Log Out
            </button>
          </div>

          {/* Divider */}

          <div className="h-px bg-slate-800 my-10"></div>

          {/* Main Content */}

          <div className="text-center">
            <h2 className="text-4xl font-bold text-white">
              Ready to make predictions?
            </h2>

            <p className="text-slate-400 mt-4 max-w-xl mx-auto leading-7">
              Upload your dataset and begin exploring machine learning
              predictions through a simple and intuitive workflow.
            </p>

            <button className="mt-10 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold transition">
              Get Started
            </button>
          </div>
        </div>
      </div>

      <ToastContainer />
    </>
  );
};

export default Home;
