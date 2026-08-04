import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, useParams } from "react-router-dom";
import "./index.css";
import Landing from "./pages/Landing";
import Pulse from "./pages/Pulse";
import Prism from "./pages/Prism";
import Garden from "./pages/Garden";
import GardenGame from "./pages/GardenGame";
import OrbGame from "./pages/OrbGame";
import OrbScenario from "./pages/OrbScenario";
import OrbFree from "./pages/OrbFree";
import OnePager from "./pages/OnePager";
import OrbSelect from "./pages/OrbSelect";
import Archive from "./pages/Archive";

// remount the scenario page whenever the scenario id changes, so the sim
// engine never carries one era's state into another
function ScenarioRoute() {
  const { id } = useParams();
  return <OrbScenario key={id ?? "era"} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/pulse" element={<Pulse />} />
        <Route path="/prism" element={<Prism />} />
        <Route path="/garden" element={<GardenGame />} />
        <Route path="/garden-old" element={<Garden />} />
        <Route path="/orb" element={<OrbSelect />} />
        <Route path="/orb/tutorial" element={<OrbGame />} />
        <Route path="/orb/era" element={<ScenarioRoute />} />
        <Route path="/orb/s/:id" element={<ScenarioRoute />} />
        <Route path="/orb/free" element={<OrbFree />} />
        <Route path="/objectives" element={<OnePager />} />
        <Route path="/archive" element={<Archive />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
