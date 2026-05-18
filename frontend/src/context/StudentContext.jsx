import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const StudentContext = createContext(null);

export function StudentProvider({ children }) {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadStudents() {
      setLoading(true);
      setError(null);
      try {
        const list = await api.students();
        if (cancelled) return;
        setStudents(list);
        setSelectedStudentId((prev) => {
          if (prev && list.some((s) => s.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load students");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadStudents();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const value = useMemo(
    () => ({
      students,
      selectedStudentId,
      selectedStudent,
      setSelectedStudentId,
      loading,
      error,
    }),
    [students, selectedStudentId, selectedStudent, loading, error]
  );

  return (
    <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
  );
}

export function useStudent() {
  const ctx = useContext(StudentContext);
  if (!ctx) {
    throw new Error("useStudent must be used within StudentProvider");
  }
  return ctx;
}
