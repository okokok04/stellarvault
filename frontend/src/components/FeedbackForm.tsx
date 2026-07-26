import { useState, type FormEvent } from "react";
import type { FeedbackInput } from "../types/feedback";

const EMPTY_FORM = { rating: 0, message: "", walletAddress: "", contact: "" };

export function FeedbackForm({
  onSubmit,
}: {
  onSubmit: (input: FeedbackInput) => Promise<unknown>;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (form.rating < 1 || form.rating > 5) {
      setError("Pick a rating from 1 to 5 stars.");
      return;
    }
    if (!form.message.trim()) {
      setError("Say a bit about what you tried and how it went.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        rating: form.rating,
        message: form.message.trim(),
        walletAddress: form.walletAddress.trim() || undefined,
        contact: form.contact.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2 className="section-title">Leave feedback</h2>
      <p className="empty-state" style={{ marginTop: "-0.5rem", marginBottom: "1rem" }}>
        Tried locking or settling an escrow? Tell us what was confusing,
        broken, or worked well — every submission gets triaged, see{" "}
        <a href="https://github.com/okokok04/stellarvault/blob/main/docs/FEEDBACK.md">
          docs/FEEDBACK.md
        </a>
        .
      </p>

      {error && <div className="error-banner">{error}</div>}
      {sent && !error && (
        <div className="empty-state" style={{ marginBottom: "1rem" }}>
          Thanks — logged.
        </div>
      )}

      <div className="form-grid">
        <div>
          <label htmlFor="rating">Rating (1-5)</label>
          <input
            id="rating"
            type="number"
            min="1"
            max="5"
            placeholder="5"
            value={form.rating || ""}
            onChange={(e) => setForm((p) => ({ ...p, rating: Number(e.target.value) }))}
          />
        </div>
        <div>
          <label htmlFor="walletAddress">Your wallet address (optional)</label>
          <input
            id="walletAddress"
            placeholder="addr_test1..."
            value={form.walletAddress}
            onChange={(e) => setForm((p) => ({ ...p, walletAddress: e.target.value }))}
          />
        </div>
        <div>
          <label htmlFor="contact">Contact (optional, kept private)</label>
          <input
            id="contact"
            placeholder="email or X handle"
            value={form.contact}
            onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
          />
        </div>
        <div className="field-full">
          <label htmlFor="message">What happened?</label>
          <input
            id="message"
            placeholder="e.g. the deadline picker was confusing on mobile"
            value={form.message}
            onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
          />
        </div>
      </div>

      <button className="primary" type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
