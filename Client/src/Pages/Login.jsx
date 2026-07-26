import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";

const Login = () => {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState({
    email: "",
    password: "",
  });
  const { email, password } = inputValue;
  const handleOnChange = (e) => {
    const { name, value } = e.target;

    setInputValue((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleError = (err) =>
    toast.error(err, {
      position: "bottom-left",
    });
  const handleSuccess = (msg) =>
    toast.success(msg, {
      position: "bottom-left",
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate Inputs
    if (!email || !password) {
      handleError("Please fill in all the fields.");
      return;
    }

    try {
      const { data } = await axios.post(
        "http://localhost:4000/login",
        {
          email,
          password,
        },
        {
          withCredentials: true,
        },
      );

      const { success, message } = data;

      if (success) {
        handleSuccess(message);

        // Clear form after successful login
        setInputValue({
          email: "",
          password: "",
        });

        setTimeout(() => {
          navigate("/");
        }, 1000);
      }
    } catch (error) {
      console.error(error);

      if (error.response) {
        handleError(error.response.data.message);
      } else if (error.request) {
        handleError("Unable to connect to the server.");
      } else {
        handleError("Something went wrong.");
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-[#020617]">
      {/* ================= LEFT LOGIN SECTION ================= */}

      <div className="w-full lg:w-[38%] bg-[#0F172A] flex items-center justify-center px-8 py-10 border-r border-slate-800">
        <div className="w-full max-w-md">
          {/* Heading */}

          <div className="mb-12">
            <h1 className="text-4xl font-bold text-white">Sign In</h1>

            <p className="text-slate-400 mt-3 leading-7">
              Welcome back. Please sign in to continue.
            </p>
          </div>

          {/* Login Form */}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>

              <input
                type="email"
                name="email"
                value={email}
                placeholder="Enter your email"
                onChange={handleOnChange}
                className="
              w-full
              bg-slate-900
              border
              border-slate-700
              rounded-xl
              px-4
              py-3
              text-white
              placeholder:text-slate-500
              focus:outline-none
              focus:border-emerald-500
              focus:ring-2
              focus:ring-emerald-500/30
              transition-all
              duration-300
              "
              />
            </div>

            {/* Password */}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>

              <input
                type="password"
                name="password"
                value={password}
                placeholder="Enter your password"
                onChange={handleOnChange}
                className="
              w-full
              bg-slate-900
              border
              border-slate-700
              rounded-xl
              px-4
              py-3
              text-white
              placeholder:text-slate-500
              focus:outline-none
              focus:border-emerald-500
              focus:ring-2
              focus:ring-emerald-500/30
              transition-all
              duration-300
              "
              />
            </div>

            {/* Login Button */}

            <button
              type="submit"
              className="
            w-full
            bg-emerald-500
            hover:bg-emerald-600
            text-white
            font-semibold
            py-3
            rounded-xl
            transition-all
            duration-300
            hover:shadow-lg
            hover:shadow-emerald-500/20
            active:scale-[0.98]
            "
            >
              Sign In
            </button>

            {/* Divider */}

            <div className="flex items-center my-2">
              <div className="flex-1 h-px bg-slate-700"></div>

              <span className="px-4 text-slate-500 text-sm">OR</span>

              <div className="flex-1 h-px bg-slate-700"></div>
            </div>

            {/* Signup */}

            <p className="text-center text-slate-400">
              Don't have an account?
              <Link
                to="/signup"
                className="
              ml-2
              text-emerald-400
              hover:text-emerald-300
              font-medium
              transition
              "
              >
                Create Account
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* ================= RIGHT SECTION ================= */}

      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#064E3B]">
        {/* Grid */}

        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px),linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        ></div>

        <div className="absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full bg-emerald-500/10 blur-[130px]"></div>

        <div className="absolute bottom-[-120px] left-[-120px] w-[420px] h-[420px] rounded-full bg-teal-500/10 blur-[110px]"></div>

        <div className="absolute top-[35%] left-[30%] w-[260px] h-[260px] rounded-full bg-emerald-400/5 blur-[90px]"></div>

        {/* Floating Circles */}

        <div className="absolute top-20 left-24 w-4 h-4 rounded-full bg-emerald-400/60"></div>

        <div className="absolute top-44 right-32 w-3 h-3 rounded-full bg-white/60"></div>

        <div className="absolute bottom-32 left-40 w-5 h-5 rounded-full bg-emerald-300/50"></div>

        <div className="absolute bottom-20 right-20 w-2 h-2 rounded-full bg-white"></div>

        <div className="absolute top-[65%] right-[38%] w-3 h-3 rounded-full bg-emerald-400"></div>

        {/* Decorative Lines */}

        <svg
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <path
            d="M-100 140 C250 260 550 0 950 180"
            stroke="rgba(16,185,129,0.18)"
            strokeWidth="2"
            fill="none"
          />

          <path
            d="M-150 360 C220 180 620 470 1000 260"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="2"
            fill="none"
          />

          <path
            d="M120 620 C450 420 760 650 1100 480"
            stroke="rgba(52,211,153,0.12)"
            strokeWidth="2"
            fill="none"
          />
        </svg>

        {/* Glass Shapes */}

        <div className="absolute top-24 right-24 w-36 h-36 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 rotate-12"></div>

        <div className="absolute bottom-24 left-24 w-28 h-28 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 -rotate-12"></div>

        <div className="absolute top-[48%] right-[28%] w-20 h-20 rounded-full border border-emerald-400/20"></div>

        <div className="absolute top-[55%] right-[22%] w-10 h-10 rounded-full border border-white/20"></div>
      </div>

      <ToastContainer />
    </div>
  );
};

export default Login;
