import { createContext, useCallback, useContext, useMemo, useState } from "react";

const STORAGE_ADMIN = "pls_admin";
const STORAGE_STUDENT = "pls_student";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [adminLoggedIn, setAdminLoggedIn] = useState(
    () => sessionStorage.getItem(STORAGE_ADMIN) === "true"
  );
  const [student, setStudent] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_STUDENT);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const loginAdmin = useCallback((username, password) => {
    if (username === "admin" && password === "adminpass") {
      sessionStorage.setItem(STORAGE_ADMIN, "true");
      setAdminLoggedIn(true);
      return true;
    }
    return false;
  }, []);

  const logoutAdmin = useCallback(() => {
    sessionStorage.removeItem(STORAGE_ADMIN);
    setAdminLoggedIn(false);
  }, []);

  const loginStudent = useCallback((studentData) => {
    sessionStorage.setItem(STORAGE_STUDENT, JSON.stringify(studentData));
    setStudent(studentData);
  }, []);

  const logoutStudent = useCallback(() => {
    sessionStorage.removeItem(STORAGE_STUDENT);
    setStudent(null);
  }, []);

  const value = useMemo(
    () => ({
      adminLoggedIn,
      student,
      loginAdmin,
      logoutAdmin,
      loginStudent,
      logoutStudent,
      isAuthenticated: adminLoggedIn || !!student,
    }),
    [adminLoggedIn, student, loginAdmin, logoutAdmin, loginStudent, logoutStudent]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
