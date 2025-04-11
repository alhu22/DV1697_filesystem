// frontend/src/DataOverview.js
import React, { useState, useEffect } from "react";
import "./DataOverview.css"; // Import the CSS file

function DataOverview() {
  const [activeSection, setActiveSection] = useState("courses");

  // Data states for the four entities
  const [courses, setCourses] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [qtypes, setQtypes] = useState([]);
  const [units, setUnits] = useState([]);
  // New state for feedback data
  const [feedbackList, setFeedbackList] = useState([]);

  // Available question types for the courses dropdown
  const [availableQtypes, setAvailableQtypes] = useState([]);

  // Form state for adding new records
  const [newCourse, setNewCourse] = useState({ course_code: "", course_name: "", question_types: [] });
  const [newMedicine, setNewMedicine] = useState({ name: "", fass_link: "", styrkor_doser: "[]" });
  const [newQtype, setNewQtype] = useState({ name: "" });
  const [newUnit, setNewUnit] = useState({ ascii_name: "", accepted_answer: [] });
  // Additional state for unit accepted answer input (for new entry)
  const [newAcceptedAnswer, setNewAcceptedAnswer] = useState("");

  // Editing states
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [editingQtype, setEditingQtype] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  
  // Loading state for API calls
  const [isLoading, setIsLoading] = useState(false);
  
  // Touch states for mobile swipe between tabs
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Min distance for swipe
  const minSwipeDistance = 50;

  // Mobile screen detection
  const [isMobile, setIsMobile] = useState(false);

  // Form visibility state for each section
  const [formVisibleCourses, setFormVisibleCourses] = useState(false);
  const [formVisibleMedicines, setFormVisibleMedicines] = useState(false);
  const [formVisibleQtypes, setFormVisibleQtypes] = useState(false);
  const [formVisibleUnits, setFormVisibleUnits] = useState(false);
  const [formVisibleFeedback, setFormVisibleFeedback] = useState(false);
  
  // Check if screen is mobile size
  useEffect(() => {
    const checkIfMobile = () => {
      const isMobileView = window.innerWidth <= 480;
      setIsMobile(isMobileView);
      
      // Auto-collapse all forms on mobile
      if (isMobileView) {
        setFormVisibleCourses(false);
        setFormVisibleMedicines(false);
        setFormVisibleQtypes(false);
        setFormVisibleUnits(false);
      } else {
        setFormVisibleCourses(true);
        setFormVisibleMedicines(true);
        setFormVisibleQtypes(true);
        setFormVisibleUnits(true);
      }
    };
    
    // Initial check
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Fetch data for the selected tab
  const fetchData = async () => {
    try {
      setIsLoading(true);
      if (activeSection === "courses") {
        const res = await fetch("/api/course/all");
        const data = await res.json();
        setCourses(data.records || []);
      } else if (activeSection === "medicines") {
        const res = await fetch("/api/medicine/all");
        const data = await res.json();
        setMedicines(data.records || []);
      } else if (activeSection === "qtypes") {
        const res = await fetch("/api/qtype/all");
        const data = await res.json();
        setQtypes(data.records || []);
      } else if (activeSection === "units") {
        const res = await fetch("/api/unit/all");
        const data = await res.json();
        setUnits(data.records || []);
      } else if (activeSection === "feedback") {
        const res = await fetch("/api/feedback/all");
        const data = await res.json();
        setFeedbackList(data.records || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available question types (for the course dropdown menus)
  const fetchAvailableQtypes = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/qtype/all");
      const data = await res.json();
      setAvailableQtypes(data.records || []);
    } catch (error) {
      console.error("Error fetching available question types:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeSection]);

  // Fetch available question types once on mount.
  useEffect(() => {
    fetchAvailableQtypes();
  }, []);
  
  // Handle swipe navigation between tabs on mobile
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    const sections = ["courses", "medicines", "qtypes", "units", "feedback"];
    const currentIndex = sections.indexOf(activeSection);
    
    if (isLeftSwipe && currentIndex < sections.length - 1) {
      // Swipe left to go to next tab
      setActiveSection(sections[currentIndex + 1]);
    }
    
    if (isRightSwipe && currentIndex > 0) {
      // Swipe right to go to previous tab
      setActiveSection(sections[currentIndex - 1]);
    }
    
    // Reset values
    setTouchStart(null);
    setTouchEnd(null);
  };

  // ======= COURSE HANDLERS =======
  const handleAddCourse = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        course_code: newCourse.course_code,
        course_name: newCourse.course_name,
        question_types: JSON.stringify(newCourse.question_types)
      };
      const res = await fetch("/api/course/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setNewCourse({ course_code: "", course_name: "", question_types: [] });
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCourse = async (course_code) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      const res = await fetch("/api/course/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_code })
      });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.message);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditCourse = (course) => {
    let parsedTypes = [];
    try {
      parsedTypes = course.question_types ? JSON.parse(course.question_types) : [];
    } catch (e) {
      console.error("Error parsing question_types", e);
    }
    setEditingCourse({ ...course, question_types: parsedTypes });
  };

  const handleUpdateCourse = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        original_course_code: editingCourse.course_code,
        course_code: editingCourse.course_code,
        course_name: editingCourse.course_name,
        question_types: JSON.stringify(editingCourse.question_types)
      };
      const res = await fetch("/api/course/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setEditingCourse(null);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ======= MEDICINE HANDLERS =======
  const handleAddMedicine = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/medicine/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMedicine)
      });
      const data = await res.json();
      if (data.success) {
        setNewMedicine({ name: "", fass_link: "", styrkor_doser: "[]" });
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMedicine = async (id) => {
    if (!window.confirm("Are you sure you want to delete this medicine?")) return;
    try {
      const res = await fetch(`/api/medicine/delete/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.message);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditMedicine = (medicine) => {
    setEditingMedicine(medicine);
  };

  const handleUpdateMedicine = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/medicine/update/${editingMedicine.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingMedicine.name || editingMedicine.namn,
          fass_link: editingMedicine.fass_link,
          styrkor_doser: editingMedicine.styrkor_doser
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingMedicine(null);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ======= QTYPE HANDLERS =======
  const handleAddQtype = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/qtype/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newQtype)
      });
      const data = await res.json();
      if (data.success) {
        setNewQtype({ name: "" });
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQtype = async (id) => {
    if (!window.confirm("Are you sure you want to delete this question type?")) return;
    try {
      const res = await fetch(`/api/qtype/delete/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.message);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditQtype = (qtype) => {
    setEditingQtype(qtype);
  };

  const handleUpdateQtype = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/qtype/edit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingQtype.id,
          name: editingQtype.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingQtype(null);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ======= UNIT HANDLERS =======
  const handleAddUnit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/unit/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ascii_name: newUnit.ascii_name,
          accepted_answer: JSON.stringify(newUnit.accepted_answer)
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewUnit({ ascii_name: "", accepted_answer: [] });
        setNewAcceptedAnswer("");
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUnit = async (id) => {
    if (!window.confirm("Are you sure you want to delete this unit?")) return;
    try {
      const res = await fetch(`/api/unit/delete/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.message);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditUnit = (unit) => {
    let acceptedAnswers = [];
    try {
      acceptedAnswers = unit.accepted_answer ? JSON.parse(unit.accepted_answer) : [];
    } catch (e) {
      console.error("Error parsing accepted_answer", e);
    }
    setEditingUnit({ ...unit, accepted_answer: acceptedAnswers });
  };

  const handleUpdateUnit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/unit/update/${editingUnit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ascii_name: editingUnit.ascii_name,
          accepted_answer: JSON.stringify(editingUnit.accepted_answer)
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingUnit(null);
        fetchData();
      } else {
        alert(data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ======= Helpers for Courses (Question Types Fields) =======
  const handleCourseQtypeChange = (index, value, isEditing = false) => {
    if (isEditing) {
      setEditingCourse(prev => {
        const updated = [...prev.question_types];
        updated[index] = value;
        return { ...prev, question_types: updated };
      });
    } else {
      setNewCourse(prev => {
        const updated = [...prev.question_types];
        updated[index] = value;
        return { ...prev, question_types: updated };
      });
    }
  };

  const addCourseQtypeField = (isEditing = false) => {
    if (isEditing) {
      setEditingCourse(prev => ({
        ...prev,
        question_types: [...prev.question_types, ""]
      }));
    } else {
      setNewCourse(prev => ({
        ...prev,
        question_types: [...prev.question_types, ""]
      }));
    }
  };

  const removeCourseQtypeField = (index, isEditing = false) => {
    if (isEditing) {
      setEditingCourse(prev => {
        const updated = [...prev.question_types];
        updated.splice(index, 1);
        return { ...prev, question_types: updated };
      });
    } else {
      setNewCourse(prev => {
        const updated = [...prev.question_types];
        updated.splice(index, 1);
        return { ...prev, question_types: updated };
      });
    }
  };

  // ======= Handlers for Units Accepted Answers =======
  const handleAddAcceptedAnswer = () => {
    if (newAcceptedAnswer.trim() === "") return;
    setNewUnit(prev => ({
      ...prev,
      accepted_answer: [...prev.accepted_answer, newAcceptedAnswer.trim()]
    }));
    setNewAcceptedAnswer("");
  };

  const handleRemoveAcceptedAnswer = (index, isEditing = false) => {
    if (isEditing) {
      setEditingUnit(prev => {
        const updated = [...prev.accepted_answer];
        updated.splice(index, 1);
        return { ...prev, accepted_answer: updated };
      });
    } else {
      setNewUnit(prev => {
        const updated = [...prev.accepted_answer];
        updated.splice(index, 1);
        return { ...prev, accepted_answer: updated };
      });
    }
  };

  // New function to handle feedback deletion
  const handleDeleteFeedback = async (id) => {
    if (!window.confirm("Are you sure you want to delete this feedback?")) return;
    try {
      const res = await fetch(`/api/feedback/delete/${id}`, { 
        method: "DELETE" 
      });
      const data = await res.json();
      if (data.success) fetchData();
      else alert(data.message);
    } catch (err) {
      console.error(err);
    }
  };

  // Inline styles for table clarity.
  const tableStyle = {
    backgroundColor: "#fff",
    opacity: 1,
    borderCollapse: "collapse",
    width: "100%"
  };

  const thTdStyle = {
    border: "1px solid #ddd",
    padding: "8px"
  };

  // Render card views for mobile instead of tables
  const renderMobileCards = () => {
    if (activeSection === "courses") {
      return (
        <div className="mobile-card-view">
          {courses.length === 0 ? (
            <p className="no-data-message">Inga kurser tillgängliga</p>
          ) : (
            courses.map(course => {
              let displayQuestionTypes = "Inga";
              try {
                const parsed = JSON.parse(course.question_types);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  displayQuestionTypes = parsed.join(", ");
                }
              } catch (e) {
                displayQuestionTypes = course.question_types;
              }
              
              return (
                <div key={course.course_code} className="data-card">
                  <h3>{course.course_code}</h3>
                  <p>
                    <span className="data-card-label">Namn:</span>
                    <span className="data-card-value">{course.course_name}</span>
                  </p>
                  <p>
                    <span className="data-card-label">Frågetyper:</span>
                    <span className="data-card-value">{displayQuestionTypes}</span>
                  </p>
                  <div className="data-card-actions">
                    <button className="btn-edit" onClick={() => handleEditCourse(course)}>Redigera</button>
                    <button className="btn-delete" onClick={() => handleDeleteCourse(course.course_code)}>Ta bort</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    }
    
    if (activeSection === "medicines") {
      return (
        <div className="mobile-card-view">
          {medicines.map(med => {
            let displayDosages = med.styrkor_doser;
            try {
              const parsed = JSON.parse(med.styrkor_doser);
              if (Array.isArray(parsed) && parsed.length > 0) {
                displayDosages = parsed.join(", ");
              }
            } catch (e) {
              // Keep original value if parsing fails
            }
            
            return (
              <div key={med.id} className="data-card">
                <h3>{med.namn}</h3>
                {med.fass_link && (
                  <p>
                    <span className="data-card-label">FASS Länk:</span>
                    <span className="data-card-value">{med.fass_link}</span>
                  </p>
                )}
                <p>
                  <span className="data-card-label">Styrkor & Doser:</span>
                  <span className="data-card-value">{displayDosages}</span>
                </p>
                <div className="data-card-actions">
                  <button className="btn-edit" onClick={() => handleEditMedicine(med)}>Redigera</button>
                  <button className="btn-delete" onClick={() => handleDeleteMedicine(med.id)}>Ta bort</button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    if (activeSection === "qtypes") {
      return (
        <div className="mobile-card-view">
          {qtypes.map(qt => (
            <div key={qt.id} className="data-card">
              <h3>{qt.name}</h3>
              <div className="data-card-actions">
                <button className="btn-edit" onClick={() => handleEditQtype(qt)}>Redigera</button>
                <button className="btn-delete" onClick={() => handleDeleteQtype(qt.id)}>Ta bort</button>
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    if (activeSection === "units") {
      return (
        <div className="mobile-card-view">
          {units.map(unit => {
            let displayAnswers = "Inga";
            try {
              const parsed = JSON.parse(unit.accepted_answer);
              if (Array.isArray(parsed) && parsed.length > 0) {
                displayAnswers = parsed.join(", ");
              }
            } catch (e) {
              displayAnswers = unit.accepted_answer;
            }
            
            return (
              <div key={unit.id} className="data-card">
                <h3>{unit.ascii_name}</h3>
                <p>
                  <span className="data-card-label">Accepterade svar:</span>
                  <span className="data-card-value">{displayAnswers}</span>
                </p>
                <div className="data-card-actions">
                  <button className="btn-edit" onClick={() => handleEditUnit(unit)}>Redigera</button>
                  <button className="btn-delete" onClick={() => handleDeleteUnit(unit.id)}>Ta bort</button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    
    if (activeSection === "feedback") {
      return (
        <div className="mobile-card-view">
          {feedbackList.length === 0 ? (
            <p className="no-data-message">Ingen feedback tillgänglig</p>
          ) : (
            feedbackList.map(fb => (
              <div key={fb.id} className="data-card">
                <p className="feedback-text">{fb.feedback_text}</p>
                <div className="feedback-meta">
                  <span>Skapad: {fb.created_at ? fb.created_at.split(" ")[0] : "N/A"}</span>
                </div>
                <div className="data-card-actions">
                  <button className="btn-delete" onClick={() => handleDeleteFeedback(fb.id)}>Ta bort</button>
                </div>
              </div>
            ))
          )}
        </div>
      );
    }
    
    return null;
  };

  // Replace the toggleFormVisibility function with individual toggles for each section
  const toggleCourseForm = () => setFormVisibleCourses(!formVisibleCourses);
  const toggleMedicineForm = () => setFormVisibleMedicines(!formVisibleMedicines);
  const toggleQtypeForm = () => setFormVisibleQtypes(!formVisibleQtypes);
  const toggleUnitForm = () => setFormVisibleUnits(!formVisibleUnits);
  const toggleFeedbackForm = () => setFormVisibleFeedback(!formVisibleFeedback);

  return (
    <div className="data-overview" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <h1>Dataöversikt</h1>
      <div className="section-tabs">
        <button 
          onClick={() => setActiveSection("courses")} 
          className={activeSection === "courses" ? "active" : ""}
        >
          Kurser
        </button>
        <button 
          onClick={() => setActiveSection("medicines")} 
          className={activeSection === "medicines" ? "active" : ""}
        >
          Mediciner
        </button>
        <button 
          onClick={() => setActiveSection("qtypes")} 
          className={activeSection === "qtypes" ? "active" : ""}
        >
          Frågetyper
        </button>
        <button 
          onClick={() => setActiveSection("units")} 
          className={activeSection === "units" ? "active" : ""}
        >
          Enheter
        </button>
        <button 
          onClick={() => setActiveSection("feedback")} 
          className={activeSection === "feedback" ? "active" : ""}
        >
          Feedback
        </button>
      </div>
      <div className="section-content">
        {isLoading ? (
          <div className="loading-indicator">Laddar...</div>
        ) : (
          <>
            {activeSection === "courses" && (
              <div className="entity-section">
                <h2>
                  Kurser
                  {isMobile && (
                    <button className="form-toggle-btn" onClick={toggleCourseForm}>
                      {formVisibleCourses ? "Dölj formulär" : "Lägg till ny"}
                    </button>
                  )}
                </h2>
                <div className={isMobile && !formVisibleCourses ? "form-collapsed" : ""}>
                  <form className="data-form" onSubmit={editingCourse ? handleUpdateCourse : handleAddCourse}>
                    <div className="form-group">
                      <label>Kurskod:</label>
                      <input 
                        type="text" 
                        placeholder="Kurskod" 
                        value={editingCourse ? editingCourse.course_code : newCourse.course_code}
                        onChange={(e) => {
                          if (editingCourse) {
                            setEditingCourse({ ...editingCourse, course_code: e.target.value });
                          } else {
                            setNewCourse({ ...newCourse, course_code: e.target.value });
                          }
                        }} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Kursnamn:</label>
                      <input 
                        type="text" 
                        placeholder="Kursnamn" 
                        value={editingCourse ? editingCourse.course_name : newCourse.course_name}
                        onChange={(e) => {
                          if (editingCourse) {
                            setEditingCourse({ ...editingCourse, course_name: e.target.value });
                          } else {
                            setNewCourse({ ...newCourse, course_name: e.target.value });
                          }
                        }} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Frågetyper:</label>
                      <div className="multi-field-container">
                        {(editingCourse ? editingCourse.question_types : newCourse.question_types).map((qtype, index) => (
                          <div key={index} className="multi-field-row">
                            <select
                              value={qtype || ""}
                              onChange={(e) =>
                                handleCourseQtypeChange(index, e.target.value, editingCourse ? true : false)
                              }
                              required
                            >
                              <option value="" disabled>Välj frågetyp</option>
                              {availableQtypes.map(opt => (
                                <option key={opt.id} value={opt.name}>{opt.name}</option>
                              ))}
                            </select>
                            <button 
                              type="button" 
                              className="btn-remove" 
                              onClick={() => removeCourseQtypeField(index, editingCourse ? true : false)}
                            >
                              Ta bort
                            </button>
                          </div>
                        ))}
                        <button 
                          type="button" 
                          className="btn-add" 
                          onClick={() => addCourseQtypeField(editingCourse ? true : false)}
                        >
                          + Lägg till frågetyp
                        </button>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary">
                        {editingCourse ? "Uppdatera kurs" : "Lägg till kurs"}
                      </button>
                      {editingCourse && (
                        <button type="button" className="btn-cancel" onClick={() => setEditingCourse(null)}>
                          Avbryt
                        </button>
                      )}
                    </div>
                  </form>
                </div>
                
                {renderMobileCards()}
                
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Kurskod</th>
                        <th>Kursnamn</th>
                        <th>Frågetyper</th>
                        <th>Åtgärder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map(course => {
                        // Parse question types for better display
                        let displayQuestionTypes = "Inga";
                        try {
                          const parsed = JSON.parse(course.question_types);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            displayQuestionTypes = parsed.join(", ");
                          }
                        } catch (e) {
                          displayQuestionTypes = course.question_types;
                        }
                        
                        return (
                          <tr key={course.course_code}>
                            <td>{course.course_code}</td>
                            <td>{course.course_name}</td>
                            <td>{displayQuestionTypes}</td>
                            <td className="actions-cell">
                              <button className="btn-edit" onClick={() => handleEditCourse(course)}>Redigera</button>
                              <button className="btn-delete" onClick={() => handleDeleteCourse(course.course_code)}>Ta bort</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            {activeSection === "medicines" && (
              <div className="entity-section">
                <h2>
                  Mediciner
                  {isMobile && (
                    <button className="form-toggle-btn" onClick={toggleMedicineForm}>
                      {formVisibleMedicines ? "Dölj formulär" : "Lägg till ny"}
                    </button>
                  )}
                </h2>
                <div className={isMobile && !formVisibleMedicines ? "form-collapsed" : ""}>
                  <form className="data-form" onSubmit={editingMedicine ? handleUpdateMedicine : handleAddMedicine}>
                    <div className="form-group">
                      <label>Namn:</label>
                      <input 
                        type="text" 
                        placeholder="Medicinnamn" 
                        value={editingMedicine ? editingMedicine.name || editingMedicine.namn : newMedicine.name}
                        onChange={(e) => {
                          if (editingMedicine) {
                            setEditingMedicine({ ...editingMedicine, name: e.target.value });
                          } else {
                            setNewMedicine({ ...newMedicine, name: e.target.value });
                          }
                        }} 
                        required 
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>FASS Länk:</label>
                      <input 
                        type="text" 
                        placeholder="https://www.fass.se/..." 
                        value={editingMedicine ? editingMedicine.fass_link : newMedicine.fass_link}
                        onChange={(e) => {
                          if (editingMedicine) {
                            setEditingMedicine({ ...editingMedicine, fass_link: e.target.value });
                          } else {
                            setNewMedicine({ ...newMedicine, fass_link: e.target.value });
                          }
                        }}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Styrkor & Doser (JSON Array):</label>
                      <textarea 
                        placeholder='["40 mg", "80 mg", "160 mg"]' 
                        value={editingMedicine ? editingMedicine.styrkor_doser : newMedicine.styrkor_doser}
                        onChange={(e) => {
                          if (editingMedicine) {
                            setEditingMedicine({ ...editingMedicine, styrkor_doser: e.target.value });
                          } else {
                            setNewMedicine({ ...newMedicine, styrkor_doser: e.target.value });
                          }
                        }} 
                        required 
                      />
                    </div>
                    
                    <div className="form-actions">
                      <button type="submit" className="btn-primary">
                        {editingMedicine ? "Uppdatera medicin" : "Lägg till medicin"}
                      </button>
                      {editingMedicine && (
                        <button type="button" className="btn-cancel" onClick={() => setEditingMedicine(null)}>
                          Avbryt
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {renderMobileCards()}

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Namn</th>
                        <th>Fass Länk</th>
                        <th>Styrkor & Doser</th>
                        <th>Åtgärder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map(med => {
                        // Try to parse the styrkor_doser for better display
                        let displayDosages = med.styrkor_doser;
                        try {
                          const parsed = JSON.parse(med.styrkor_doser);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            displayDosages = parsed.join(", ");
                          }
                        } catch (e) {
                          // Keep original value if parsing fails
                        }
                        
                        return (
                          <tr key={med.id}>
                            <td>{med.namn}</td>
                            <td>{med.fass_link}</td>
                            <td>{displayDosages}</td>
                            <td className="actions-cell">
                              <button className="btn-edit" onClick={() => handleEditMedicine(med)}>Redigera</button>
                              <button className="btn-delete" onClick={() => handleDeleteMedicine(med.id)}>Ta bort</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "qtypes" && (
              <div className="entity-section">
                <h2>
                  Frågetyper
                  {isMobile && (
                    <button className="form-toggle-btn" onClick={toggleQtypeForm}>
                      {formVisibleQtypes ? "Dölj formulär" : "Lägg till ny"}
                    </button>
                  )}
                </h2>
                <div className={isMobile && !formVisibleQtypes ? "form-collapsed" : ""}>
                  <form className="data-form" onSubmit={editingQtype ? handleUpdateQtype : handleAddQtype}>
                    <div className="form-group">
                      <label>Frågetyp Namn:</label>
                      <input 
                        type="text" 
                        placeholder="Ange frågetyp namn" 
                        value={editingQtype ? editingQtype.name : newQtype.name}
                        onChange={(e) => {
                          if (editingQtype) {
                            setEditingQtype({ ...editingQtype, name: e.target.value });
                          } else {
                            setNewQtype({ ...newQtype, name: e.target.value });
                          }
                        }} 
                        required 
                      />
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn-primary">
                        {editingQtype ? "Uppdatera frågetyp" : "Lägg till frågetyp"}
                      </button>
                      {editingQtype && (
                        <button type="button" className="btn-cancel" onClick={() => setEditingQtype(null)}>
                          Avbryt
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {renderMobileCards()}

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Namn</th>
                        <th>Åtgärder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qtypes.map(qt => (
                        <tr key={qt.id}>
                          <td>{qt.name}</td>
                          <td className="actions-cell">
                            <button className="btn-edit" onClick={() => handleEditQtype(qt)}>Redigera</button>
                            <button className="btn-delete" onClick={() => handleDeleteQtype(qt.id)}>Ta bort</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "units" && (
              <div className="entity-section">
                <h2>
                  Enheter
                  {isMobile && (
                    <button className="form-toggle-btn" onClick={toggleUnitForm}>
                      {formVisibleUnits ? "Dölj formulär" : "Lägg till ny"}
                    </button>
                  )}
                </h2>
                <div className={isMobile && !formVisibleUnits ? "form-collapsed" : ""}>
                  <form className="data-form" onSubmit={editingUnit ? handleUpdateUnit : handleAddUnit}>
                    <div className="form-group">
                      <label>ASCII Namn:</label>
                      <input 
                        type="text" 
                        placeholder="Enhet ASCII representation (t.ex., mg, ml)" 
                        value={editingUnit ? editingUnit.ascii_name : newUnit.ascii_name}
                        onChange={(e) => {
                          if (editingUnit) {
                            setEditingUnit({ ...editingUnit, ascii_name: e.target.value });
                          } else {
                            setNewUnit({ ...newUnit, ascii_name: e.target.value });
                          }
                        }} 
                        required 
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Accepterade svar:</label>
                      <div className="multi-field-container">
                        {(editingUnit ? editingUnit.accepted_answer : newUnit.accepted_answer).map((ans, index) => (
                          <div key={index} className="multi-field-row">
                            <input type="text" value={ans} readOnly />
                            <button 
                              type="button" 
                              className="btn-remove"
                              onClick={() => handleRemoveAcceptedAnswer(index, editingUnit ? true : false)}
                            >
                              Ta bort
                            </button>
                          </div>
                        ))}
                        
                        {editingUnit ? (
                          <div className="multi-field-row">
                            <input 
                              type="text" 
                              placeholder="Nytt accepterat svar" 
                              value={editingUnit.tempAcceptedAnswer || ""}
                              onChange={(e) => setEditingUnit({ ...editingUnit, tempAcceptedAnswer: e.target.value })}
                            />
                            <button 
                              type="button"
                              className="btn-add" 
                              onClick={() => {
                                const answer = editingUnit.tempAcceptedAnswer || "";
                                if(answer.trim() === "") return;
                                setEditingUnit({
                                  ...editingUnit,
                                  accepted_answer: [...editingUnit.accepted_answer, answer.trim()],
                                  tempAcceptedAnswer: ""
                                });
                              }}
                            >
                              Lägg till
                            </button>
                          </div>
                        ) : (
                          <div className="multi-field-row">
                            <input 
                              type="text" 
                              placeholder="Nytt accepterat svar" 
                              value={newAcceptedAnswer}
                              onChange={(e) => setNewAcceptedAnswer(e.target.value)}
                            />
                            <button type="button" className="btn-add" onClick={handleAddAcceptedAnswer}>
                              Lägg till svar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="form-actions">
                      <button type="submit" className="btn-primary">
                        {editingUnit ? "Uppdatera enhet" : "Lägg till enhet"}
                      </button>
                      {editingUnit && (
                        <button type="button" className="btn-cancel" onClick={() => setEditingUnit(null)}>
                          Avbryt
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {renderMobileCards()}

                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>ASCII Namn</th>
                        <th>Accepterade svar</th>
                        <th>Åtgärder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map(unit => {
                        // Parse accepted answers for better display
                        let displayAnswers = "Inga";
                        try {
                          const parsed = JSON.parse(unit.accepted_answer);
                          if (Array.isArray(parsed) && parsed.length > 0) {
                            displayAnswers = parsed.join(", ");
                          }
                        } catch (e) {
                          displayAnswers = unit.accepted_answer;
                        }
                        
                        return (
                          <tr key={unit.id}>
                            <td>{unit.ascii_name}</td>
                            <td>{displayAnswers}</td>
                            <td className="actions-cell">
                              <button className="btn-edit" onClick={() => handleEditUnit(unit)}>Redigera</button>
                              <button className="btn-delete" onClick={() => handleDeleteUnit(unit.id)}>Ta bort</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === "feedback" && (
              <div className="entity-section">
                <h2>Feedback</h2>
                
                {renderMobileCards()}
                
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Feedback</th>
                        <th>Skapad</th>
                        <th>Åtgärder</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbackList.length === 0 ? (
                        <tr>
                          <td colSpan="3" style={{ textAlign: "center" }}>Ingen feedback tillgänglig</td>
                        </tr>
                      ) : (
                        feedbackList.map(fb => (
                          <tr key={fb.id}>
                            <td>{fb.feedback_text}</td>
                            <td>{fb.created_at ? fb.created_at.split(" ")[0] : "N/A"}</td>
                            <td className="actions-cell">
                              <button className="btn-delete" onClick={() => handleDeleteFeedback(fb.id)}>Ta bort</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default DataOverview;
