import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function QuizPage() {
  const { student } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadQuiz();
  }, []);

  async function loadQuiz() {
    try {
      const data = await api.availableQuiz();
      setQuiz(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!quiz) return;

    const payload = quiz.questions.map((q) => ({
      question_id: q.id,
      selected_answer: answers[q.id] || "",
    }));

    const unanswered = payload.filter((a) => !a.selected_answer).length;
    if (unanswered > 0) {
      if (!confirm(`${unanswered} question(s) unanswered. Submit anyway?`)) return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await api.submitQuiz(quiz.id, student.id, payload);
      navigate("/student/results", { state: { result } });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (loading) return <p className="loading-text app-page">Loading quiz…</p>;
  if (!quiz) return <p className="form-error app-page">{error || "Quiz not found"}</p>;

  const grouped = quiz.questions.reduce((acc, q) => {
    if (!acc[q.topic_name]) acc[q.topic_name] = [];
    acc[q.topic_name].push(q);
    return acc;
  }, {});

  return (
    <div className="app-page quiz-page">
      <header className="app-header">
        <div>
          <h1>{quiz.title}</h1>
          <p>{quiz.question_count} multiple-choice questions</p>
        </div>
        <button type="button" className="btn btn--secondary" onClick={() => navigate("/student")}>
          Cancel
        </button>
      </header>

      <form onSubmit={handleSubmit}>
        {Object.entries(grouped).map(([topic, questions], ti) => (
          <section key={topic} className="quiz-topic-section">
            <h2 className="quiz-topic-title">{topic}</h2>
            {questions.map((q, qi) => (
              <motion.fieldset
                key={q.id}
                className="question-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: ti * 0.05 + qi * 0.02 }}
              >
                <legend>
                  Q{quiz.questions.findIndex((x) => x.id === q.id) + 1}. {q.question_text}
                </legend>
                <div className="options-grid">
                  {q.options.map((opt) => (
                    <label key={opt} className={`option-label${answers[q.id] === opt ? " option-label--selected" : ""}`}>
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswer(q.id, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </motion.fieldset>
            ))}
          </section>
        ))}

        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn btn--primary btn--block btn--lg" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit Quiz"}
        </button>
      </form>
    </div>
  );
}
