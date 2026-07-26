import type { CreateEscrowInput, EscrowRecord } from "../types/escrow";
import type { FeedbackInput, FeedbackRecord } from "../types/feedback";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : `Request to ${path} failed with status ${res.status}`,
    );
  }

  return res.json() as Promise<T>;
}

export const api = {
  listEscrows: () => request<EscrowRecord[]>("/escrows"),

  getEscrow: (id: string) => request<EscrowRecord>(`/escrows/${id}`),

  createEscrow: (input: CreateEscrowInput) =>
    request<EscrowRecord>("/escrows", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  releaseEscrow: (id: string) =>
    request<EscrowRecord>(`/escrows/${id}/release`, { method: "POST" }),

  refundEscrow: (id: string) =>
    request<EscrowRecord>(`/escrows/${id}/refund`, { method: "POST" }),

  resolveEscrow: (id: string, paySeller: boolean) =>
    request<EscrowRecord>(`/escrows/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ paySeller }),
    }),

  listFeedback: () => request<FeedbackRecord[]>("/feedback"),

  submitFeedback: (input: FeedbackInput) =>
    request<FeedbackRecord>("/feedback", {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
