import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import QuizPerformanceChart from "../components/charts/QuizPerformanceChart";
import RecommendationStatsChart from "../components/charts/RecommendationStatsChart";
import StudentProgressChart from "../components/charts/StudentProgressChart";
import WeakTopicChart from "../components/charts/WeakTopicChart";
import ErrorAlert from "../components/ErrorAlert";
import InsightCard from "../components/InsightCard";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import StudentSelector from "../components/StudentSelector";
import { DashboardSkeleton } from "../components/skeletons/Skeleton";
import { useStudent } from "../context/StudentContext";
import { useAnalytics } from "../hooks/useAnalytics";
import {
  buildQuizPerformanceData,
  buildRecommendationStats,
  buildStudentProgressData,
  buildWeakTopicDistribution,
  computeAveragePerformance,
  countTotalRecommendations,
  findMostWeakTopic,
  findStudentsNeedingAttention,
} from "../utils/analytics";

export default function Dashboard() {
  const { selectedStudentId, selectedStudent } = useStudent();
  const { data, loading, error, reload } = useAnalytics(selectedStudentId);

  const insights = useMemo(() => {
    if (!data) return null;
    const needing = findStudentsNeedingAttention(
      data.students,
      data.weakTopicsByStudent
    );
    const mostWeak = findMostWeakTopic(data.allWeakFlat);
    return {
      avgPerformance: computeAveragePerformance(data.allResults),
      mostWeakTopic: mostWeak?.topic_name ?? "None",
      mostWeakScore: mostWeak ? `${mostWeak.average_score}%` : "—",
      needingCount: needing.length,
      needingNames: needing.map((s) => s.name.split(" ")[0]).join(", ") || "None",
      totalRecs: countTotalRecommendations(data.recommendationsByStudent),
    };
  }, [data]);

  const charts = useMemo(() => {
    if (!data) return null;
    return {
      quizPerformance: buildQuizPerformanceData(data.selectedResults),
      weakTopics: buildWeakTopicDistribution(data.selectedWeakTopics),
      recStats: buildRecommendationStats(
        data.students,
        data.recommendationsByStudent
      ),
      progress: buildStudentProgressData(data.selectedResults),
    };
  }, [data]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorAlert message={error} onRetry={reload} />;
  if (!data) return null;

  return (
    <div className="page">
      <PageHeader
        title="AI Analytics Dashboard"
        subtitle="Real-time learning insights powered by your FastAPI backend"
      >
        <StudentSelector />
      </PageHeader>

      <section className="stat-grid" aria-label="Key metrics">
        <StatCard label="Students" value={data.students.length} icon="◎" accent="indigo" index={0} />
        <StatCard label="Courses" value={data.courses.length} icon="▣" accent="violet" index={1} />
        <StatCard label="Quizzes" value={data.quizzes.length} icon="✓" accent="teal" index={2} />
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
          subtitle={`For ${selectedStudent?.name ?? "selected student"}: ${data.selectedRecommendations.length}`}
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
          <p className="chart-panel__sub">Scores per quiz — red bars below 60%</p>
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

      <section className="panel panel--quick">
        <h3>Quick navigation</h3>
        <div className="quick-links">
          <Link to="/recommendations">Recommendations →</Link>
          <Link to="/weak-topics">Weak topics →</Link>
          <Link to="/quiz-results">Quiz results →</Link>
        </div>
      </section>
    </div>
  );
}
