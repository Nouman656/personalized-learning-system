import { motion } from "framer-motion";

export default function ErrorAlert({ message, onRetry, title = "Unable to load data" }) {
  if (!message) return null;

  return (
    <motion.div
      className="error-alert error-alert--enhanced"
      role="alert"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <div className="error-alert__icon" aria-hidden="true">
        !
      </div>
      <div className="error-alert__content">
        <strong>{title}</strong>
        <p>{message}</p>
        <p className="error-alert__hint">
          Ensure the FastAPI backend is running at{" "}
          <code>{import.meta.env.VITE_API_URL || "http://localhost:8000"}</code>
        </p>
      </div>
      {onRetry && (
        <button type="button" className="btn btn--primary" onClick={onRetry}>
          Retry
        </button>
      )}
    </motion.div>
  );
}
