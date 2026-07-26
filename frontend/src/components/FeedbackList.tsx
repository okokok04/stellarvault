import type { FeedbackRecord } from "../types/feedback";

const STATUS_LABEL: Record<FeedbackRecord["status"], string> = {
  new: "New",
  triaged: "Triaged",
  actioned: "Actioned",
  wont_fix: "Won't fix",
};

export function FeedbackList({
  feedback,
  loading,
}: {
  feedback: FeedbackRecord[];
  loading: boolean;
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
        <div className="card" key={item.id}>
          <div className="escrow-row">
            <div>
              <strong>{"★".repeat(item.rating)}</strong>
              <span style={{ color: "var(--text-muted)" }}>
                {"★".repeat(5 - item.rating)}
              </span>
            </div>
            <span className={`badge badge-${item.status === "actioned" ? "released" : item.status === "wont_fix" ? "refunded" : item.status === "triaged" ? "resolved" : "locked"}`}>
              {STATUS_LABEL[item.status]}
            </span>
          </div>
          <p style={{ margin: "0.5rem 0" }}>{item.message}</p>
          <div className="escrow-meta">
            <span>{new Date(item.createdAt).toLocaleString()}</span>
            {item.walletAddress && <span>from {item.walletAddress.slice(0, 16)}…</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
