import type { EscrowRecord } from "../types/escrow";
import { EscrowCard } from "./EscrowCard";

export function EscrowList({
  escrows,
  loading,
  onRelease,
  onRefund,
  onResolve,
}: {
  escrows: EscrowRecord[];
  loading: boolean;
  onRelease: (id: string) => Promise<unknown>;
  onRefund: (id: string) => Promise<unknown>;
  onResolve: (id: string, paySeller: boolean) => Promise<unknown>;
}) {
  if (loading) {
    return <p className="empty-state">Loading escrows…</p>;
  }

  if (escrows.length === 0) {
    return (
      <p className="empty-state">
        No escrows yet. Create one above to lock the first milestone payment.
      </p>
    );
  }

  return (
    <div className="escrow-list">
      {[...escrows].reverse().map((escrow) => (
        <EscrowCard
          key={escrow.id}
          escrow={escrow}
          onRelease={onRelease}
          onRefund={onRefund}
          onResolve={onResolve}
        />
      ))}
    </div>
  );
}
