import React from "react";
import { createRoot } from "react-dom/client";
import ClawValley from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ClawValley />
  </React.StrictMode>
);
