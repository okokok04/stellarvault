import { useState } from "react";
import type { EscrowRecord } from "../types/escrow";
import { CopyButton } from "./CopyButton";
import { StatusBadge } from "./StatusBadge";

function shorten(value: string, head = 8, tail = 6): string {
  return value.length > head + tail + 1
    ? `${value.slice(0, head)}…${value.slice(-tail)}`
    : value;
}

function formatAda(lovelace: number): string {
  return `${(lovelace / 1_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} ADA`;
}

export function EscrowCard({
  escrow,
  onRelease,
  onRefund,
  onResolve,
}: {
  escrow: EscrowRecord;
  onRelease: (id: string) => Promise<unknown>;
  onRefund: (id: string) => Promise<unknown>;
  onResolve: (id: string, paySeller: boolean) => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLocked = escrow.status === "locked";
  const deadlinePassed = Date.now() >= escrow.deadlineUnixMs;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="escrow-row">
        <div>
          <StatusBadge status={escrow.status} />{" "}
          <strong>{formatAda(escrow.milestoneAmountLovelace)}</strong>
        </div>
        {isLocked && (
          <div className="actions">
            <button
              className="primary"
              disabled={busy}
              onClick={() => run(() => onRelease(escrow.id))}
            >
              Release to seller
            </button>
            <button
              className="danger"
              disabled={busy || !deadlinePassed}
              title={
                deadlinePassed
                  ? "Refund the buyer"
                  : "Available once the deadline has passed"
              }
              onClick={() => run(() => onRefund(escrow.id))}
            >
              Refund buyer
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => onResolve(escrow.id, true))}
            >
              Arbiter → seller
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => onResolve(escrow.id, false))}
            >
              Arbiter → buyer
            </button>
          </div>
        )}
      </div>

      <div className="escrow-meta">
        <span>buyer {shorten(escrow.buyerAddress)}</span>
        <span>seller {shorten(escrow.sellerAddress)}</span>
        <span>arbiter {shorten(escrow.arbiterAddress)}</span>
        <span>deadline {new Date(escrow.deadlineUnixMs).toLocaleString()}</span>
      </div>
      <div className="escrow-meta">
        <span>
          script <code className="hash">{shorten(escrow.scriptAddress)}</code>{" "}
          <CopyButton value={escrow.scriptAddress} />
        </span>
        <span>
          lock tx <code className="hash">{shorten(escrow.lockTxHash)}</code>{" "}
          <CopyButton value={escrow.lockTxHash} />
        </span>
        {escrow.settleTxHash && (
          <span>
            settle tx{" "}
            <code className="hash">{shorten(escrow.settleTxHash)}</code>{" "}
            <CopyButton value={escrow.settleTxHash} />
          </span>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
