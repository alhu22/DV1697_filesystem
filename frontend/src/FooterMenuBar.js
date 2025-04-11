import React from "react";
import { useNavigate } from "react-router-dom";
import "./FooterMenuBar.css";

export default function FooterMenuBar() {
  const currentYear = new Date().getFullYear();
  const navigate = useNavigate();
  
  const handleAboutUsClick = (e) => {
    e.preventDefault();
    navigate('/home', { state: { activeTab: "aboutus" } });
  };

  const handleFeedbackClick = (e) => {
    e.preventDefault();
    navigate('/home', { state: { activeTab: "feedback" } });
  };

  return (
    <footer className="footer-menu-bar" role="contentinfo">
      <div className="footer-content">
        <span className="footer-menu-text">
          © {currentYear} Läkemedelsberäkningar. Alla rättigheter förbehållna.
        </span>
        <div className="footer-links">
          <button 
            onClick={handleAboutUsClick} 
            className="footer-link" 
            aria-label="Om Oss"
          >
            Om Oss
          </button>
          <button 
            onClick={handleFeedbackClick} 
            className="footer-link" 
            aria-label="Lämna Feedback"
          >
            Lämna Feedback
          </button>
        </div>
      </div>
    </footer>
  );
}