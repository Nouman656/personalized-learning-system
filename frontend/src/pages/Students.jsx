import { motion } from "framer-motion";
import { api } from "../api/client";
import ErrorAlert from "../components/ErrorAlert";
import PageHeader from "../components/PageHeader";
import { SkeletonTable } from "../components/skeletons/Skeleton";
import { useStudent } from "../context/StudentContext";
import { useFetch } from "../hooks/useFetch";

export default function Students() {
  const { setSelectedStudentId } = useStudent();
  const { data: students, loading, error, reload } = useFetch(() => api.students(), []);

  return (
    <div className="page">
      <PageHeader title="Students" subtitle="All registered learners" />

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
                <th>Name</th>
                <th>Email</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {students?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-state">
                    No students found. Run the backend seed script.
                  </td>
                </tr>
              ) : (
                students.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <td>{s.id}</td>
                    <td>{s.name}</td>
                    <td>{s.email}</td>
                    <td>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => setSelectedStudentId(s.id)}
                      >
                        Select
                      </button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
