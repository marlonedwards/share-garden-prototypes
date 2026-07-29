import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Landing from "./pages/Landing";
import Pulse from "./pages/Pulse";
import Flows from "./pages/Flows";
import Garden from "./pages/Garden";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pulse" element={<Pulse />} />
        <Route path="/flows" element={<Flows />} />
        <Route path="/garden" element={<Garden />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
