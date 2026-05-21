import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

/**
 * Fetches analytics for a single logged-in student (charts + insights).
 */
export function useStudentAnalytics(studentId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!studentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [results, weakTopics, recommendations, mlPredictions] = await Promise.all([
        api.studentResults(studentId).catch(() => []),
        api.weakTopics(studentId).catch(() => []),
        api.recommendations(studentId).catch(() => []),
        api.mlPredictGet(studentId).catch(() => null),
      ]);

      setData({ results, weakTopics, recommendations, mlPredictions });
    } catch (err) {
      setError(err.message || "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
