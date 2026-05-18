import { motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "./Navbar";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="app-shell">
      <Navbar />
      <main className="main-content">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}
