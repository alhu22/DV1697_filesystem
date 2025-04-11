import { useState } from "react";
import axios from "axios";

export default function ViewQuestion() {
    const [course, setCourse] = useState("");
    const [questionType, setQuestionType] = useState("");
    const [questionData, setQuestionData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const fetchRandomQuestion = async () => {
        setIsLoading(true);
        setErrorMessage("");
        setQuestionData(null);

        // try {
        //     const response = await axios.get("http://localhost:5000/api/question/random", {
        //         params: {
        //             course: course || undefined,
        //             question_type: questionType || undefined
        //         }
        //     });

        //     if (response.data.success) {
        //         const formatted = generateQuestion(
        //             rawQuestion.question,
        //             rawQuestion.variatingValues,
        //         );

        //         setQuestionData({
        //             formattedQuestion: formatted.formattedQuestion,
        //             computedAnswer: formatted.values
        //         });
        //     } else {
        //         setErrorMessage(response.data.message || "No question found.");
        //     }
        // } catch (err) {
        //     setErrorMessage(err.response?.data?.message || "Failed to fetch question. Try again.");
        // } finally {
        //     setIsLoading(false);
        // }
    };

    /**
     * Generate a formatted question with computed answer.
     * @param {string} questionTemplate - The question template with placeholders.
     * @param {Object} variatingValues - The possible values for variables.
     * @returns {Object} An object with formattedQuestion and the computed answer.
     */
    const generateQuestion = (questionTemplate, variatingValues) => {
        let formattedQuestion = questionTemplate;

    
        // Replace variables with random values
        for (const [variable, values] of Object.entries(variatingValues)) {
            if (Array.isArray(values) && values.length == 2) {
                const randomValue = Math.floor(Math.random() * (values[1] - values[0] + 1)) + values[0];
                selectedValues[variable] = randomValue;
                formattedQuestion = formattedQuestion.replaceAll(`%%${variable}%%`, randomValue);
            }
        }
    
        // Compute the answer
        try {
            const formulaWithValues = answerFormula.replace(/var_\d+/g, match => selectedValues[match] || 0);
            computedAnswer = eval(formulaWithValues); // Safe eval usage for controlled inputs
        } catch (error) {
            console.error("Error evaluating answer formula:", error);
        }
    
        return { formattedQuestion, values: selectedValues };
    };
    

    return (
        <div style={{ padding: "20px", border: "1px solid #ddd", borderRadius: "8px", width: "400px", boxShadow: "0px 0px 10px rgba(0,0,0,0.1)" }}>
            <h2>View Random Question</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label>Course</label>
                <input type="text" 
                    value={course} 
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="Ex. ab1234" />

                <label>Question Type</label>
                <input type="text" 
                    value={questionType} 
                    onChange={(e) => setQuestionType(e.target.value)}
                    placeholder="Ex. test type A" />

                <button 
                    onClick={fetchRandomQuestion} 
                    disabled={isLoading}
                    style={{ 
                        padding: "10px", 
                        backgroundColor: "#007BFF", 
                        color: "white", 
                        border: "none", 
                        borderRadius: "5px", 
                        cursor: "pointer" }}>
                    {isLoading ? "Loading..." : "Get Question"}
                </button>

                {/* Display fetched question */}
                {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
                {questionData && (
                    <div style={{ marginTop: "20px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px", backgroundColor: "#f9f9f9" }}>
                        <p><strong>Question:</strong> {questionData.question || "N/A"}</p>
                        <p><strong>Answer Formula:</strong> {questionData.answerFormula || "N/A"}</p>
                        <p><strong>Unit:</strong> {questionData.answerUnit || "N/A"}</p>
                        <p><strong>Course:</strong> {questionData.course || "N/A"}</p>
                        <p><strong>Type:</strong> {questionData.question_type || "N/A"}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
