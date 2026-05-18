import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

/**
 * Fetches analytics data for dashboard charts and AI insight cards.
 */
export function useAnalytics(selectedStudentId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!selectedStudentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [students, courses, availableQuiz] = await Promise.all([
        api.adminStudents().catch(() => api.students()),
        api.courses().catch(() => []),
        api.availableQuiz().catch(() => null),
      ]);
      const quizzes = availableQuiz ? [availableQuiz] : [];

      const studentResults = await Promise.all(
        students.map(async (s) => {
          const [results, weakTopics, recommendations] = await Promise.all([
            api.studentResults(s.id).catch(() => []),
            api.weakTopics(s.id).catch(() => []),
            api.recommendations(s.id).catch(() => []),
          ]);
          return { studentId: s.id, results, weakTopics, recommendations };
        })
      );

      const resultsByStudent = {};
      const weakTopicsByStudent = {};
      const recommendationsByStudent = {};
      const allResults = [];
      const allWeakFlat = [];

      for (const row of studentResults) {
        resultsByStudent[row.studentId] = row.results;
        weakTopicsByStudent[row.studentId] = row.weakTopics;
        recommendationsByStudent[row.studentId] = row.recommendations;
        allResults.push(...row.results);
        for (const wt of row.weakTopics) {
          allWeakFlat.push({ ...wt, studentId: row.studentId });
        }
      }

      setData({
        students,
        courses,
        quizzes,
        resultsByStudent,
        weakTopicsByStudent,
        recommendationsByStudent,
        allResults,
        allWeakFlat,
        selectedResults: resultsByStudent[selectedStudentId] || [],
        selectedWeakTopics: weakTopicsByStudent[selectedStudentId] || [],
        selectedRecommendations: recommendationsByStudent[selectedStudentId] || [],
      });
    } catch (err) {
      setError(err.message || "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedStudentId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
