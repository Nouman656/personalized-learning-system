import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminRoute, GuestRoute, StudentRoute } from "./components/ProtectedRoute";
import AdminDashboard from "./pages/admin/AdminDashboard";
import LoginPage from "./pages/LoginPage";
import QuizPage from "./pages/student/QuizPage";
import QuizResultPage from "./pages/student/QuizResultPage";
import StudentDashboard from "./pages/student/StudentDashboard";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginPage />
            </GuestRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/student"
          element={
            <StudentRoute>
              <StudentDashboard />
            </StudentRoute>
          }
        />
        <Route
          path="/student/quiz"
          element={
            <StudentRoute>
              <QuizPage />
            </StudentRoute>
          }
        />
        <Route
          path="/student/results"
          element={
            <StudentRoute>
              <QuizResultPage />
            </StudentRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
