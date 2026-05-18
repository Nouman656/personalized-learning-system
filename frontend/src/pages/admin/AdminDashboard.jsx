import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function AdminDashboard() {
  const { logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    setError("");
    try {
      const data = await api.adminStudents();
      setStudents(data);
      if (data.length && !selectedId) {
        setSelectedId(data[0].id);
        loadReport(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadReport(id) {
    setReportLoading(true);
    try {
      const data = await api.adminStudentReport(id);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setReportLoading(false);
    }
  }

  function handleSelect(id) {
    setSelectedId(id);
    loadReport(id);
  }

  function handleLogout() {
    logoutAdmin();
    navigate("/login");
  }

  return (
    <div className="app-page">
      <header className="app-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Monitor students, quiz performance, and recommendations</p>
        </div>
        <button type="button" className="btn btn--secondary" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="stat-grid stat-grid--compact">
        <article className="stat-card stat-card--indigo">
          <span className="stat-card__label">Total Students</span>
          <span className="stat-card__value">{students.length}</span>
        </article>
        <article className="stat-card stat-card--amber">
          <span className="stat-card__label">With Weak Topics</span>
          <span className="stat-card__value">
            {students.filter((s) => s.weak_topic_count > 0).length}
          </span>
        </article>
        <article className="stat-card stat-card--teal">
          <span className="stat-card__label">Total Recommendations</span>
          <span className="stat-card__value">
            {students.reduce((a, s) => a + s.recommendation_count, 0)}
          </span>
        </article>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <p className="loading-text">Loading students…</p>}

      {!loading && (
        <div className="admin-layout">
          <section className="panel">
            <h3>All Students</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Attempts</th>
                  <th>Latest</th>
                  <th>Weak</th>
                  <th>Recs</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.id}
                    className={selectedId === s.id ? "row--selected" : ""}
                    onClick={() => handleSelect(s.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{s.name}</td>
                    <td>{s.quiz_attempts}</td>
                    <td>{s.latest_score != null ? `${s.latest_score}%` : "—"}</td>
                    <td>{s.weak_topic_count}</td>
                    <td>{s.recommendation_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="panel">
            <h3>Student Report</h3>
            {reportLoading && <p className="loading-text">Loading report…</p>}
            {report && !reportLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="report-name">{report.student.name}</p>

                <h4>Quiz Attempts ({report.quiz_attempts.length})</h4>
                {report.quiz_attempts.length === 0 ? (
                  <p className="muted">No attempts yet.</p>
                ) : (
                  report.quiz_attempts.map((a) => (
                    <div className="report-block" key={a.id}>
                      <strong>
                        Score: {a.score}% ({a.correct_count}/{a.total_questions})
                      </strong>
                      <span className="muted">
                        {new Date(a.completed_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}

                <h4>Weak Topics</h4>
                {report.weak_topics.length === 0 ? (
                  <p className="muted">None</p>
                ) : (
                  <ul className="tag-list">
                    {report.weak_topics.map((t) => (
                      <li key={t.topic_id} className="weak-badge">
                        {t.topic_name} ({t.average_score}%)
                      </li>
                    ))}
                  </ul>
                )}

                <h4>Recommendations</h4>
                {report.recommendations.length === 0 ? (
                  <p className="muted">None</p>
                ) : (
                  <ul className="rec-list-simple">
                    {report.recommendations.map((r) => (
                      <li key={r.id}>{r.reason}</li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
