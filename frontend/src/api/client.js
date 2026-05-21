function resolveApiBase() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  // Keep backend host aligned with the frontend host to avoid localhost/127.0.0.1 CORS mismatches.
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return "http://127.0.0.1:8000";
}

const API_BASE = resolveApiBase();

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!response.ok) {
    let detail = `Request failed: ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || (typeof body.detail === "string" ? body.detail : JSON.stringify(body));
      if (Array.isArray(detail)) detail = detail.map((d) => d.msg || d).join(", ");
    } catch {
      detail = await response.text() || detail;
    }
    throw new Error(detail);
  }
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

export const api = {
  health: () => request("/health"),

  // Student auth
  registerStudent: (name) =>
    request("/api/auth/student/register", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  loginStudent: (name) =>
    request("/api/auth/student/login", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  deleteStudent: (id) =>
    request(`/api/auth/student/${id}`, { method: "DELETE" }),

  // Students & courses (analytics)
  students: () => request("/api/students"),
  courses: () => request("/api/courses"),

  // Admin
  adminStudents: () => request("/api/admin/students"),
  adminStudentReport: (id) => request(`/api/admin/students/${id}/report`),

  // Quiz
  availableQuiz: () => request("/api/quizzes/available"),
  submitQuiz: (quizId, studentId, answers) =>
    request(`/api/quizzes/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify({ student_id: studentId, answers }),
    }),
  studentResults: (studentId) => request(`/api/quizzes/results/student/${studentId}`),
  quizResults: (studentId) => request(`/api/quizzes/results/student/${studentId}`),
  resultDetail: (resultId) => request(`/api/quizzes/results/${resultId}/detail`),

  // Recommendations
  recommendations: (studentId) => request(`/api/recommendations/student/${studentId}`),
  weakTopics: (studentId) => request(`/api/recommendations/student/${studentId}/weak-topics`),

  // Machine learning
  mlStatus: () => request("/api/ml/status"),
  mlTrain: () =>
    request("/api/ml/train", { method: "POST" }),
  mlPredict: (studentId) =>
    request(`/api/ml/predict?student_id=${studentId}`, { method: "POST" }),
  mlPredictGet: (studentId) => request(`/api/ml/predict/${studentId}`),
};
