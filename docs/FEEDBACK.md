# Feedback loop

## Collection

Two channels, both live:

1. **In-app form** — the dashboard has a "Leave feedback" section below
   the escrow list (`frontend/src/components/FeedbackForm.tsx`). Rating
   (1-5), a free-text message, and optional wallet address / contact.
   Submissions go to `POST /feedback` and show up immediately in the
   "Recent feedback" list on the same page — the loop is public by
   default, not funneled into a private inbox only the team sees.
2. **GitHub Issues** — for anything code-shaped (a bug, a concrete
   feature request), [`.github/ISSUE_TEMPLATE/`](../.github/ISSUE_TEMPLATE/)
   already covers this; point testers there for anything more detailed
   than fits in the in-app form.

`contact` is accepted so we can follow up, but the API never returns it
in list responses (`backend/src/routes/feedback.ts`) — feedback shown on
the public dashboard doesn't leak who sent it unless they chose to put
their wallet address in the message itself.

## Triage

Every submission starts at `status: "new"`. Triage (manual, for now —
see Roadmap) moves it through:

| Status | Meaning |
| --- | --- |
| `new` | not yet reviewed |
| `triaged` | reviewed, prioritized (see below), on or off the near-term list |
| `actioned` | a change shipped in response to this |
| `wont_fix` | reviewed, deliberately not acting on it — with a reason recorded in the linked issue/commit |

Triage cadence: review new feedback at least twice a week while
actively recruiting testers (see `synthetic-users.md`'s honest note
that load-testing wallets are not the same thing as tester feedback).

## Prioritization

Simple impact × effort call, made explicit instead of left implicit:

- **Impact** — how many testers hit this, and does it block the core
  loop (connect → lock → release/refund/resolve) or just polish?
- **Effort** — rough t-shirt size (S/M/L) based on which layer it
  touches: frontend-only < backend route < validator change (the last
  one also means re-deploying and updating the README's live address,
  per `contracts/README.md`'s "Changing the validator" note).

Anything blocking the core loop gets actioned regardless of effort.
Polish items are ranked by impact ÷ effort and taken in that order.

## Changelog

Traceability from feedback → action. Update this table as items get
triaged and actioned (empty until real feedback comes in):

| Date | Feedback (paraphrased) | Status | Action / link |
| --- | --- | --- | --- |
| — | — | — | — |

## Getting real testers

This is the actual Level 5 requirement — 50 real people, not the
synthetic wallet set in `docs/synthetic-users.md`. Plan:

1. **Where**: Cardano Discord (#testnet / #builders channels), the
   Cardano Forum, r/CardanoDevelopers, and a thread from the project's
   own X profile (see `demo/X_PROFILE.md`).
2. **Ask**: "Try locking and releasing a test escrow on Preprod (free
   testnet ADA, ~2 minutes), tell us what was confusing." Link straight
   to the live dashboard and to `docs/SETUP.md`'s wallet + faucet steps
   for anyone who's never used Preprod before.
3. **Track**: each tester's wallet address becomes a distinct entry in
   the escrow list at the script address — verifiable the same way
   `synthetic-users.md` is, except these interactions come from wallets
   nobody but the tester controls.
4. **Close the loop**: every response, in-app or on Discord/Forum, gets
   logged via the in-app form or a GitHub Issue so it lands in the
   triage table above — a tester should be able to see their own
   feedback listed on the dashboard.
