import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { Login, Signup, Home } from "./Pages";
//import "./App.css";

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </div>
  );
}

export default App;
