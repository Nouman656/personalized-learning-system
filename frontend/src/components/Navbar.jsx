import { useState } from "react";
import { NavLink } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import StudentSelector from "./StudentSelector";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/students", label: "Students" },
  { to: "/courses", label: "Courses" },
  { to: "/quiz-results", label: "Quiz Results" },
  { to: "/weak-topics", label: "Weak Topics" },
  { to: "/recommendations", label: "Recommendations" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__brand">
          <span className="navbar__logo">AI</span>
          <div>
            <strong>Personalized Learning</strong>
            <span>Analytics Dashboard</span>
          </div>
        </div>

        <nav className="navbar__links" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `navbar__link${isActive ? " navbar__link--active" : ""}`
              }
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          <StudentSelector compact />
          <button
            type="button"
            className="navbar__toggle"
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            className="navbar__mobile"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `navbar__mobile-link${isActive ? " navbar__link--active" : ""}`
                }
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
