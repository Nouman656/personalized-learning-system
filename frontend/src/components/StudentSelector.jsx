import { motion } from "framer-motion";
import { useStudent } from "../context/StudentContext";

export default function StudentSelector({ compact = false }) {
  const {
    students,
    selectedStudentId,
    setSelectedStudentId,
    loading,
    selectedStudent,
  } = useStudent();

  if (loading) {
    return <div className="student-select student-select--skeleton" />;
  }

  return (
    <motion.label
      className={`student-select${compact ? " student-select--compact" : ""}`}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <span className="student-select__label">
        {compact ? "Student" : "Selected student"}
      </span>
      <select
        value={selectedStudentId ?? ""}
        onChange={(e) => setSelectedStudentId(Number(e.target.value))}
        disabled={!students.length}
        aria-label="Select student"
      >
        {!students.length && <option value="">No students</option>}
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {selectedStudent && !compact && (
        <span className="student-select__email">{selectedStudent.email}</span>
      )}
    </motion.label>
  );
}
