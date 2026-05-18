import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import QuizPerformanceChart from "../../components/charts/QuizPerformanceChart";
import RecommendationStatsChart from "../../components/charts/RecommendationStatsChart";
import StudentProgressChart from "../../components/charts/StudentProgressChart";
import WeakTopicChart from "../../components/charts/WeakTopicChart";
import ErrorAlert from "../../components/ErrorAlert";
import InsightCard from "../../components/InsightCard";
import StatCard from "../../components/StatCard";
import { DashboardSkeleton } from "../../components/skeletons/Skeleton";
import { useAnalytics } from "../../hooks/useAnalytics";
import {
  buildQuizPerformanceData,
  buildRecommendationStats,
  buildStudentProgressData,
  buildWeakTopicDistribution,
  computeAveragePerformance,
  countTotalRecommendations,
  findMostWeakTopic,
  findStudentsNeedingAttention,
} from "../../utils/analytics";

export default function AdminDashboard() {
  const { logoutAdmin } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [report, setReport] = useState(null);
  const [tableLoading, setTableLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const [tableError, setTableError] = useState("");

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedId) ?? null,
    [students, selectedId]
  );

  const { data: analytics, loading: analyticsLoading, error: analyticsError, reload } =
    useAnalytics(selectedId);

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    setTableLoading(true);
    setTableError("");
    try {
      const data = await api.adminStudents();
      setStudents(data);
      if (data.length) {
        const firstId = data[0].id;
        setSelectedId(firstId);
        loadReport(firstId);
      }
    } catch (err) {
      setTableError(err.message);
    } finally {
      setTableLoading(false);
    }
  }

  async function loadReport(id) {
    setReportLoading(true);
    try {
      const data = await api.adminStudentReport(id);
      setReport(data);
    } catch (err) {
      setTableError(err.message);
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

  const insights = useMemo(() => {
    if (!analytics) return null;
    const needing = findStudentsNeedingAttention(
      analytics.students,
      analytics.weakTopicsByStudent
    );
    const mostWeak = findMostWeakTopic(analytics.allWeakFlat);
    return {
      avgPerformance: computeAveragePerformance(analytics.allResults),
      mostWeakTopic: mostWeak?.topic_name ?? "None",
      mostWeakScore: mostWeak ? `${mostWeak.average_score}%` : "—",
      needingCount: needing.length,
      needingNames: needing.map((s) => s.name.split(" ")[0]).join(", ") || "None",
      totalRecs: countTotalRecommendations(analytics.recommendationsByStudent),
    };
  }, [analytics]);

  const charts = useMemo(() => {
    if (!analytics) return null;
    return {
      quizPerformance: buildQuizPerformanceData(analytics.selectedResults),
      weakTopics: buildWeakTopicDistribution(analytics.selectedWeakTopics),
      recStats: buildRecommendationStats(
        analytics.students,
        analytics.recommendationsByStudent
      ),
      progress: buildStudentProgressData(analytics.selectedResults),
    };
  }, [analytics]);

  const showAnalyticsSkeleton = analyticsLoading && !analytics;

  return (
    <motion.div
      className="app-page app-page--wide"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="app-header">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1>Admin Dashboard</h1>
          <p>AI analytics, student monitoring, and detailed reports</p>
        </motion.div>
        <button type="button" className="btn btn--secondary" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {tableError && <p className="form-error">{tableError}</p>}
      {analyticsError && (
        <ErrorAlert message={analyticsError} onRetry={reload} />
      )}

      {showAnalyticsSkeleton ? (
        <DashboardSkeleton />
      ) : (
        analytics &&
        insights &&
        charts && (
          <>
            <section className="stat-grid" aria-label="Key metrics">
              <StatCard
                label="Students"
                value={analytics.students.length}
                icon="◎"
                accent="indigo"
                index={0}
              />
              <StatCard
                label="Courses"
                value={analytics.courses.length}
                icon="▣"
                accent="violet"
                index={1}
              />
              <StatCard
                label="Quizzes"
                value={analytics.quizzes.length}
                icon="✓"
                accent="teal"
                index={2}
              />
              <StatCard
                label="Recommendations"
                value={insights.totalRecs}
                icon="★"
                accent="amber"
                index={3}
              />
            </section>

            <section className="insight-grid" aria-label="AI insights">
              <InsightCard
                title="Most weak topic"
                value={insights.mostWeakTopic}
                subtitle={`Lowest avg: ${insights.mostWeakScore}`}
                icon="△"
                accent="danger"
                index={0}
              />
              <InsightCard
                title="Avg student performance"
                value={`${insights.avgPerformance}%`}
                subtitle="Across all quiz attempts"
                icon="◈"
                accent="info"
                index={1}
              />
              <InsightCard
                title="Students needing attention"
                value={insights.needingCount}
                subtitle={insights.needingNames}
                icon="!"
                accent="warning"
                index={2}
              />
              <InsightCard
                title="Total recommendations"
                value={insights.totalRecs}
                subtitle={`For ${selectedStudent?.name ?? "selected student"}: ${analytics.selectedRecommendations.length}`}
                icon="★"
                accent="success"
                index={3}
              />
            </section>

            <section className="charts-grid">
              <motion.article
                className="chart-panel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h3>Quiz performance</h3>
                <p className="chart-panel__sub">
                  {selectedStudent?.name ?? "Student"} — red bars below 60%
                </p>
                <QuizPerformanceChart data={charts.quizPerformance} />
              </motion.article>

              <motion.article
                className="chart-panel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <h3>Weak topic distribution</h3>
                <p className="chart-panel__sub">{selectedStudent?.name}</p>
                <WeakTopicChart data={charts.weakTopics} />
              </motion.article>

              <motion.article
                className="chart-panel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3>Recommendation statistics</h3>
                <p className="chart-panel__sub">Read vs unread by student</p>
                <RecommendationStatsChart data={charts.recStats} />
              </motion.article>

              <motion.article
                className="chart-panel"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h3>Student progress</h3>
                <p className="chart-panel__sub">Score trend over attempts</p>
                <StudentProgressChart data={charts.progress} />
              </motion.article>
            </section>
          </>
        )
      )}

      {tableLoading && <p className="loading-text">Loading students…</p>}

      {!tableLoading && (
        <motion.div
          className="admin-layout"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <section className="panel">
            <h3>All Students</h3>
            <p className="chart-panel__sub">Select a row to update charts and report</p>
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
                    <motion.div
                      className="report-block"
                      key={a.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <strong>
                        Score: {a.score}% ({a.correct_count}/{a.total_questions})
                      </strong>
                      <span className="muted">
                        {new Date(a.completed_at).toLocaleString()}
                      </span>
                    </motion.div>
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
        </motion.div>
      )}
    </motion.div>
  );
}
