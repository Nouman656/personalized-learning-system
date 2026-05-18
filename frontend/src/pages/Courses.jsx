import { motion } from "framer-motion";
import { api } from "../api/client";
import ErrorAlert from "../components/ErrorAlert";
import PageHeader from "../components/PageHeader";
import { SkeletonCard } from "../components/skeletons/Skeleton";
import { useFetch } from "../hooks/useFetch";

export default function Courses() {
  const { data: courses, loading, error, reload } = useFetch(() => api.courses(), []);

  return (
    <div className="page">
      <PageHeader title="Courses" subtitle="Curriculum and topic structure" />

      {loading && (
        <div className="course-grid">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {error && <ErrorAlert message={error} onRetry={reload} />}

      {!loading && !error && (
        <div className="course-grid">
          {courses?.length === 0 ? (
            <p className="empty-state">No courses found.</p>
          ) : (
            courses.map((course, i) => (
              <motion.article
                key={course.id}
                className="course-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
              >
                <h3>{course.title}</h3>
                <p>{course.description || "No description"}</p>
                <div className="course-card__topics">
                  <span className="course-card__label">
                    Topics ({course.topics?.length ?? 0})
                  </span>
                  <ul>
                    {(course.topics || []).map((topic) => (
                      <li key={topic.id}>{topic.name}</li>
                    ))}
                  </ul>
                </div>
              </motion.article>
            ))
          )}
        </div>
      )}
    </div>
  );
}
