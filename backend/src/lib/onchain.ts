import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Blockfrost,
  credentialToAddress,
  Data,
  Lucid,
  paymentCredentialOf,
  validatorToAddress,
  type LucidEvolution,
  type SpendingValidator,
} from "@lucid-evolution/lucid";
import { config } from "../config.js";
import type { EscrowInput } from "../types/escrow.js";

/// Off-chain glue between the Express API and the Aiken validator in
/// `contracts/`. This is the only module that talks to Blockfrost / the
/// ledger — every route handler goes through the functions below so the
/// on-chain surface area stays in one place and stays mockable in tests.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BLUEPRINT_PATH = path.resolve(
  __dirname,
  "../../../contracts/plutus.json",
);
const VALIDATOR_TITLE = "escrow.escrow.spend";
const NETWORK = "Preprod" as const;

const DatumSchema = Data.Object({
  buyer: Data.Bytes(),
  seller: Data.Bytes(),
  arbiter: Data.Bytes(),
  milestone_amount: Data.Integer(),
  deadline: Data.Integer(),
});
type OnChainDatum = Data.Static<typeof DatumSchema>;
// lucid-evolution's TypeBox-based Data API needs the schema value passed
// back in as its own static type tag — this cast is the documented idiom.
const OnChainDatum = DatumSchema as unknown as OnChainDatum;

const RedeemerSchema = Data.Enum([
  Data.Literal("Release"),
  Data.Literal("Refund"),
  Data.Object({ Resolve: Data.Object({ pay_seller: Data.Boolean() }) }),
]);
type OnChainRedeemer = Data.Static<typeof RedeemerSchema>;
const OnChainRedeemer = RedeemerSchema as unknown as OnChainRedeemer;

let lucidPromise: Promise<LucidEvolution> | null = null;

export function getLucid(): Promise<LucidEvolution> {
  if (!lucidPromise) {
    const cfg = config();
    lucidPromise = Lucid(
      new Blockfrost(
        "https://cardano-preprod.blockfrost.io/api/v0",
        cfg.blockfrostProjectId,
      ),
      NETWORK,
    ).then((lucid) => {
      lucid.selectWallet.fromSeed(cfg.walletSeed);
      return lucid;
    });
  }
  return lucidPromise;
}

function loadValidator(): SpendingValidator {
  const blueprint = JSON.parse(readFileSync(BLUEPRINT_PATH, "utf-8")) as {
    validators: { title: string; compiledCode: string }[];
  };
  const compiled = blueprint.validators.find(
    (validator) => validator.title === VALIDATOR_TITLE,
  );
  if (!compiled) {
    throw new Error(
      `Validator "${VALIDATOR_TITLE}" not found in contracts/plutus.json. ` +
        "Run `aiken build` in contracts/ first.",
    );
  }
  return { type: "PlutusV3", script: compiled.compiledCode };
}

export function getScriptAddress(): string {
  return validatorToAddress(NETWORK, loadValidator());
}

export async function lockFunds(
  input: EscrowInput,
): Promise<{ lockTxHash: string; scriptAddress: string }> {
  const lucid = await getLucid();
  const scriptAddress = getScriptAddress();

  const datum: OnChainDatum = {
    buyer: paymentCredentialOf(input.buyerAddress).hash,
    seller: paymentCredentialOf(input.sellerAddress).hash,
    arbiter: paymentCredentialOf(input.arbiterAddress).hash,
    milestone_amount: BigInt(input.milestoneAmountLovelace),
    deadline: BigInt(input.deadlineUnixMs),
  };

  const tx = await lucid
    .newTx()
    .pay.ToContract(
      scriptAddress,
      { kind: "inline", value: Data.to<OnChainDatum>(datum, OnChainDatum) },
      { lovelace: BigInt(input.milestoneAmountLovelace) },
    )
    .complete();

  const signed = await tx.sign.withWallet().complete();
  const lockTxHash = await signed.submit();

  return { lockTxHash, scriptAddress };
}

/// Every escrow locked by this validator shares the same script address
/// (it isn't parameterized per-escrow), so more than one escrow's UTxO
/// can sit there at once. `lockTxHash` — recorded off-chain when the
/// escrow was created — disambiguates which one this settlement targets.
async function findEscrowUtxo(
  lucid: LucidEvolution,
  scriptAddress: string,
  lockTxHash: string,
) {
  const utxos = await lucid.utxosAt(scriptAddress);
  const utxo = utxos.find((candidate) => candidate.txHash === lockTxHash);
  if (!utxo) {
    throw new Error(
      `No unspent UTxO from tx ${lockTxHash} found at ${scriptAddress} ` +
        "(already settled, or not yet confirmed)",
    );
  }
  return utxo;
}

/// The validator checks `extra_signatories` (a transaction's declared
/// *required* signers), which is a separate concept from the wallet
/// witness that actually signs the tx. Lucid only populates that field
/// when told to via `addSignerKey` — omitting it means `signed_by`
/// always sees an empty list and every settlement path fails on-chain.
function requiredSignerFor(
  redeemer: OnChainRedeemer,
  datum: OnChainDatum,
): string {
  if (redeemer === "Release" || redeemer === "Refund") {
    return datum.buyer;
  }
  return datum.arbiter;
}

/// `Release` and `Resolve` are only valid on-chain if a transaction
/// output actually pays the milestone amount to the right key hash (see
/// `paid_at_least` in contracts/lib/stellar_vault/utils.ak) — the
/// datum only stores key hashes, so we rebuild a stake-less address to
/// pay from each one. `Refund` has no such requirement in the validator,
/// but paying the buyer is still the only sensible off-chain behavior.
function payeeAddressFor(redeemer: OnChainRedeemer, datum: OnChainDatum): string {
  const hash =
    redeemer === "Release"
      ? datum.seller
      : redeemer === "Refund"
        ? datum.buyer
        : redeemer.Resolve.pay_seller
          ? datum.seller
          : datum.buyer;
  return credentialToAddress(NETWORK, { type: "Key", hash });
}

async function settle(
  scriptAddress: string,
  lockTxHash: string,
  redeemer: OnChainRedeemer,
): Promise<string> {
  const lucid = await getLucid();
  const validator = loadValidator();
  const utxo = await findEscrowUtxo(lucid, scriptAddress, lockTxHash);

  if (!utxo.datum) {
    throw new Error(`UTxO at ${scriptAddress} has no inline datum`);
  }
  const datum = Data.from<OnChainDatum>(utxo.datum, OnChainDatum);

  const tx = await lucid
    .newTx()
    .collectFrom([utxo], Data.to<OnChainRedeemer>(redeemer, OnChainRedeemer))
    .pay.ToAddress(payeeAddressFor(redeemer, datum), {
      lovelace: datum.milestone_amount,
    })
    .addSignerKey(requiredSignerFor(redeemer, datum))
    .attach.SpendingValidator(validator)
    .complete();

  const signed = await tx.sign.withWallet().complete();
  return signed.submit();
}

export function releaseFunds(
  scriptAddress: string,
  lockTxHash: string,
): Promise<string> {
  return settle(scriptAddress, lockTxHash, "Release");
}

export function refundFunds(
  scriptAddress: string,
  lockTxHash: string,
): Promise<string> {
  return settle(scriptAddress, lockTxHash, "Refund");
}

export function resolveFunds(
  scriptAddress: string,
  lockTxHash: string,
  paySeller: boolean,
): Promise<string> {
  return settle(scriptAddress, lockTxHash, { Resolve: { pay_seller: paySeller } });
}
