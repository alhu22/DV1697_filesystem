// frontend/src/Feedback.js
import React, { useState } from "react";
import "./Feedback.css"; // <-- Import the new stylesheet

function Feedback() {
  const [feedbackText, setFeedbackText] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback_text: feedbackText }),
      });
      const data = await response.json();

      if (data.success) {
        setFeedbackText("");
        setIsSuccess(true);
        setStatusMessage("Tack för din feedback!");
      } else {
        setIsSuccess(false);
        setStatusMessage(data.message || "Något gick fel.");
      }
    } catch (error) {
      setIsSuccess(false);
      setStatusMessage("Fel vid anslutning till servern.");
    }
  };

  return (
    <div className="feedback-container">
      <h2>Lämna Feedback</h2>
      <form onSubmit={handleSubmit}>
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Skriv din feedback här..."
        />
        <button type="submit">SKICKA</button>
      </form>
      {statusMessage && (
        <div
          className={`feedback-message ${isSuccess ? "success" : "error"}`}
        >
          {statusMessage}
        </div>
      )}
    </div>
  );
}

export default Feedback;