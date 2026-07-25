import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import type { CreateEscrowInput, EscrowRecord } from "../types/escrow";

export function useEscrows() {
  const [escrows, setEscrows] = useState<EscrowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEscrows(await api.listEscrows());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load escrows");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createEscrow = useCallback(
    async (input: CreateEscrowInput) => {
      const created = await api.createEscrow(input);
      setEscrows((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  const releaseEscrow = useCallback(async (id: string) => {
    const updated = await api.releaseEscrow(id);
    setEscrows((prev) => prev.map((e) => (e.id === id ? updated : e)));
  }, []);

  const refundEscrow = useCallback(async (id: string) => {
    const updated = await api.refundEscrow(id);
    setEscrows((prev) => prev.map((e) => (e.id === id ? updated : e)));
  }, []);

  const resolveEscrow = useCallback(async (id: string, paySeller: boolean) => {
    const updated = await api.resolveEscrow(id, paySeller);
    setEscrows((prev) => prev.map((e) => (e.id === id ? updated : e)));
  }, []);

  return {
    escrows,
    loading,
    error,
    refresh,
    createEscrow,
    releaseEscrow,
    refundEscrow,
    resolveEscrow,
  };
}
