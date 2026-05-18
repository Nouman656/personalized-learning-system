import { motion } from "framer-motion";
import {
  getRecommendationPriority,
  PRIORITY_META,
} from "../utils/analytics";

export default function RecommendationCard({ rec, weakTopicNames, index = 0 }) {
  const priority = getRecommendationPriority(rec, weakTopicNames);
  const meta = PRIORITY_META[priority];
  const isWeakTopic = weakTopicNames.has(rec.topic_name || "");

  return (
    <motion.article
      className={`rec-card-v2 rec-card-v2--${priority}${isWeakTopic ? " rec-card-v2--weak-topic" : ""}${rec.is_read ? " rec-card-v2--read" : ""}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ y: -4 }}
      style={{ "--priority-color": meta.color }}
    >
      <header className="rec-card-v2__header">
        <div>
          <span className={`priority-badge ${meta.className}`}>{meta.label}</span>
          {isWeakTopic && <span className="weak-badge">Weak topic</span>}
          {!rec.is_read && <span className="badge badge--new">New</span>}
        </div>
        <h3>{rec.topic_name || `Topic ${rec.topic_id}`}</h3>
      </header>

      <p className="rec-card-v2__reason">{rec.reason}</p>

      {rec.content_title && (
        <p className="rec-card-v2__content">
          <span>Suggested resource</span>
          <strong>{rec.content_title}</strong>
        </p>
      )}

      <footer className="rec-card-v2__footer">
        <time dateTime={rec.created_at}>
          {new Date(rec.created_at).toLocaleString()}
        </time>
      </footer>
    </motion.article>
  );
}
