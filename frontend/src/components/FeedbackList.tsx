import { useState } from "react";
import type { FeedbackRecord, FeedbackStatus } from "../types/feedback";

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  new: "New",
  triaged: "Triaged",
  actioned: "Actioned",
  wont_fix: "Won't fix",
};

const STATUS_BADGE_CLASS: Record<FeedbackStatus, string> = {
  new: "locked",
  triaged: "resolved",
  actioned: "released",
  wont_fix: "refunded",
};

/// Every status short of the current one is offered as a one-click
/// transition — this is an open MVP with no auth yet, so anyone viewing
/// the dashboard can triage, same as anyone can lock/release an escrow.
/// See docs/FEEDBACK.md's roadmap note before this handles real volume.
const NEXT_STATUSES: FeedbackStatus[] = ["triaged", "actioned", "wont_fix"];

export function FeedbackList({
  feedback,
  loading,
  onUpdateStatus,
}: {
  feedback: FeedbackRecord[];
  loading: boolean;
  onUpdateStatus?: (id: string, status: FeedbackStatus) => Promise<unknown>;
}) {
  if (loading) {
    return <p className="empty-state">Loading feedback…</p>;
  }

  if (feedback.length === 0) {
    return <p className="empty-state">No feedback yet — be the first.</p>;
  }

  return (
    <div className="escrow-list">
      {[...feedback].reverse().map((item) => (
        <FeedbackCard key={item.id} item={item} onUpdateStatus={onUpdateStatus} />
      ))}
    </div>
  );
}

function FeedbackCard({
  item,
  onUpdateStatus,
}: {
  item: FeedbackRecord;
  onUpdateStatus?: (id: string, status: FeedbackStatus) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);

  async function transition(status: FeedbackStatus) {
    if (!onUpdateStatus) return;
    setBusy(true);
    try {
      await onUpdateStatus(item.id, status);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="escrow-row">
        <div>
          <strong>{"★".repeat(item.rating)}</strong>
          <span style={{ color: "var(--text-muted)" }}>
            {"★".repeat(5 - item.rating)}
          </span>
        </div>
        <span className={`badge badge-${STATUS_BADGE_CLASS[item.status]}`}>
          {STATUS_LABEL[item.status]}
        </span>
      </div>
      <p style={{ margin: "0.5rem 0" }}>{item.message}</p>
      <div className="escrow-meta">
        <span>{new Date(item.createdAt).toLocaleString()}</span>
        {item.walletAddress && <span>from {item.walletAddress.slice(0, 16)}…</span>}
      </div>

      {onUpdateStatus && (
        <div className="actions" style={{ marginTop: "0.6rem" }}>
          {NEXT_STATUSES.filter((status) => status !== item.status).map((status) => (
            <button
              key={status}
              type="button"
              disabled={busy}
              onClick={() => transition(status)}
            >
              Mark {STATUS_LABEL[status].toLowerCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
