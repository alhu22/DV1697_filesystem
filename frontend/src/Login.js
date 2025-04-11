import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

const Login = () => {
  // Group related state
  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    isSignUp: false,
    error: "",
    isLoading: false
  });
  
  // Device detection state
  const [device, setDevice] = useState({
    isMobile: window.innerWidth <= 767,
    isTablet: window.innerWidth > 767 && window.innerWidth <= 1024
  });
  
  const navigate = useNavigate();

  // Handle responsive layout
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setDevice({
        isMobile: width <= 767,
        isTablet: width > 767 && width <= 1024
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update form field
  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Mode switching (login/signup)
  const switchMode = (mode) => {
    const isSigningUp = mode === 'signup';
    const resetFields = {};
    
    // Reset fields based on mode change
    if (isSigningUp !== form.isSignUp) {
      if (isSigningUp) {
        resetFields.username = "";
        resetFields.password = "";
        resetFields.name = "";
      } else if (form.isSignUp) {
        resetFields.name = "";
      }
    }
    
    setForm(prev => ({
      ...prev,
      ...resetFields,
      isSignUp: isSigningUp,
      error: ""
    }));
  };

  // Form submission handlers
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Set loading and clear errors
    setForm(prev => ({ ...prev, isLoading: true, error: "" }));
    
    try {
      if (form.isSignUp) {
        // Signup flow
        setTimeout(() => {
          navigate("/home");
          setForm(prev => ({ ...prev, isLoading: false }));
        }, 1000);
      } else {
        // Login flow
        await fetch("https://backhealth.azurewebsites.net/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username: form.username, 
            password: form.password 
          }),
        });
        
        navigate("/home");
      }
    } catch (error) {
      setForm(prev => ({ ...prev, error: "Serverfel. Försök igen senare." }));
    } finally {
      if (!form.isSignUp) {  // For login flow that doesn't use setTimeout
        setForm(prev => ({ ...prev, isLoading: false }));
      }
    }
  };

  // Container styles based on device
  const containerStyles = {
    backgroundColor: "#fff",
    borderRadius: "10px",
    boxShadow: "0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)",
    position: "relative",
    overflow: "hidden",
    width: device.isMobile ? "95%" : device.isTablet ? "90%" : "768px",
    maxWidth: "100%",
    minHeight: device.isMobile ? "400px" : device.isTablet ? "500px" : "480px"
  };

  const { isSignUp, username, password, name, error, isLoading } = form;
  const { isMobile } = device;

  return (
    <div className="login-page">
      {/* Mobile navigation tabs */}
      {isMobile && (
        <div className="mobile-nav">
          {['login', 'signup'].map(mode => (
            <button 
              key={mode}
              className={`mobile-tab ${(mode === 'signup') === isSignUp ? 'active' : ''}`}
              onClick={() => switchMode(mode)}
              type="button"
            >
              {mode === 'login' ? 'Logga In' : 'Registrera'}
            </button>
          ))}
        </div>
      )}
      
      <div 
        className={`container ${isSignUp ? "right-panel-active" : ""}`}
        style={containerStyles}
      >
        {/* Sign Up Form */}
        <div className={`form-container sign-up-container ${isMobile && isSignUp ? 'mobile-active' : ''}`}>
          <form onSubmit={handleSubmit}>
            <h1>Skapa konto</h1>
            {error && <div className="error-message">{error}</div>}
            
            {/* Form Fields */}
            {[
              { type: "text", placeholder: "Namn", value: name, field: "name" },
              { type: "text", placeholder: "Användarnamn", value: username, field: "username" },
              { type: "password", placeholder: "Lösenord", value: password, field: "password" }
            ].map(input => (
              <input 
                key={input.field}
                type={input.type}
                placeholder={input.placeholder}
                value={input.value}
                onChange={e => updateField(input.field, e.target.value)}
                required
              />
            ))}
            
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Registrerar..." : "Registrera"}
            </button>
          </form>
        </div>

        {/* Sign In Form */}
        <div className={`form-container sign-in-container ${isMobile && !isSignUp ? 'mobile-active' : ''}`}>
          <form onSubmit={handleSubmit}>
            <h1>Logga In</h1>
            {error && <div className="error-message">{error}</div>}
            
            <input
              type="text"
              placeholder="Användarnamn"
              value={username}
              onChange={e => updateField("username", e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Lösenord"
              value={password}
              onChange={e => updateField("password", e.target.value)}
              required
            />
            
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Loggar in..." : "Logga In"}
            </button>
          </form>
        </div>

        {/* Overlay Panel - Desktop/Tablet only */}
        {!isMobile && (
          <div className="overlay-container">
            <div className="overlay">
              <div className="overlay-panel overlay-left">
                <h1>Välkommen tillbaka!</h1>
                <p>Logga in för att komma igång</p>
                <button className="ghost" onClick={() => switchMode('login')}>Logga In</button>
              </div>
              <div className="overlay-panel overlay-right">
                <h1>Hej, studenter!</h1>
                <p>Registrera dig för att börja</p>
                <button className="ghost" onClick={() => switchMode('signup')}>Registrera</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
