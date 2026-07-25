import { useState, type FormEvent } from "react";
import type { CreateEscrowInput } from "../types/escrow";

interface FormState {
  buyerAddress: string;
  sellerAddress: string;
  arbiterAddress: string;
  milestoneAmountAda: string;
  deadline: string;
}

const EMPTY_FORM: FormState = {
  buyerAddress: "",
  sellerAddress: "",
  arbiterAddress: "",
  milestoneAmountAda: "",
  deadline: "",
};

export function EscrowForm({
  onCreate,
  defaultBuyerAddress,
}: {
  onCreate: (input: CreateEscrowInput) => Promise<unknown>;
  defaultBuyerAddress?: string;
}) {
  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
    buyerAddress: defaultBuyerAddress ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const ada = Number(form.milestoneAmountAda);
    const deadlineMs = form.deadline ? new Date(form.deadline).getTime() : NaN;

    if (!form.buyerAddress || !form.sellerAddress || !form.arbiterAddress) {
      setError("Buyer, seller, and arbiter addresses are all required.");
      return;
    }
    if (!Number.isFinite(ada) || ada <= 0) {
      setError("Milestone amount must be a positive number of ADA.");
      return;
    }
    if (!Number.isFinite(deadlineMs) || deadlineMs <= Date.now()) {
      setError("Deadline must be a valid date in the future.");
      return;
    }

    setSubmitting(true);
    try {
      await onCreate({
        buyerAddress: form.buyerAddress,
        sellerAddress: form.sellerAddress,
        arbiterAddress: form.arbiterAddress,
        milestoneAmountLovelace: Math.round(ada * 1_000_000),
        deadlineUnixMs: deadlineMs,
      });
      setForm({ ...EMPTY_FORM, buyerAddress: defaultBuyerAddress ?? "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create escrow");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2 className="section-title">New milestone escrow</h2>

      {error && <div className="error-banner">{error}</div>}

      <div className="form-grid">
        <div>
          <label htmlFor="buyerAddress">Buyer address</label>
          <input
            id="buyerAddress"
            placeholder="addr_test1..."
            value={form.buyerAddress}
            onChange={(e) => update("buyerAddress", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="sellerAddress">Seller address</label>
          <input
            id="sellerAddress"
            placeholder="addr_test1..."
            value={form.sellerAddress}
            onChange={(e) => update("sellerAddress", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="arbiterAddress">Arbiter address</label>
          <input
            id="arbiterAddress"
            placeholder="addr_test1..."
            value={form.arbiterAddress}
            onChange={(e) => update("arbiterAddress", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="milestoneAmountAda">Milestone amount (ADA)</label>
          <input
            id="milestoneAmountAda"
            type="number"
            min="0"
            step="0.1"
            placeholder="50"
            value={form.milestoneAmountAda}
            onChange={(e) => update("milestoneAmountAda", e.target.value)}
          />
        </div>
        <div className="field-full">
          <label htmlFor="deadline">Refund deadline</label>
          <input
            id="deadline"
            type="datetime-local"
            value={form.deadline}
            onChange={(e) => update("deadline", e.target.value)}
          />
        </div>
      </div>

      <button className="primary" type="submit" disabled={submitting}>
        {submitting ? "Locking funds…" : "Lock funds in escrow"}
      </button>
    </form>
  );
}
