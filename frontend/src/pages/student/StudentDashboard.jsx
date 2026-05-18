import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import QuizPerformanceChart from "../../components/charts/QuizPerformanceChart";
import RecommendationStatsChart from "../../components/charts/RecommendationStatsChart";
import StudentProgressChart from "../../components/charts/StudentProgressChart";
import WeakTopicChart from "../../components/charts/WeakTopicChart";
import ErrorAlert from "../../components/ErrorAlert";
import InsightCard from "../../components/InsightCard";
import { DashboardSkeleton } from "../../components/skeletons/Skeleton";
import { useStudentAnalytics } from "../../hooks/useStudentAnalytics";
import {
  buildQuizPerformanceData,
  buildStudentInsights,
  buildStudentProgressData,
  buildStudentRecommendationSummary,
  buildWeakTopicDistribution,
} from "../../utils/analytics";

export default function StudentDashboard() {
  const { student, logoutStudent } = useAuth();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [latestResult, setLatestResult] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  const {
    data: analytics,
    loading: analyticsLoading,
    error: analyticsError,
    reload: reloadAnalytics,
  } = useStudentAnalytics(student?.id);

  useEffect(() => {
    if (student?.id) loadPageData();
  }, [student?.id]);

  async function loadPageData() {
    setPageLoading(true);
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
      setPageLoading(false);
    }
  }

  const insights = useMemo(() => {
    if (!analytics) return null;
    return buildStudentInsights(
      analytics.results,
      analytics.weakTopics,
      analytics.recommendations
    );
  }, [analytics]);

  const charts = useMemo(() => {
    if (!analytics) return null;
    return {
      quizPerformance: buildQuizPerformanceData(analytics.results),
      weakTopics: buildWeakTopicDistribution(analytics.weakTopics),
      recSummary: buildStudentRecommendationSummary(analytics.recommendations),
      progress: buildStudentProgressData(analytics.results),
    };
  }, [analytics]);

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

  const loading = pageLoading || (analyticsLoading && !analytics);

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
          <h1>Welcome, {student?.name}</h1>
          <p>Your personalized learning dashboard with AI insights</p>
        </motion.div>
        <motion.div
          className="header-actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          <button type="button" className="btn btn--secondary" onClick={handleLogout}>
            Logout
          </button>
          <button type="button" className="btn btn--danger" onClick={handleDeleteAccount}>
            Delete Account
          </button>
        </motion.div>
      </header>

      {error && <p className="form-error">{error}</p>}
      {analyticsError && (
        <ErrorAlert message={analyticsError} onRetry={reloadAnalytics} />
      )}

      {loading && <DashboardSkeleton />}

      {!loading && (
        <>
          <motion.article
            className="quiz-hero-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span className="badge">15 Questions</span>
              <h2>{quiz?.title || "Programming Assessment"}</h2>
              <p>{quiz?.description}</p>
              {latestResult && (
                <p className="muted">
                  Last attempt: {latestResult.score}% ({latestResult.correct_count}/
                  {latestResult.total_questions} correct)
                </p>
              )}
            </motion.div>
            <Link to="/student/quiz" className="btn btn--primary btn--lg">
              {latestResult ? "Retake Quiz" : "Start Quiz"}
            </Link>
          </motion.article>

          {analytics && insights && charts && (
            <>
              <section className="insight-grid" aria-label="Your AI insights">
                <InsightCard
                  title="Weakest topic"
                  value={insights.mostWeakTopic}
                  subtitle={`Score: ${insights.mostWeakScore}`}
                  icon="△"
                  accent="danger"
                  index={0}
                />
                <InsightCard
                  title="Your average score"
                  value={`${insights.avgPerformance}%`}
                  subtitle={`${insights.attemptCount} quiz attempt${insights.attemptCount !== 1 ? "s" : ""}`}
                  icon="◈"
                  accent="info"
                  index={1}
                />
                <InsightCard
                  title="Weak topics flagged"
                  value={insights.weakCount}
                  subtitle={insights.weakCount ? "Focus on these areas" : "Great performance!"}
                  icon="!"
                  accent="warning"
                  index={2}
                />
                <InsightCard
                  title="Recommendations"
                  value={insights.totalRecs}
                  subtitle={`${insights.unreadRecs} unread`}
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
                  <h3>Quiz progress</h3>
                  <p className="chart-panel__sub">Scores per attempt — red below 60%</p>
                  <QuizPerformanceChart data={charts.quizPerformance} />
                </motion.article>

                <motion.article
                  className="chart-panel"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <h3>Weak topics</h3>
                  <p className="chart-panel__sub">Topics below 60% average</p>
                  <WeakTopicChart data={charts.weakTopics} />
                </motion.article>

                <motion.article
                  className="chart-panel"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h3>Recommendation summary</h3>
                  <p className="chart-panel__sub">Read vs unread</p>
                  <RecommendationStatsChart data={charts.recSummary} />
                </motion.article>

                <motion.article
                  className="chart-panel"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <h3>Score history</h3>
                  <p className="chart-panel__sub">Performance trend over time</p>
                  <StudentProgressChart data={charts.progress} />
                </motion.article>
              </section>
            </>
          )}

          <motion.div
            className="dashboard-grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
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
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
