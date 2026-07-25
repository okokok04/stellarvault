import type { EscrowStatus } from "../types/escrow";

const LABELS: Record<EscrowStatus, string> = {
  locked: "Locked",
  released: "Released",
  refunded: "Refunded",
  resolved: "Resolved",
};

export function StatusBadge({ status }: { status: EscrowStatus }) {
  return <span className={`badge badge-${status}`}>{LABELS[status]}</span>;
}
