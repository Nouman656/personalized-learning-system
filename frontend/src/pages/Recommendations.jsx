import { useMemo } from "react";
import { motion } from "framer-motion";
import { api } from "../api/client";
import ErrorAlert from "../components/ErrorAlert";
import PageHeader from "../components/PageHeader";
import RecommendationCard from "../components/RecommendationCard";
import StudentSelector from "../components/StudentSelector";
import { SkeletonCard } from "../components/skeletons/Skeleton";
import { useStudent } from "../context/StudentContext";
import { useFetch } from "../hooks/useFetch";

export default function Recommendations() {
  const { selectedStudentId, selectedStudent } = useStudent();

  const { data, loading, error, reload } = useFetch(async () => {
    if (!selectedStudentId) return { recommendations: [], weakTopics: [] };
    const [recommendations, weakTopics] = await Promise.all([
      api.recommendations(selectedStudentId),
      api.weakTopics(selectedStudentId),
    ]);
    return { recommendations, weakTopics };
  }, [selectedStudentId]);

  const weakTopicNames = useMemo(
    () => new Set((data?.weakTopics || []).map((t) => t.topic_name)),
    [data?.weakTopics]
  );

  const sorted = useMemo(() => {
    const list = data?.recommendations || [];
    return [...list].sort((a, b) => Number(a.is_read) - Number(b.is_read));
  }, [data?.recommendations]);

  return (
    <div className="page">
      <PageHeader
        title="Personalized Recommendations"
        subtitle={
          selectedStudent
            ? `AI-generated study plan for ${selectedStudent.name}`
            : "Select a student to view recommendations"
        }
      >
        <StudentSelector />
      </PageHeader>

      {loading && (
        <div className="rec-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={reload} />}

      {!loading && !error && (
        <>
          <div className="info-banner info-banner--ai">
            <span className="pulse-dot" />
            {sorted.length} recommendation{sorted.length !== 1 ? "s" : ""} ·{" "}
            {weakTopicNames.size} weak topic{weakTopicNames.size !== 1 ? "s" : ""} flagged
          </div>

          {sorted.length === 0 ? (
            <motion.p
              className="empty-state panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              No recommendations for this student yet. Complete a quiz below 60% to
              trigger the recommendation engine.
            </motion.p>
          ) : (
            <div className="rec-grid">
              {sorted.map((rec, i) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  weakTopicNames={weakTopicNames}
                  index={i}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
