/**
 * Analytics helpers — derive chart data and AI insights from API responses.
 */

const WEAK_THRESHOLD = 60;

/** Average score across all quiz results. */
export function computeAveragePerformance(allResults) {
  if (!allResults?.length) return 0;
  const sum = allResults.reduce((acc, r) => acc + r.score, 0);
  return Math.round((sum / allResults.length) * 10) / 10;
}

/** Topic name with the lowest average score among weak-topic records. */
export function findMostWeakTopic(allWeakTopicsFlat) {
  if (!allWeakTopicsFlat?.length) return null;
  return allWeakTopicsFlat.reduce((worst, current) =>
    current.average_score < worst.average_score ? current : worst
  );
}

/** Students with at least one weak topic. */
export function findStudentsNeedingAttention(students, weakTopicsByStudent) {
  return students.filter((s) => (weakTopicsByStudent[s.id] || []).length > 0);
}

/** Total recommendation count across students. */
export function countTotalRecommendations(recommendationsByStudent) {
  return Object.values(recommendationsByStudent).reduce(
    (sum, list) => sum + (list?.length ?? 0),
    0
  );
}

/** Quiz performance bar chart data for one student. */
export function buildQuizPerformanceData(results) {
  return (results || [])
    .slice()
    .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
    .map((r, i) => ({
      name: `Quiz ${r.quiz_id}`,
      score: r.score,
      weak: r.score < WEAK_THRESHOLD,
      attempt: i + 1,
    }));
}

/** Weak topic pie / bar distribution for one student. */
export function buildWeakTopicDistribution(weakTopics) {
  return (weakTopics || []).map((t) => ({
    name: t.topic_name,
    value: Math.round(100 - t.average_score),
    score: t.average_score,
  }));
}

/** Recommendation stats: read vs unread per student. */
export function buildRecommendationStats(students, recommendationsByStudent) {
  return students.map((s) => {
    const recs = recommendationsByStudent[s.id] || [];
    const unread = recs.filter((r) => !r.is_read).length;
    return {
      name: s.name.split(" ")[0],
      total: recs.length,
      unread,
      read: recs.length - unread,
    };
  });
}

/** Single-student recommendation read/unread summary for charts. */
export function buildStudentRecommendationSummary(recommendations) {
  const list = recommendations || [];
  const unread = list.filter((r) => !r.is_read).length;
  return [
    {
      name: "You",
      total: list.length,
      unread,
      read: list.length - unread,
    },
  ];
}

/** AI insight values for a logged-in student dashboard. */
export function buildStudentInsights(results, weakTopics, recommendations) {
  const recs = recommendations || [];
  const weak = weakTopics || [];
  const mostWeak = findMostWeakTopic(weak);
  const unread = recs.filter((r) => !r.is_read).length;

  return {
    avgPerformance: computeAveragePerformance(results),
    mostWeakTopic: mostWeak?.topic_name ?? "None",
    mostWeakScore: mostWeak ? `${mostWeak.average_score}%` : "—",
    weakCount: weak.length,
    totalRecs: recs.length,
    unreadRecs: unread,
    attemptCount: results?.length ?? 0,
  };
}

/** Student progress line chart — scores over time. */
export function buildStudentProgressData(results) {
  return (results || [])
    .slice()
    .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at))
    .map((r, i) => ({
      name: `Attempt ${i + 1}`,
      score: r.score,
      date: new Date(r.completed_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));
}

/** Priority for recommendation cards. */
export function getRecommendationPriority(rec, weakTopicNames = new Set()) {
  const topicName = rec.topic_name || "";
  const isWeakTopic = weakTopicNames.has(topicName);
  const isUrgent =
    !rec.is_read &&
    (isWeakTopic || /below 60%|weak|ML model/i.test(rec.reason || ""));

  if (isUrgent) return "high";
  if (!rec.is_read) return "medium";
  return "low";
}

export const PRIORITY_META = {
  high: { label: "High", className: "priority--high", color: "#f87171" },
  medium: { label: "Medium", className: "priority--medium", color: "#fbbf24" },
  low: { label: "Low", className: "priority--low", color: "#34d399" },
};

/** Bar chart data from ML predict API response. */
export function buildMLPredictionChartData(mlResponse) {
  const preds = mlResponse?.predictions || [];
  return preds.map((p) => ({
    name: p.topic_name,
    probability: Math.round((p.probability_weak ?? 0) * 100),
    topic_score: p.topic_score,
    predicted_weak: p.predicted_weak,
    rule_weak: p.rule_weak,
  }));
}

/** Insight cards for ML section on student dashboard. */
export function buildMLInsights(mlResponse) {
  const preds = mlResponse?.predictions || [];
  const mlWeak = preds.filter((p) => p.predicted_weak);
  const highRisk = preds.filter((p) => p.probability_weak >= 0.7);
  return {
    modelTrained: mlResponse?.model_trained ?? false,
    algorithm: mlResponse?.algorithm ?? "LogisticRegression",
    mlWeakCount: mlWeak.length,
    highRiskCount: highRisk.length,
    totalTopics: preds.length,
    message: mlResponse?.message ?? "",
  };
}
