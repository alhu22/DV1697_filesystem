// frontend/src/RandomQuestion.js
import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import "./RandomQuestion.css";

// Custom hook for detecting iOS device
const useIsIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// Ultra-compact CustomSelect component
const CustomSelect = ({ value, onChange, options, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const isIOS = useIsIOS();

  useEffect(() => {
    const handleClick = (e) =>
      selectRef.current &&
      !selectRef.current.contains(e.target) &&
      setIsOpen(false);
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isIOS)
    return (
      <select value={value} onChange={onChange}>
        <option value="">{placeholder}</option>
        {options.map(({ value: v, label }) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>
    );

  return (
    <div className="custom-select" ref={selectRef}>
      <div className="custom-select__trigger" onClick={() => setIsOpen(!isOpen)}>
        {options.find((o) => o.value === value)?.label || placeholder}
      </div>
      {isOpen && (
        <div className="custom-select__options">
          <div
            className="custom-select__option"
            onClick={() => {
              onChange({ target: { value: "" } });
              setIsOpen(false);
            }}
          >
            {placeholder}
          </div>
          {options.map(({ value: v, label }) => (
            <div
              key={v}
              onClick={() => {
                onChange({ target: { value: v } });
                setIsOpen(false);
              }}
              className={`custom-select__option ${value === v ? "selected" : ""}`}
            >
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// HintModal component for displaying image hints
const HintModal = ({
  isOpen,
  onClose,
  currentIndex,
  setCurrentIndex,
  fallbackImage,
}) =>
  !isOpen ? null : (
    <div className="hint-modal-overlay" onClick={onClose}>
      <div className="hint-modal" onClick={(e) => e.stopPropagation()}>
        <span className="hint-close" onClick={onClose}>
          &times;
        </span>
        <h3>Hints</h3>
        <div className={`hint-image-container hint-image-${currentIndex + 1}`}>
          <img
            src={fallbackImage}
            alt={`Hint ${currentIndex + 1}`}
            className="hint-image"
            onError={(e) => {
              e.target.style.display = "block";
            }}
          />
          <div className="hint-pagination">
            {[1, 2, 3].map((_, idx) => (
              <span
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`hint-dot ${currentIndex === idx ? "active" : ""}`}
              />
            ))}
          </div>
          <button
            className="hint-nav prev"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((currentIndex - 1 + 3) % 3);
            }}
          >
            &#10094;
          </button>
          <button
            className="hint-nav next"
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex((currentIndex + 1) % 3);
            }}
          >
            &#10095;
          </button>
        </div>
        <p className="hint-counter">{currentIndex + 1} / 3</p>
      </div>
    </div>
  );

const RandomQuestion = () => {
  const [state, setState] = useState({
    questionData: null,
    userAnswer: "",
    feedback: { message: "", type: "" },
    attempts: 0,
    loading: false,
    courses: [],
    selectedCourse: "",
    showHints: false,
    currentHintIndex: 0,
    showAnswer: false,
    revealedQuestionHintCount: 0,
  });

  const {
    questionData,
    userAnswer,
    feedback,
    attempts,
    loading,
    courses,
    selectedCourse,
    showHints,
    currentHintIndex,
    showAnswer,
    revealedQuestionHintCount,
  } = state;

  // Helper to update partial state
  const update = (patch) =>
    setState((prev) => ({
      ...prev,
      ...patch,
    }));

  const API_BASE = "https://backhealth.azurewebsites.net/api";
  const fallbackImage = "https://placehold.co/600x400?text=Hint+Image";

  // Prepare course options for the dropdown
  const courseOptions = useMemo(
    () =>
      courses.map(({ course_code, course_name }) => ({
        value: course_code,
        label: `${course_code}: ${course_name}`,
      })),
    [courses]
  );

  // API functions to fetch courses, questions, and check answers
  const api = useMemo(
    () => ({
      fetchCourses: () =>
        axios
          .get(`${API_BASE}/course/all`)
          .then((res) => update({ courses: res.data.records }))
          .catch((err) => console.error("Error:", err)),

      fetchQuestion: async (courseCode) => {
        update({
          loading: true,
          attempts: 0,
          feedback: { message: "", type: "" },
          showAnswer: false,
          revealedQuestionHintCount: 0,
        });
        try {
          const { data } = await axios.get(
            `${API_BASE}/question/random?course_code=${courseCode}`
          );
          update({
            questionData: data.success ? data.data : null,
            userAnswer: "",
            loading: false,
          });
        } catch (error) {
          update({
            questionData: null,
            loading: false,
            feedback: {
              message:
                error.response?.status === 404
                  ? "Ingen fråga hittades för den valda kursen."
                  : "Ett fel uppstod vid hämtning av fråga.",
              type: "incorrect",
            },
          });
        }
      },

      checkAnswer: async (answer, question, attemptCount) => {
        try {
          const { data } = await axios.post(
            `${API_BASE}/question/check-answer`,
            {
              question_id: question.id,
              answer,
              correctAnswer: question.computed_answer,
              correctUnit: question.answer_units?.accepted_answer,
              formula: question.formula,
              course_code: selectedCourse, // NEW: Pass the selected course code
            }
          );
          update({
            feedback: {
              message: data.message,
              type: data.correct ? "correct" : "incorrect",
            },
            attempts: data.correct ? 0 : attemptCount + 1,
          });
        } catch (error) {
          update({
            feedback: {
              message: "Ett fel uppstod vid svarskontrollen.",
              type: "incorrect",
            },
          });
        }
      },
    }),
    [API_BASE, selectedCourse]
  );

  // Fetch courses on component mount
  useEffect(() => {
    api.fetchCourses();
  }, [api]);

  // Event handlers
  const handleCourseChange = (e) => update({ selectedCourse: e.target.value });
  const handleAnswerChange = (e) => update({ userAnswer: e.target.value });
  const toggleHints = () =>
    update({
      showHints: !showHints,
      currentHintIndex: !showHints ? 0 : currentHintIndex,
    });

  const handleFetchQuestion = () => {
    if (!selectedCourse) {
      return update({
        feedback: { message: "Välj en kurs först.", type: "incorrect" },
      });
    }
    api.fetchQuestion(selectedCourse);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (questionData) api.checkAnswer(userAnswer, questionData, attempts);
  };

  const toggleAnswer = () => update({ showAnswer: !showAnswer });

  const handleShowNextQuestionHint = () => {
    if (questionData && questionData.hints) {
      const totalHints = questionData.hints.length;
      if (revealedQuestionHintCount < totalHints) {
        update({ revealedQuestionHintCount: revealedQuestionHintCount + 1 });
      }
    }
  };

  // Resource buttons for additional tools.
  // The FASS button now uses the medicine link from the fetched question
  const resourceButtons = [
    {
      href: "https://www.desmos.com/fourfunction?lang=sv-SE",
      icon: "🧮",
      text: "Miniräknare",
      className: "calculator-btn",
    },
    {
      href: questionData && questionData.medicine_link ? questionData.medicine_link : "https://www.fass.se",
      icon: "💊",
      text: "FASS",
      className: "fass-btn",
    },
    {
      onClick: toggleHints,
      icon: "💡",
      text: "Hints",
      className: "hint-resource-btn",
    },
  ];

  return (
    <div className="random-question-container">
      <h2>Slumpmässig Fråga</h2>

      <div className="course-selector">
        <label>Välj en kurs:</label>
        <CustomSelect
          value={selectedCourse}
          onChange={handleCourseChange}
          placeholder="-- Välj en kurs --"
          options={courseOptions}
        />
      </div>

      {!questionData && (
        <button className="btn-primary start-button" onClick={handleFetchQuestion}>
          {loading ? "Laddar..." : "Kom Igång"}
        </button>
      )}

      {loading && <div className="loading-spinner" />}

      {questionData && (
        <div className="question-display">
          <p>{questionData.question}</p>
          <form className="answer-form" onSubmit={handleSubmit}>
            <label>({questionData.answer_unit_id}):</label>
            <input
              type="text"
              value={userAnswer}
              onChange={handleAnswerChange}
              placeholder="Ange ditt svar"
              required
            />
            <div className="button-group">
              <button type="submit" className="next-button">
                Skicka Svar
              </button>
              <button
                type="button"
                onClick={toggleAnswer}
                className="next-button"
              >
                Visa Svar
              </button>
              <button
                type="button"
                onClick={handleFetchQuestion}
                className="next-button"
              >
                Nästa Fråga
              </button>
            </div>
          </form>

          {showAnswer && (
            <div className="answer-display">
              <p>
                {(() => {
                  const num = questionData.computed_answer;
                  const formattedNum =
                    Number.isInteger(num) ? num : parseFloat(num.toFixed(2));
                  let unit = "";
                  if (
                    questionData.answer_units &&
                    questionData.answer_units.accepted_answer
                  ) {
                    try {
                      const parsedUnits = JSON.parse(
                        questionData.answer_units.accepted_answer
                      );
                      unit = Array.isArray(parsedUnits)
                        ? parsedUnits[0]
                        : parsedUnits;
                    } catch (e) {
                      unit = questionData.answer_units.accepted_answer;
                    }
                  }
                  return `Rätt svar: ${formattedNum} ${unit}`;
                })()}
              </p>
            </div>
          )}

          {questionData.hints && questionData.hints.length > 0 && (
            <div className="question-hints-container">
              <h4>Frågehints</h4>
              {questionData.hints
                .slice(0, revealedQuestionHintCount)
                .map((hint, idx) => (
                  <div key={idx} className="question-hint">
                    {hint}
                  </div>
                ))}
              {revealedQuestionHintCount < questionData.hints.length ? (
                <>
                  <button
                    onClick={handleShowNextQuestionHint}
                    className="show-question-hint-btn"
                  >
                    Visa nästa hint ({revealedQuestionHintCount + 1}/
                    {questionData.hints.length})
                  </button>
                  <div className="question-hint-progress-bar">
                    <div
                      className="question-hint-progress-bar-filled"
                      style={{
                        width: `${
                          (revealedQuestionHintCount / questionData.hints.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="hint-progress">Alla hints är visade.</p>
              )}
            </div>
          )}
        </div>
      )}

      <HintModal
        isOpen={showHints}
        onClose={toggleHints}
        currentIndex={currentHintIndex}
        setCurrentIndex={(idx) => update({ currentHintIndex: idx })}
        fallbackImage={fallbackImage}
      />

      {feedback.message && (
        <p className={`feedback ${feedback.type}`}>{feedback.message}</p>
      )}

      <div className="resource-buttons">
        {resourceButtons.map((resource, i) =>
          resource.href ? (
            <a
              key={i}
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`resource-btn ${resource.className}`}
            >
              <span className="resource-icon">{resource.icon}</span>
              <span className="resource-text">{resource.text}</span>
            </a>
          ) : (
            <button
              key={i}
              type="button"
              onClick={resource.onClick}
              className={`resource-btn ${resource.className}`}
            >
              <span className="resource-icon">{resource.icon}</span>
              <span className="resource-text">{resource.text}</span>
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default RandomQuestion;
