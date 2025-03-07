import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./pages/mainPage.tsx";
import WelcomePage from "./pages/welcomePage.tsx";
import ExplorePage from "./pages/explorePage.tsx";
import React from "react";
import "./App.css";

function App() {
  return (
    <React.StrictMode>
      <Router>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
        </Routes>
      </Router>
    </React.StrictMode>
  );
}

export default App;

