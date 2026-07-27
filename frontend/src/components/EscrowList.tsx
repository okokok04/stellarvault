import { useMemo, useState } from "react";
import type { EscrowRecord, EscrowStatus } from "../types/escrow";
import { EscrowCard } from "./EscrowCard";

const PAGE_SIZE = 10;

const FILTERS: Array<{ label: string; value: EscrowStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Locked", value: "locked" },
  { label: "Released", value: "released" },
  { label: "Refunded", value: "refunded" },
  { label: "Resolved", value: "resolved" },
];

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
  const [filter, setFilter] = useState<EscrowStatus | "all">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const newestFirst = [...escrows].reverse();
    return filter === "all" ? newestFirst : newestFirst.filter((e) => e.status === filter);
  }, [escrows, filter]);

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

  const visible = filtered.slice(0, visibleCount);

  function selectFilter(value: EscrowStatus | "all") {
    setFilter(value);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <>
      <div className="escrow-filters">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={filter === f.value ? "primary" : undefined}
            onClick={() => selectFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="empty-state">No escrows with that status.</p>
      ) : (
        <div className="escrow-list">
          {visible.map((escrow) => (
            <EscrowCard
              key={escrow.id}
              escrow={escrow}
              onRelease={onRelease}
              onRefund={onRefund}
              onResolve={onResolve}
            />
          ))}
        </div>
      )}

      {visibleCount < filtered.length && (
        <button
          type="button"
          style={{ marginTop: "0.75rem" }}
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
        >
          Show more ({filtered.length - visibleCount} remaining)
        </button>
      )}
    </>
  );
}
