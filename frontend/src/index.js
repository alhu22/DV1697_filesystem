import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import "./index.css";

import App from "./App";
import Login from "./Login";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<App />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  </React.StrictMode>
);