import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Navigate, Routes, Route, useParams } from "react-router-dom";
import "./index.css";
import Landing from "./pages/Landing";
import Pulse from "./pages/Pulse";
import Prism from "./pages/Prism";
import Garden from "./pages/Garden";
import GardenGame from "./pages/GardenGame";
import OrbGame from "./pages/OrbGame";
import OrbScenario from "./pages/OrbScenario";
import OrbFree from "./pages/OrbFree";
import FieldGuidePage from "./pages/FieldGuidePage";
import LessonPage from "./pages/LessonPage";
import Onboarding from "./pages/Onboarding";
import OnePager from "./pages/OnePager";
import OrbSelect from "./pages/OrbSelect";
import EraBriefing from "./pages/EraBriefing";
import ReadyMode from "./pages/ReadyMode";
import Archive from "./pages/Archive";
import Tally from "./pages/Tally";
import GuessTheStock from "./pages/GuessTheStock";
import Takeover from "./pages/Takeover";
import WorthMore from "./pages/WorthMore";
import Trigger from "./pages/Trigger";
import Floor from "./pages/Floor";
import Monkey from "./pages/Monkey";

// remount the scenario page whenever the scenario id changes, so the sim
// engine never carries one era's state into another
function ScenarioRoute() {
  const { id } = useParams();
  return <OrbScenario key={id ?? "era"} />;
}

// The Stack: the same lesson flow on the goal-band stage, with a toggle
// between the cylinder and the countable blocks
function StackRoute() {
  const { id } = useParams();
  return <OrbScenario key={`stack-${id ?? "gfc"}`} variant="stack" />;
}

// remount the lesson page whenever the lesson id changes, so step state never
// carries from one lesson into another
function LessonRoute() {
  const { id } = useParams();
  return <LessonPage key={id ?? "lesson"} />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        {/* Guess the Stock: one puzzle at a time, and ?p=<id> pins a specific one */}
        <Route path="/guess" element={<GuessTheStock />} />
        <Route path="/takeover" element={<Takeover />} />
        <Route path="/worth" element={<WorthMore />} />
        <Route path="/trigger" element={<Trigger />} />
        <Route path="/floor" element={<Floor />} />
        <Route path="/monkey" element={<Monkey />} />
        <Route path="/pulse" element={<Pulse />} />
        <Route path="/prism" element={<Prism />} />
        <Route path="/garden" element={<GardenGame />} />
        <Route path="/garden-old" element={<Garden />} />
        <Route path="/orb" element={<OrbSelect />} />
        <Route path="/orb/tutorial" element={<OrbGame />} />
        <Route path="/orb/era" element={<ScenarioRoute />} />
        <Route path="/orb/s/:id" element={<ScenarioRoute />} />
        <Route path="/orb/brief/:id" element={<EraBriefing />} />
        <Route path="/orb/free" element={<OrbFree />} />
        <Route path="/orb/guide" element={<FieldGuidePage />} />
        <Route path="/orb/intro" element={<Onboarding />} />
        <Route path="/stack/s/:id" element={<StackRoute />} />
        <Route path="/stack" element={<Navigate to="/stack/s/gfc" replace />} />
        {/* The Tally runs a whole ladder of chapters, so it takes no era in
            its path. Links to the retired era prototype land on the game. */}
        <Route path="/tally" element={<Tally />} />
        <Route path="/tally/s/:id" element={<Navigate to="/tally" replace />} />
        <Route path="/orb/learn/:id" element={<LessonRoute />} />
        <Route path="/orb/mini/:id" element={<LessonRoute />} />
        {/* the finale: one door, two paths, one mirror */}
        <Route path="/orb/ready" element={<ReadyMode />} />
        {/* id-less lesson paths land on the first rung of the ladder */}
        <Route path="/orb/learn" element={<Navigate to="/orb/learn/cash" replace />} />
        <Route path="/orb/mini" element={<Navigate to="/orb/learn/cash" replace />} />
        <Route path="/objectives" element={<OnePager />} />
        <Route path="/archive" element={<Archive />} />
        {/* no URL ever renders a blank page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
