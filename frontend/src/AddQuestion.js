import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./AddQuestion.css";

const API_BASE_URL = "https://backhealth.azurewebsites.net/api";

const AddQuestion = () => {
  const [formData, setFormData] = useState({
    question: "",
    variatingValues: "",
    courses: [],
    questionType: ""
  });

  const [referenceData, setReferenceData] = useState({
    courses: [],
    qtypes: []
  });

  const [courseModal, setCourseModal] = useState({
    isOpen: false,
    newCourseCode: "",
    newCourseName: "",
    newQtypeList: "",
    isSaving: false,
    saveMessage: ""
  });

  const [qtypeModal, setQtypeModal] = useState({
    isOpen: false,
    newQtypeName: "",
    isSaving: false,
    saveMessage: ""
  });

  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth <= 1024
  );

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateCourseModal = (field, value) => {
    setCourseModal((prev) => ({ ...prev, [field]: value }));
  };

  const updateQtypeModal = (field, value) => {
    setQtypeModal((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const handleResize = () => {
      setIsTablet(window.innerWidth >= 768 && window.innerWidth <= 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleApiError = useCallback((message, error) => {
    console.error(message, error);
  }, []);

  const fetchData = useCallback(
    async (endpoint, stateKey) => {
      try {
        const response = await axios.get(`${API_BASE_URL}/${endpoint}/all`);
        if (response.data && response.data.records) {
          setReferenceData((prev) => ({
            ...prev,
            [stateKey]: response.data.records
          }));
        }
      } catch (err) {
        handleApiError(`Error fetching ${stateKey}:`, err);
      }
    },
    [handleApiError]
  );

  useEffect(() => {
    fetchData("course", "courses");
    fetchData("qtype", "qtypes");
  }, [fetchData]);

  const handleCourseChange = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    
    // Check if "Add New Course" option is selected
    if (selectedOptions.includes("__new__")) {
      updateCourseModal("isOpen", true);
      // Remove "__new__" from selections if there are other selections
      const filteredSelections = selectedOptions.filter(val => val !== "__new__");
      handleFormChange("courses", filteredSelections);
    } else {
      handleFormChange("courses", selectedOptions);
    }
  };

  const handleQtypeChange = (e) => {
    if (e.target.value === "__new__") {
      updateQtypeModal("isOpen", true);
    } else {
      handleFormChange("questionType", e.target.value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newQuestion = {
      question: formData.question,
      variating_values: formData.variatingValues,
      course_codes: formData.courses,
      question_type_id: formData.questionType
    };
    try {
      await axios.post(`${API_BASE_URL}/question/add`, newQuestion);
      setFormData({
        question: "",
        variatingValues: "",
        courses: [],
        questionType: ""
      });
    } catch (error) {
      handleApiError("Error adding question:", error);
    }
  };

  const handleNewCourseSubmit = async (e) => {
    e.preventDefault();
    updateCourseModal("isSaving", true);
    updateCourseModal("saveMessage", "Saving course...");
    try {
      const courseData = {
        course_code: courseModal.newCourseCode,
        course_name: courseModal.newCourseName,
        question_types: courseModal.newQtypeList
      };
      const res = await axios.post(`${API_BASE_URL}/course/add`, courseData);
      if (res && res.data) {
        setReferenceData((prev) => ({
          ...prev,
          courses: [...prev.courses, res.data]
        }));
        handleFormChange("courses", [...formData.courses, courseModal.newCourseCode]);
        updateCourseModal("saveMessage", "Course saved successfully!");
        setTimeout(() => {
          setCourseModal({
            isOpen: false,
            newCourseCode: "",
            newCourseName: "",
            newQtypeList: "",
            isSaving: false,
            saveMessage: ""
          });
        }, 1000);
      } else {
        updateCourseModal("saveMessage", "Error: No response data");
      }
    } catch (err) {
      handleApiError("Error adding new course:", err);
      updateCourseModal("saveMessage", "Error saving course");
    }
    updateCourseModal("isSaving", false);
  };

  const handleNewQtypeSubmit = async (e) => {
    e.preventDefault();
    updateQtypeModal("isSaving", true);
    updateQtypeModal("saveMessage", "Saving question type...");
    try {
      const res = await axios.post(`${API_BASE_URL}/qtype/add`, {
        name: qtypeModal.newQtypeName
      });
      if (res && res.data) {
        setReferenceData((prev) => ({
          ...prev,
          qtypes: [...prev.qtypes, res.data]
        }));
        handleFormChange("questionType", res.data.id || qtypeModal.newQtypeName);
        updateQtypeModal("saveMessage", "Question type saved successfully!");
        setTimeout(() => {
          setQtypeModal({
            isOpen: false,
            newQtypeName: "",
            isSaving: false,
            saveMessage: ""
          });
        }, 1000);
      } else {
        updateQtypeModal("saveMessage", "Error: No response data");
      }
    } catch (err) {
      handleApiError("Error adding new question type:", err);
      updateQtypeModal("saveMessage", "Error saving question type");
    }
    updateQtypeModal("isSaving", false);
  };

  const { courses, qtypes } = referenceData;
  const { question, variatingValues, courses: selCourses, questionType } = formData;

  return (
    <div className={`add-question ${isTablet ? "tablet-view" : ""}`}>
      <h2>Lägg Till En Ny Fråga</h2>
      <form onSubmit={handleSubmit}>
        <fieldset>
          <legend>Fråga Detaljer</legend>
          <div>
            <label className="question-label">Fråga</label>
            <textarea
              value={question}
              onChange={(e) => handleFormChange("question", e.target.value)}
              placeholder="Skriv in frågan här"
              required
              rows={isTablet ? "5" : "4"}
            ></textarea>
          </div>
          <div>
            <label className="variating-values-label">
              Kommentar
            </label>
            <textarea
              value={variatingValues}
              onChange={(e) => handleFormChange("variatingValues", e.target.value)}
              placeholder='skriv in kommentarer här'
              rows={isTablet ? "4" : "3"}
            ></textarea>
          </div>
        </fieldset>
        <fieldset>
          <legend>Kurs &amp; Frågetyp</legend>
          <div>
            <label className="bold-label">Kurs</label>
            <select
              multiple
              value={selCourses}
              onChange={handleCourseChange}
              onFocus={() => fetchData("course", "courses")}
              className="multi-select"
            >
              {Array.isArray(courses) && courses.length > 0 ? (
                courses.map((crs) => (
                  <option key={crs.course_code} value={crs.course_code}>
                    {crs.course_code}
                  </option>
                ))
              ) : (
                <option disabled>Inga Kurser Tillgängliga</option>
              )}
            </select>
            <small className="helper-text">Håll ned Ctrl (Windows) eller Cmd (Mac) för att välja flera kurser</small>
          </div>
          <div>
            <label className="bold-label">Frågetyp</label>
            <select
              value={questionType}
              onChange={handleQtypeChange}
              onFocus={() => fetchData("qtype", "qtypes")}
            >
              <option value="">Välj En Frågetyp</option>
              {Array.isArray(qtypes) && qtypes.length > 0 ? (
                qtypes.map((qt) => (
                  <option key={qt.id} value={qt.id}>
                    {qt.name}
                  </option>
                ))
              ) : (
                <option disabled>Inga Frågetyper Tillgängliga</option>
              )}
            </select>
          </div>
        </fieldset>
        <button type="submit" className={isTablet ? "tablet-button" : ""}>
          Lägg till Fråga
        </button>
      </form>

      {courseModal.isOpen && (
        <div className="modal-overlay">
          <div className={`modal ${isTablet ? "tablet-modal" : ""}`}>
            <h3>Add New Course</h3>
            <form onSubmit={handleNewCourseSubmit}>
              <div>
                <label>Kurs Kod</label>
                <input
                  type="text"
                  value={courseModal.newCourseCode}
                  onChange={(e) => updateCourseModal("newCourseCode", e.target.value)}
                  placeholder="e.g. KM1423"
                  required
                />
              </div>
              <div>
                <label>Kurs Namn</label>
                <textarea
                  value={courseModal.newCourseName}
                  onChange={(e) => updateCourseModal("newCourseName", e.target.value)}
                  placeholder="Enter course name"
                  rows="2"
                ></textarea>
              </div>
              <div>
                <label>Fråge Typ Lista</label>
                <textarea
                  value={courseModal.newQtypeList}
                  onChange={(e) => updateCourseModal("newQtypeList", e.target.value)}
                  placeholder='["qtype_id1", "qtype_id2"]'
                  rows="2"
                ></textarea>
              </div>
              <button type="submit" disabled={courseModal.isSaving}>
                {courseModal.isSaving ? "Saving..." : "Submit"}
              </button>
              <button type="button" onClick={() => updateCourseModal("isOpen", false)}>
                Cancel
              </button>
              {courseModal.saveMessage && <p>{courseModal.saveMessage}</p>}
            </form>
          </div>
        </div>
      )}

      {qtypeModal.isOpen && (
        <div className="modal-overlay">
          <div className={`modal ${isTablet ? "tablet-modal" : ""}`}>
            <h3>Add New Question Type</h3>
            <form onSubmit={handleNewQtypeSubmit}>
              <div>
                <label>Fråge Typ Namn</label>
                <textarea
                  value={qtypeModal.newQtypeName}
                  onChange={(e) => updateQtypeModal("newQtypeName", e.target.value)}
                  placeholder="e.g. Dosage Calculation"
                  required
                  rows="2"
                ></textarea>
              </div>
              <button type="submit" disabled={qtypeModal.isSaving}>
                {qtypeModal.isSaving ? "Saving..." : "Submit"}
              </button>
              <button type="button" onClick={() => updateQtypeModal("isOpen", false)}>
                Cancel
              </button>
              {qtypeModal.saveMessage && <p>{qtypeModal.saveMessage}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddQuestion;
