import { motion } from "framer-motion";

export default function PageHeader({ title, subtitle, children }) {
  return (
    <motion.header
      className="page-header"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="page-header__text">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="page-header__actions">{children}</div>}
    </motion.header>
  );
}
