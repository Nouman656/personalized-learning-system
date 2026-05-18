import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function StudentDashboard() {
  const { student, logoutStudent } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (student?.id) loadData();
  }, [student?.id]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [quizData, weak, recs, results] = await Promise.all([
        api.availableQuiz(),
        api.weakTopics(student.id),
        api.recommendations(student.id),
        api.studentResults(student.id),
      ]);
      setQuiz(quizData);
      setWeakTopics(weak);
      setRecommendations(recs);
      setLatestResult(results[0] || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm("Delete your account and all quiz data? This cannot be undone.")) return;
    try {
      await api.deleteStudent(student.id);
      logoutStudent();
      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    logoutStudent();
    navigate("/login");
  }

  return (
    <div className="app-page">
      <header className="app-header">
        <div>
          <h1>Welcome, {student?.name}</h1>
          <p>Your personalized learning dashboard</p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn--secondary" onClick={handleLogout}>
            Logout
          </button>
          <button type="button" className="btn btn--danger" onClick={handleDeleteAccount}>
            Delete Account
          </button>
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="loading-text">Loading…</p>}

      {!loading && (
        <>
          <motion.article
            className="quiz-hero-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div>
              <span className="badge">15 Questions</span>
              <h2>{quiz?.title || "Programming Assessment"}</h2>
              <p>{quiz?.description}</p>
              {latestResult && (
                <p className="muted">
                  Last attempt: {latestResult.score}% ({latestResult.correct_count}/
                  {latestResult.total_questions} correct)
                </p>
              )}
            </div>
            <Link to="/student/quiz" className="btn btn--primary btn--lg">
              {latestResult ? "Retake Quiz" : "Start Quiz"}
            </Link>
          </motion.article>

          <div className="dashboard-grid">
            <section className="panel">
              <h3>Weak Topics</h3>
              {weakTopics.length === 0 ? (
                <p className="muted">No weak topics — great work!</p>
              ) : (
                <ul className="tag-list">
                  {weakTopics.map((t) => (
                    <li key={t.topic_id} className="weak-badge">
                      {t.topic_name} — {t.average_score}%
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h3>Recommendations</h3>
              {recommendations.length === 0 ? (
                <p className="muted">Complete a quiz to receive recommendations.</p>
              ) : (
                <ul className="rec-list-simple">
                  {recommendations.slice(0, 5).map((r) => (
                    <li key={r.id}>
                      <strong>{r.topic_name}</strong>
                      <span>{r.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
              {recommendations.length > 0 && (
                <Link to="/student/results" className="panel__link">
                  View latest results →
                </Link>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
