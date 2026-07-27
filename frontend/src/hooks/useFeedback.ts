import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { FeedbackInput, FeedbackRecord } from "../types/feedback";

export function useFeedback() {
  const [feedback, setFeedback] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFeedback(await api.listFeedback());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feedback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submitFeedback = useCallback(async (input: FeedbackInput) => {
    const created = await api.submitFeedback(input);
    setFeedback((prev) => [...prev, created]);
    return created;
  }, []);

  const updateStatus = useCallback(
    async (id: string, status: FeedbackRecord["status"]) => {
      const updated = await api.updateFeedbackStatus(id, status);
      setFeedback((prev) => prev.map((f) => (f.id === id ? updated : f)));
      return updated;
    },
    [],
  );

  return { feedback, loading, error, refresh, submitFeedback, updateStatus };
}
