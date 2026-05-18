import { motion } from "framer-motion";
import { api } from "../api/client";
import WeakTopicChart from "../components/charts/WeakTopicChart";
import ErrorAlert from "../components/ErrorAlert";
import PageHeader from "../components/PageHeader";
import StudentSelector from "../components/StudentSelector";
import { SkeletonCard } from "../components/skeletons/Skeleton";
import { useStudent } from "../context/StudentContext";
import { useFetch } from "../hooks/useFetch";
import { buildWeakTopicDistribution } from "../utils/analytics";

export default function WeakTopics() {
  const { selectedStudentId, selectedStudent } = useStudent();

  const { data: weakTopics, loading, error, reload } = useFetch(
    () => (selectedStudentId ? api.weakTopics(selectedStudentId) : Promise.resolve([])),
    [selectedStudentId]
  );

  const chartData = buildWeakTopicDistribution(weakTopics || []);

  return (
    <div className="page">
      <PageHeader
        title="Weak Topics"
        subtitle={
          selectedStudent
            ? `Topics averaging below 60% for ${selectedStudent.name}`
            : "Select a student"
        }
      >
        <StudentSelector />
      </PageHeader>

      {loading && (
        <div className="weak-page-grid">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <div className="chart-panel chart-panel--wide">
            <h3>Weak topic distribution</h3>
            <WeakTopicChart data={chartData} />
          </div>

          {weakTopics?.length === 0 ? (
            <p className="empty-state panel">No weak topics — excellent performance!</p>
          ) : (
            <div className="weak-grid">
              {weakTopics.map((topic, i) => (
                <motion.article
                  key={topic.topic_id}
                  className="weak-card weak-card--highlight"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="weak-card__badge">Below 60%</div>
                  <h3>{topic.topic_name}</h3>
                  <dl>
                    <div>
                      <dt>Average score</dt>
                      <dd className="score-low">{topic.average_score}%</dd>
                    </div>
                    <div>
                      <dt>Attempts</dt>
                      <dd>{topic.attempt_count}</dd>
                    </div>
                    <div>
                      <dt>Course ID</dt>
                      <dd>{topic.course_id}</dd>
                    </div>
                  </dl>
                </motion.article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
