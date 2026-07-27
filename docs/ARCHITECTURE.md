# Architecture

## Why milestone escrow, and why the contract comes first

Cross-border freelance work has a trust problem in both directions: buyers
don't want to pay upfront for undelivered work, sellers don't want to
deliver work they might never get paid for. StellarVault removes the need
to trust either party (or StellarVault itself) by locking each milestone's
payment in a Cardano smart contract that only releases funds under one of
three explicit, signature-checked conditions.

That contract — [`contracts/validators/escrow.ak`](../contracts/validators/escrow.ak)
— is the privacy/security-critical core of the product, which is why it
was built and tested before any backend or UI code existed. Everything
else in this repo is a convenience layer on top of it; none of it can
override what the validator allows.

## System overview

```mermaid
flowchart LR
    subgraph Client
        UI[React dashboard]
        Wallet[CIP-30 wallet\n(Eternl / Lace / Nami)]
    end

    subgraph Service
        API[Express API]
        Store[(JSON escrow store)]
    end

    subgraph Cardano Preprod
        Validator[Escrow validator\n(Aiken / Plutus V3)]
        Ledger[(UTxOs)]
    end

    UI -- connect --> Wallet
    UI -- REST --> API
    API -- reads/writes --> Store
    API -- builds & submits txs via Lucid --> Ledger
    Ledger -- enforced by --> Validator
```

## On-chain: the escrow validator

**Datum** (`contracts/lib/stellar_vault/types.ak`) — the minimal state
needed to authorize a spend:

| Field               | Type         | Meaning                              |
| ------------------- | ------------ | ------------------------------------- |
| `buyer`              | `ByteArray` | payment key hash of the buyer         |
| `seller`             | `ByteArray` | payment key hash of the seller        |
| `arbiter`            | `ByteArray` | payment key hash of the arbiter       |
| `milestone_amount`   | `Int`       | lovelace owed for this milestone      |
| `deadline`           | `Int`       | POSIX ms after which a refund unlocks |

**Redeemer** — the three ways the locked UTxO can be spent:

- `Release` — requires the **buyer**'s signature; the transaction must
  pay at least `milestone_amount` lovelace to the **seller**.
- `Refund` — requires the **buyer**'s signature *and* a transaction
  validity range starting at or after `deadline`; pays the buyer back.
- `Resolve { pay_seller }` — requires the **arbiter**'s signature; pays
  the named amount to whichever side `pay_seller` selects. This exists so
  a disputed escrow always has a path to finality instead of being
  permanently stuck.

Everything about *why* a milestone was approved or disputed (scope,
deliverables, chat history) is intentionally **not** part of the datum —
it's either irrelevant to enforcement or something the parties may not
want permanently public on an immutable ledger. The validator only ever
needs to know *who* signed and *where the money went*.

See [`contracts/README.md`](../contracts/README.md) for build/test commands.

## Off-chain: backend

`backend/` is a thin Express service with one job: translate REST calls
into Lucid-built, Blockfrost-submitted transactions against the validator
above, and keep a local record of what it believes on-chain state to be.

- `src/lib/onchain.ts` — the only module that talks to Blockfrost/Lucid.
  Exposes `lockFunds`, `releaseFunds`, `refundFunds`, `resolveFunds`.
- `src/routes/escrow.ts` — REST routes, depending on `onchain.ts` through
  a narrow `OnChainPort` interface so route logic (validation, status
  transitions, error handling) is unit-testable without a real wallet or
  network call. See `backend/tests/escrow.routes.test.ts`.
- `src/lib/store.ts` — JSON-file-backed record of escrows. This store is
  a convenience cache, never a source of truth — the ledger is.
- `src/routes/feedback.ts` + `src/lib/feedbackStore.ts` — the feedback
  loop's collection endpoint (`POST /feedback`, `GET /feedback`,
  `PATCH /feedback/:id/status`). Same file-store pattern as escrows;
  see `docs/FEEDBACK.md` for the triage process built on top of it.
  `POST /feedback`, the settlement routes, and `POST /escrows` are all
  rate-limited (`src/lib/rateLimit.ts`, a minimal in-memory per-IP
  sliding window) — feedback because it's open and unauthenticated,
  escrow mutations because each one is a real on-chain transaction paid
  for by the shared service wallet. `DELETE /feedback/:id` handles
  spam/abuse moderation.
- `src/lib/csv.ts` — a small RFC-4180-ish serializer used by
  `GET /feedback/export.csv`; not a general-purpose library, just enough
  for exporting our own typed records.
- `src/routes/stats.ts` — `GET /stats`, a live aggregate over the escrow
  and feedback stores (never its own persisted state, so it can't drift
  from what those two endpoints show).

The backend is deliberately not the source of truth for fund custody: if
the JSON file were lost entirely, the actual locked funds and who can
move them are still fully determined by the UTxOs and the validator.

## Client: frontend

`frontend/` is a Vite + React dashboard:

- `hooks/useWallet.ts` — connects a CIP-30 wallet (Eternl, Lace, Nami,
  Flint, …) to read the connected user's address.
- `hooks/useEscrows.ts` + `lib/api.ts` — talk to the backend's REST API.
- `components/EscrowForm.tsx` — create a new milestone escrow.
- `components/EscrowCard.tsx` / `EscrowList.tsx` — show status and expose
  the release/refund/resolve actions, gated by escrow status.

The frontend never builds or signs transactions itself in this MVP — that
happens on the backend via the service wallet. A natural next step (see
"Roadmap" in the root README) is moving transaction *building* to the
frontend and having the connected wallet sign directly, removing the
backend's custody of a signing key entirely.

## Deployment topology

- **Contract**: compiled by `aiken build` into `contracts/plutus.json`,
  then deployed (its address derived and verified) via
  `scripts/deploy-preprod.ts` against Cardano **Preprod**.
- **Backend**: any Node host reachable over HTTPS (Fly.io, Render,
  Railway, a VM — see `docs/SETUP.md`).
- **Frontend**: built statically and published to GitHub Pages by
  [`.github/workflows/deploy-frontend.yml`](../.github/workflows/deploy-frontend.yml)
  on every push to `main`.
