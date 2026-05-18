import { motion } from "framer-motion";
import { api } from "../api/client";
import ErrorAlert from "../components/ErrorAlert";
import PageHeader from "../components/PageHeader";
import StudentSelector from "../components/StudentSelector";
import { SkeletonTable } from "../components/skeletons/Skeleton";
import { useStudent } from "../context/StudentContext";
import { useFetch } from "../hooks/useFetch";

export default function QuizResults() {
  const { selectedStudentId, selectedStudent } = useStudent();

  const { data: results, loading, error, reload } = useFetch(
    () => (selectedStudentId ? api.quizResults(selectedStudentId) : Promise.resolve([])),
    [selectedStudentId]
  );

  return (
    <div className="page">
      <PageHeader
        title="Quiz Results"
        subtitle={
          selectedStudent
            ? `Assessment history for ${selectedStudent.name}`
            : "Select a student"
        }
      >
        <StudentSelector />
      </PageHeader>

      {loading && <SkeletonTable rows={6} />}
      {error && <ErrorAlert message={error} onRetry={reload} />}

      {!loading && !error && (
        <motion.div
          className="table-card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Quiz</th>
                <th>Score</th>
                <th>Status</th>
                <th>Completed</th>
              </tr>
            </thead>
            <tbody>
              {results?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No quiz results for this student.
                  </td>
                </tr>
              ) : (
                results.map((r) => (
                  <tr key={r.id} className={r.is_weak_topic ? "row--weak" : ""}>
                    <td>{r.id}</td>
                    <td>Quiz #{r.quiz_id}</td>
                    <td>
                      <span
                        className={`score-pill ${r.score < 60 ? "score-pill--low" : "score-pill--ok"}`}
                      >
                        {r.score}%
                      </span>
                    </td>
                    <td>
                      {r.is_weak_topic ? (
                        <span className="weak-badge">Weak</span>
                      ) : (
                        <span className="ok-badge">Pass</span>
                      )}
                    </td>
                    <td>{new Date(r.completed_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
