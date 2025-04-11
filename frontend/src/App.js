// frontend/src/App.js
import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import "./App.css";

import AddQuestion from "./AddQuestion";
import RandomQuestion from "./RandomQuestion";
import AboutUs from "./AboutUs";
import DataOverview from "./DataOverview";
import DataVis from "./DataVis";
import MenuBar from "./MenuBar";
import FooterMenuBar from "./FooterMenuBar";
import Feedback from "./Feedback";

function App() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("activeTab") || "home";
  });

  useEffect(() => {
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
      localStorage.setItem("activeTab", location.state.activeTab);
    }
  }, [location.state]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem("activeTab", tab);
  };

  const renderContent = () => {
    switch(activeTab) {
      case "upload":
        return <AddQuestion />;
      case "random":
        return <RandomQuestion />;
      case "aboutus":
        return <AboutUs />;
      case "data":
        return <DataOverview />;
      case "stat":
        return <DataVis />;
      case "feedback":
        return <Feedback />;
      case "home":
      default:
        return (
          <div className="welcome-container">
            <div className="home-content">
              <h1>Välkommen till Läkemedelsberäkningar</h1>
              <p>Välj ett alternativ från menyn för att börja.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="App">
      <MenuBar setActiveTab={handleTabChange} />
      <div className="content">
        {renderContent()}
      </div>
      <FooterMenuBar />
    </div>
  );
}

export default App;