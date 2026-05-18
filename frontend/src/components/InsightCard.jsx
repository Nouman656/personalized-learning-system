import { motion } from "framer-motion";

const ACCENTS = {
  danger: { border: "#f87171", glow: "rgba(248, 113, 113, 0.15)" },
  warning: { border: "#fbbf24", glow: "rgba(251, 191, 36, 0.15)" },
  success: { border: "#34d399", glow: "rgba(52, 211, 153, 0.15)" },
  info: { border: "#818cf8", glow: "rgba(129, 140, 248, 0.15)" },
};

export default function InsightCard({
  title,
  value,
  subtitle,
  icon,
  accent = "info",
  index = 0,
}) {
  const colors = ACCENTS[accent] || ACCENTS.info;

  return (
    <motion.article
      className="insight-card"
      style={{
        borderColor: colors.border,
        boxShadow: `0 0 32px ${colors.glow}`,
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className="insight-card__icon" style={{ color: colors.border }}>
        {icon}
      </div>
      <div className="insight-card__body">
        <span className="insight-card__label">{title}</span>
        <span className="insight-card__value">{value}</span>
        {subtitle && <span className="insight-card__subtitle">{subtitle}</span>}
      </div>
    </motion.article>
  );
}
