import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { loginAdmin, loginStudent } = useAuth();
  const [mode, setMode] = useState(null);
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [studentName, setStudentName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setError("");
    if (loginAdmin(adminUser, adminPass)) {
      navigate("/admin");
    } else {
      setError("Invalid admin credentials. Use admin / adminpass");
    }
  };

  const handleStudentRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const student = await api.registerStudent(studentName.trim());
      loginStudent(student);
      navigate("/student");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const student = await api.loginStudent(studentName.trim());
      loginStudent(student);
      navigate("/student");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="login-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="login-hero">
        <span className="login-hero__badge">AI Learning Platform</span>
        <h1>Personalized Learning System</h1>
        <p>Adaptive quizzes, weak-topic detection, and study recommendations.</p>
      </div>

      <div className="login-panel">
        {!mode && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h2>Choose how to continue</h2>
            <div className="role-grid">
              <button type="button" className="role-card" onClick={() => setMode("admin")}>
                <span className="role-card__icon">⚙</span>
                <strong>Admin Login</strong>
                <span>Manage students & reports</span>
              </button>
              <button type="button" className="role-card" onClick={() => setMode("student")}>
                <span className="role-card__icon">◎</span>
                <strong>Student Login</strong>
                <span>Take quizzes & learn</span>
              </button>
            </div>
          </motion.div>
        )}

        {mode === "admin" && (
          <motion.form onSubmit={handleAdminLogin} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button type="button" className="link-btn" onClick={() => { setMode(null); setError(""); }}>
              ← Back
            </button>
            <h2>Admin Login</h2>
            <label>
              Username
              <input value={adminUser} onChange={(e) => setAdminUser(e.target.value)} autoComplete="username" />
            </label>
            <label>
              Password
              <input type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} autoComplete="current-password" />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--block">Login as Admin</button>
          </motion.form>
        )}

        {mode === "student" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button type="button" className="link-btn" onClick={() => { setMode(null); setError(""); }}>
              ← Back
            </button>
            <h2>Student Access</h2>
            <label>
              Your name
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Enter your name"
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <div className="student-actions">
              <button
                type="button"
                className="btn btn--primary btn--block"
                disabled={loading || !studentName.trim()}
                onClick={handleStudentLogin}
              >
                {loading ? "Please wait…" : "Login"}
              </button>
              <button
                type="button"
                className="btn btn--secondary btn--block"
                disabled={loading || !studentName.trim()}
                onClick={handleStudentRegister}
              >
                Create Account
              </button>
            </div>
            <p className="form-hint">Names must be unique. Use the same name to log in again.</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
