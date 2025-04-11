// frontend/src/DataVis.js
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./DataVis.css";

/** Helper to format dates as YYYY-MM-DD */
function formatDate(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const COLORS = ["#0088FE", "#FF8042"];

const DataVis = () => {
  // --- Global date range & slider state ---
  const [globalMinDate, setGlobalMinDate] = useState("");
  const [globalMaxDate, setGlobalMaxDate] = useState("");
  const [sliderRange, setSliderRange] = useState([0, 0]);

  // --- Date picker state ---
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // --- Aggregated Data & Loading ---
  const [aggData, setAggData] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Dropdown Filters ---
  const [questions, setQuestions] = useState([]);
  const [qTypes, setQTypes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState("all");
  const [selectedQType, setSelectedQType] = useState("all");
  const [selectedCourse, setSelectedCourse] = useState("all");

  // --- Aggregation Interval State ---
  const [aggregation, setAggregation] = useState("daily");

  // --- Fetch Global Date Range ---
  const fetchGlobalDateRange = async () => {
    try {
      const res = await axios.get("https://backhealth.azurewebsites.net/api/answer/history/aggregated");
      if (res.data.success && res.data.aggregatedData.length > 0) {
        const dates = res.data.aggregatedData
          .map((item) => item.answer_date)
          .sort();
        const earliest = dates[0];
        const latest = dates[dates.length - 1];
        setGlobalMinDate(earliest);
        setGlobalMaxDate(latest);
        const minTs = new Date(earliest).getTime();
        const maxTs = new Date(latest).getTime();
        setSliderRange([minTs, maxTs]);
        setStartDate(earliest);
        setEndDate(latest);
      }
    } catch (error) {
      console.error("Error fetching global date range", error);
    }
  };

  // --- Fetch Questions, QTypes, Courses ---
  const fetchQuestions = async () => {
    try {
      const res = await axios.get("https://backhealth.azurewebsites.net/api/question/all");
      if (res.data.success) {
        setQuestions(res.data.records);
      }
    } catch (error) {
      console.error("Error fetching questions", error);
    }
  };

  const fetchQTypes = async () => {
    try {
      const res = await axios.get("https://backhealth.azurewebsites.net/api/qtype/all");
      if (res.data.success) {
        setQTypes(res.data.records);
      }
    } catch (error) {
      console.error("Error fetching qtypes", error);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await axios.get("https://backhealth.azurewebsites.net/api/course/all");
      if (res.data.success) {
        setCourses(res.data.records);
      }
    } catch (error) {
      console.error("Error fetching courses", error);
    }
  };

  // --- Fetch Aggregated Data (with filters and aggregation interval) ---
  const fetchAggregatedData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        aggregation: aggregation,
      };
      if (selectedQuestion !== "all") params.question_id = selectedQuestion;
      if (selectedQType !== "all") params.question_type = selectedQType;
      if (selectedCourse !== "all") params.course = selectedCourse;
      const res = await axios.get("https://backhealth.azurewebsites.net/api/answer/history/aggregated", { params });
      if (res.data.success) {
        setAggData(res.data.aggregatedData);
      } else {
        setAggData([]);
      }
    } catch (error) {
      console.error("Error fetching aggregated data", error);
      setAggData([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, aggregation, selectedQuestion, selectedQType, selectedCourse]);

  // --- useEffects ---
  useEffect(() => {
    fetchGlobalDateRange();
    fetchQuestions();
    fetchQTypes();
    fetchCourses();
  }, []);

  useEffect(() => {
    if (!globalMinDate || !globalMaxDate) return;
    fetchAggregatedData();
  }, [globalMinDate, globalMaxDate, fetchAggregatedData]);

  // --- Slider Boundaries ---
  const globalMinTs = useMemo(() => (globalMinDate ? new Date(globalMinDate).getTime() : 0), [globalMinDate]);
  const globalMaxTs = useMemo(() => (globalMaxDate ? new Date(globalMaxDate).getTime() : 0), [globalMaxDate]);

  const sliderMarks = useMemo(() => {
    if (globalMinTs && globalMaxTs) {
      return {
        [globalMinTs]: globalMinDate,
        [globalMaxTs]: globalMaxDate,
      };
    }
    return {};
  }, [globalMinTs, globalMaxTs, globalMinDate, globalMaxDate]);

  // --- Handlers for Dropdowns ---
  const handleQuestionChange = (e) => setSelectedQuestion(e.target.value);
  const handleQTypeChange = (e) => setSelectedQType(e.target.value);
  const handleCourseChange = (e) => setSelectedCourse(e.target.value);
  
  // --- Handler for Aggregation Dropdown ---
  const handleAggregationChange = (e) => setAggregation(e.target.value);

  // --- Handlers for Date Pickers ---
  const handleStartDateChange = (e) => {
    const val = e.target.value;
    setStartDate(val);
    if (val) {
      const ts = new Date(val).getTime();
      setSliderRange(([oldStart, oldEnd]) => [ts, oldEnd]);
    }
  };
  const handleEndDateChange = (e) => {
    const val = e.target.value;
    setEndDate(val);
    if (val) {
      const ts = new Date(val).getTime();
      setSliderRange(([oldStart, oldEnd]) => [oldStart, ts]);
    }
  };

  // --- Handlers for Single Range Slider ---
  const handleSliderChange = (value) => {
    setSliderRange(value);
  };
  const handleSliderAfterChange = (value) => {
    const [startTs, endTs] = value;
    if (startTs <= endTs) {
      setStartDate(formatDate(new Date(startTs)));
      setEndDate(formatDate(new Date(endTs)));
    }
  };

  // --- Pie Chart Data ---
  const totalCorrect = aggData.reduce((sum, row) => sum + row.correct_count, 0);
  const totalWrong = aggData.reduce((sum, row) => sum + row.wrong_count, 0);
  const pieData = [
    { name: "Korrekt", value: totalCorrect },
    { name: "Fel", value: totalWrong },
  ];

  // --- Chart Title based on Aggregation ---
  const chartTitle = aggregation === "daily"
    ? "Daglig Utveckling"
    : aggregation === "weekly"
    ? "Veckovis Utveckling"
    : "Månadsvis Utveckling";

  return (
    <div className="data-vis-container">
      <h2>Statistik</h2>

      {/* Dropdown Filters */}
      <div className="filter-section">
        <div className="filter-item">
          <label>Välj fråga:</label>
          <select value={selectedQuestion} onChange={handleQuestionChange}>
            <option value="all">Alla</option>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.question.slice(0, 50)}...
              </option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>Välj frågetyp:</label>
          <select value={selectedQType} onChange={handleQTypeChange}>
            <option value="all">Alla</option>
            {qTypes.map((qt) => (
              <option key={qt.id} value={qt.id}>
                {qt.name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>Välj kurs:</label>
          <select value={selectedCourse} onChange={handleCourseChange}>
            <option value="all">Alla</option>
            {courses.map((c) => (
              <option key={c.course_code} value={c.course_code}>
                {c.course_code}: {c.course_name}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-item">
          <label>Aggregationsintervall:</label>
          <select value={aggregation} onChange={handleAggregationChange}>
            <option value="daily">Daglig</option>
            <option value="weekly">Veckovis</option>
            <option value="monthly">Månadsvis</option>
          </select>
        </div>
      </div>

      {/* Date Pickers */}
      <div className="filter-section date-filter">
        <div className="filter-item">
          <label>Startdatum:</label>
          <input type="date" value={startDate} onChange={handleStartDateChange} />
        </div>
        <div className="filter-item">
          <label>Slutdatum:</label>
          <input type="date" value={endDate} onChange={handleEndDateChange} />
        </div>
      </div>

      {/* Single Range Slider */}
      {globalMinTs && globalMaxTs ? (
        <div className="slider-section">
          <div className="slider-labels">
            <span>Från: {startDate || globalMinDate}</span>
            <span>Till: {endDate || globalMaxDate}</span>
          </div>
          <div className="slider-element">
            <Slider
              range
              min={globalMinTs}
              max={globalMaxTs}
              value={sliderRange}
              onChange={handleSliderChange}
              onAfterChange={handleSliderAfterChange}
              marks={sliderMarks}
              tipFormatter={(val) => formatDate(new Date(val))}
            />
          </div>
        </div>
      ) : (
        <p>Laddar slider...</p>
      )}

      {/* Charts */}
      {loading ? (
        <p>Laddar data...</p>
      ) : aggData.length === 0 ? (
        <p>Inga data finns att visa.</p>
      ) : (
        <div className="charts-grid">
          <div className="chart-card">
            <h3>{chartTitle}</h3>
            <div className="chart-wrapper">
              <ResponsiveContainer>
                <LineChart 
                  data={aggData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="answer_date" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval="preserveStartEnd"
                    minTickGap={10}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                  <Line type="monotone" dataKey="correct_count" stroke="#0088FE" name="Korrekt" />
                  <Line type="monotone" dataKey="wrong_count" stroke="#FF8042" name="Fel" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="chart-card">
            <h3>Totaler</h3>
            <div className="chart-wrapper pie-chart-wrapper">
              <ResponsiveContainer>
                <PieChart margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, 'Antal']} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataVis;
