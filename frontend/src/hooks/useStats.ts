import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { PlatformStats } from "../types/stats";

export function useStats() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setStats(await api.getStats());
    } catch {
      // Stats are a nice-to-have transparency widget, not core flow --
      // fail quietly rather than blocking the page with an error banner.
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { stats, loading, refresh };
}
