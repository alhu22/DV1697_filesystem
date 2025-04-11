// frontend/src/MenuBar.js
import React, { useState, useEffect, useRef } from "react";
import "./MenuBar.css";

export default function MenuBar({ setActiveTab }) {
  const [isTablet, setIsTablet] = useState(window.innerWidth <= 1024);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  
  useEffect(() => {
    const handleResize = () => {
      setIsTablet(window.innerWidth <= 1024);
      if (window.innerWidth > 1024) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target) && menuOpen) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    if (isTablet) {
      setMenuOpen(false);
    }
  };

  // Added new "Data Overview" and "Statistik" tabs here.
  const menuItems = [
    { tab: "home", label: "Hem" },
    { tab: "upload", label: "Lägg Till Frågor" },
    { tab: "random", label: "Slumpmässig Fråga" },
    { tab: "data", label: "Dataöversikt" },
    { tab: "stat", label: "Statistik" }
  ];

  return (
    <div className="menu-bar" ref={menuRef}>
      <div className="menu-header">
        <span className="menu-title">Läkemedelsberäkningar</span>
        {isTablet && (
          <button 
            className={`menu-button ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            Meny
          </button>
        )}
      </div>
      <div 
        className={`menu-buttons ${isTablet ? 'mobile' : ''} ${menuOpen ? 'open' : ''}`}
        aria-hidden={isTablet && !menuOpen}
      >
        {menuItems.map((item, index) => (
          <React.Fragment key={item.tab}>
            {!isTablet && <span className="menu-separator">|</span>}
            <button 
              className="menu-item" 
              onClick={() => handleTabClick(item.tab)}
              style={{"--item-index": index}}
            >
              {item.label}
            </button>
          </React.Fragment>
        ))}
        {!isTablet && <span className="menu-separator">|</span>}
      </div>
    </div>
  );
}
