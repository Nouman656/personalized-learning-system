import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AdminRoute({ children }) {
  const { adminLoggedIn } = useAuth();
  if (!adminLoggedIn) return <Navigate to="/login" replace />;
  return children;
}

export function StudentRoute({ children }) {
  const { student } = useAuth();
  if (!student) return <Navigate to="/login" replace />;
  return children;
}

export function GuestRoute({ children }) {
  const { adminLoggedIn, student } = useAuth();
  if (adminLoggedIn) return <Navigate to="/admin" replace />;
  if (student) return <Navigate to="/student" replace />;
  return children;
}
