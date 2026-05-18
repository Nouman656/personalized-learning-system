import { motion } from "framer-motion";

export default function StatCard({ label, value, icon, accent = "indigo", index = 0 }) {
  return (
    <motion.article
      className={`stat-card stat-card--${accent}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="stat-card__icon" aria-hidden="true">
        {icon}
      </div>
      <div className="stat-card__body">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__value">{value ?? "—"}</span>
      </div>
    </motion.article>
  );
}
