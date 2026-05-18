import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";

export default function QuizResultPage() {
  const { state } = useLocation();
  const { student } = useAuth();
  const navigate = useNavigate();
  const [result, setResult] = useState(state?.result || null);
  const [weakTopics, setWeakTopics] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(!state?.result);

  useEffect(() => {
    if (!result && student?.id) {
      loadLatest();
    } else if (student?.id) {
      loadExtras();
    }
  }, [student?.id]);

  async function loadLatest() {
    try {
      const results = await api.studentResults(student.id);
      if (!results.length) {
        navigate("/student");
        return;
      }
      const detail = await api.resultDetail(results[0].id);
      setResult({
        result: results[0],
        correct_count: detail.correct_count,
        total_questions: detail.total_questions,
        topic_scores: detail.topic_scores,
        answer_details: detail.answer_details,
        weak_topics: [],
        weak_topic_details: detail.topic_scores?.filter((t) => t.is_weak) || [],
      });
    } finally {
      setLoading(false);
      loadExtras();
    }
  }

  async function loadExtras() {
    try {
      const [weak, recs] = await Promise.all([
        api.weakTopics(student.id),
        api.recommendations(student.id),
      ]);
      setWeakTopics(weak);
      setRecommendations(recs);
    } catch {
      /* optional */
    }
  }

  if (loading) return <p className="loading-text app-page">Loading results…</p>;
  if (!result) return <p className="app-page">No results found. <Link to="/student">Go back</Link></p>;

  const score = result.result?.score ?? result.score;
  const correct = result.correct_count ?? result.result?.correct_count;
  const total = result.total_questions ?? result.result?.total_questions ?? 15;
  const answers = result.answer_details || [];
  const topicScores = result.topic_scores || [];
  const weakDetails = result.weak_topic_details || topicScores.filter((t) => t.is_weak);

  return (
    <div className="app-page">
      <header className="app-header">
        <h1>Quiz Results</h1>
        <Link to="/student" className="btn btn--secondary">Dashboard</Link>
      </header>

      <motion.article
        className={`score-hero ${score < 60 ? "score-hero--weak" : "score-hero--pass"}`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <span className="score-hero__value">{score}%</span>
        <p>
          {correct} / {total} correct
        </p>
      </motion.article>

      <section className="panel">
        <h3>Topic Performance</h3>
        <div className="topic-score-grid">
          {topicScores.map((t) => (
            <div
              key={t.topic_id}
              className={`topic-score-card${t.is_weak ? " topic-score-card--weak" : ""}`}
            >
              <strong>{t.topic_name}</strong>
              <span>
                {t.correct}/{t.total} — {t.score}%
              </span>
              {t.is_weak && <span className="weak-badge">Weak</span>}
            </div>
          ))}
        </div>
      </section>

      {weakDetails.length > 0 && (
        <section className="panel panel--warn">
          <h3>Weak Topics (below 60%)</h3>
          <ul className="tag-list">
            {weakDetails.map((t) => (
              <li key={t.topic_id} className="weak-badge">
                {t.topic_name} — {t.score}%
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel">
        <h3>Answer Review</h3>
        <div className="answer-review-list">
          {answers.map((a) => (
            <div
              key={a.question_id}
              className={`answer-row${a.is_correct ? " answer-row--correct" : " answer-row--wrong"}`}
            >
              <span className="answer-row__status">{a.is_correct ? "✓" : "✗"}</span>
              <div>
                <p className="answer-row__topic">{a.topic_name}</p>
                <p>{a.question_text}</p>
                <p className="muted">Your answer: {a.selected_answer || "(none)"}</p>
                {!a.is_correct && (
                  <p className="correct-text">Correct: {a.correct_answer}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3>Personalized Recommendations</h3>
        {recommendations.length === 0 ? (
          <p className="muted">No new recommendations.</p>
        ) : (
          <ul className="rec-list-simple">
            {recommendations.map((r) => (
              <li key={r.id}>
                <strong>{r.topic_name}</strong> — {r.reason}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link to="/student/quiz" className="btn btn--primary btn--block">
        Retake Quiz
      </Link>
    </div>
  );
}
