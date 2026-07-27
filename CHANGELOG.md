# Changelog

Keeping this in sync with the product is itself part of the Level 5
requirement ("keeping docs in sync with a changing product") — update
it in the same commit/PR as the change it describes, not after.

## Unreleased / Level 6 — Supermoon

- **Deadline picker fix**: real feedback ("confusing on mobile") turned
  into a shipped change — +1/+3/+7/+14 day quick-select presets in
  `EscrowForm.tsx`, native `datetime-local` picker kept as a fallback.
  First real entry in `docs/FEEDBACK.md`'s feedback → action table.
- **Escrow list filter + pagination**: status filter buttons
  (All/Locked/Released/Refunded/Resolved) and a "Show more" button
  (10 at a time) — the list was unbounded before, which doesn't scale
  once real users start creating escrows.
- **In-dashboard feedback triage**: one-click status transitions
  (triaged/actioned/won't fix) directly on each feedback card, instead
  of only via a raw `PATCH` call. No auth yet — noted in the README
  Roadmap as something to add before real volume.

## Level 5 — Full Moon

- **Feedback loop**: in-app feedback form (`POST /feedback`), a public
  "Recent feedback" list (`GET /feedback`, contact details stripped),
  and a triage status lifecycle (`PATCH /feedback/:id/status`). See
  [`docs/FEEDBACK.md`](docs/FEEDBACK.md).
- **Stats endpoint**: `GET /stats` aggregates escrow counts, total ADA
  locked, feedback count, and average rating — shown as a stat-tile row
  on the dashboard.
- **Synthetic load-test dataset**: 50 independent, freshly generated
  Preprod wallets each funded and each locking a real escrow against
  the deployed validator, via the new
  [`scripts/generate-synthetic-load.ts`](scripts/generate-synthetic-load.ts).
  Explicitly documented as *not* real users — see
  [`docs/synthetic-users.md`](docs/synthetic-users.md).
- **Bug fix**: `waitForConfirmation` replaces a blind sleep between the
  synthetic-load script's funding tx and the locks that depend on it —
  a fixed delay let coin selection see stale (already-spent) UTxOs and
  the run failed with `ConwayMempoolFailure`.
- **Rate limiting**: `POST /feedback` is capped per-IP (minimal in-memory
  sliding window, `src/lib/rateLimit.ts`) now that it's an open,
  unauthenticated endpoint on the public internet.
- **Verified end-to-end in production**, not just locally: the stats
  bar, feedback form, and public feedback list all confirmed working
  against the live GitHub Pages dashboard + Render backend (see the
  screenshot referenced in the PR/commit this line ships with); all 50
  synthetic-dataset lock transactions independently re-confirmed via
  `scripts/verify-synthetic-users.ts`.

## Level 4 — First Quarter

- MVP live on Cardano Preprod: escrow validator (Aiken/Plutus V3),
  Express + Lucid Evolution backend, React dashboard.
- CI/CD: GitHub Actions (contract check/build, backend + frontend
  lint/test/build), dashboard deployed to GitHub Pages, backend hosted
  on Render.
- Real on-chain proof: bootstrap payment, and a full lock → release
  cycle run through both the local dev server and the public API.
- Bug fixes found by testing against the real deployment rather than
  trusting a clean local build: `VerificationKeyCredential` →
  `VerificationKey` (stdlib API drift), missing `addSignerKey` (the
  validator's `signed_by` check reads a field Lucid doesn't populate by
  default), missing payment output on settlement, `lucid-cardano` →
  `lucid-evolution` migration (the former can't parse current Preprod
  protocol parameters), Vite's default absolute `base` breaking the
  GitHub Pages project-site deployment.
