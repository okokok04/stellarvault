import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Blockfrost, Data, Lucid, type SpendingValidator } from "lucid-cardano";
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

const DatumSchema = Data.Object({
  buyer: Data.Bytes(),
  seller: Data.Bytes(),
  arbiter: Data.Bytes(),
  milestone_amount: Data.Integer(),
  deadline: Data.Integer(),
});
type OnChainDatum = Data.Static<typeof DatumSchema>;
// eslint-disable-next-line @typescript-eslint/no-redeclare -- documented
// lucid-cardano idiom: the schema value doubles as its own static type tag.
const OnChainDatum = DatumSchema as unknown as OnChainDatum;

const RedeemerSchema = Data.Enum([
  Data.Literal("Release"),
  Data.Literal("Refund"),
  Data.Object({ Resolve: Data.Object({ pay_seller: Data.Boolean() }) }),
]);
type OnChainRedeemer = Data.Static<typeof RedeemerSchema>;
// eslint-disable-next-line @typescript-eslint/no-redeclare
const OnChainRedeemer = RedeemerSchema as unknown as OnChainRedeemer;

let lucidPromise: Promise<Lucid> | null = null;

export function getLucid(): Promise<Lucid> {
  if (!lucidPromise) {
    const cfg = config();
    lucidPromise = Lucid.new(
      new Blockfrost(
        "https://cardano-preprod.blockfrost.io/api/v0",
        cfg.blockfrostProjectId,
      ),
      "Preprod",
    ).then((lucid) => {
      lucid.selectWalletFromSeed(cfg.walletSeed);
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
  return { type: "PlutusV2", script: compiled.compiledCode };
}

function keyHashOf(lucid: Lucid, address: string): string {
  const details = lucid.utils.getAddressDetails(address);
  if (!details.paymentCredential) {
    throw new Error(`Address has no payment credential: ${address}`);
  }
  return details.paymentCredential.hash;
}

export async function getScriptAddress(): Promise<string> {
  const lucid = await getLucid();
  return lucid.utils.validatorToAddress(loadValidator());
}

export async function lockFunds(
  input: EscrowInput,
): Promise<{ lockTxHash: string; scriptAddress: string }> {
  const lucid = await getLucid();
  const validator = loadValidator();
  const scriptAddress = lucid.utils.validatorToAddress(validator);

  const datum: OnChainDatum = {
    buyer: keyHashOf(lucid, input.buyerAddress),
    seller: keyHashOf(lucid, input.sellerAddress),
    arbiter: keyHashOf(lucid, input.arbiterAddress),
    milestone_amount: BigInt(input.milestoneAmountLovelace),
    deadline: BigInt(input.deadlineUnixMs),
  };

  const tx = await lucid
    .newTx()
    .payToContract(
      scriptAddress,
      { inline: Data.to<OnChainDatum>(datum, OnChainDatum) },
      { lovelace: BigInt(input.milestoneAmountLovelace) },
    )
    .complete();

  const signed = await tx.sign().complete();
  const lockTxHash = await signed.submit();

  return { lockTxHash, scriptAddress };
}

async function findEscrowUtxo(lucid: Lucid, scriptAddress: string) {
  const utxos = await lucid.utxosAt(scriptAddress);
  const [utxo] = utxos;
  if (!utxo) {
    throw new Error(`No UTxO found at script address ${scriptAddress}`);
  }
  return utxo;
}

async function settle(
  scriptAddress: string,
  redeemer: OnChainRedeemer,
): Promise<string> {
  const lucid = await getLucid();
  const validator = loadValidator();
  const utxo = await findEscrowUtxo(lucid, scriptAddress);

  const tx = await lucid
    .newTx()
    .collectFrom([utxo], Data.to<OnChainRedeemer>(redeemer, OnChainRedeemer))
    .attachSpendingValidator(validator)
    .complete();

  const signed = await tx.sign().complete();
  return signed.submit();
}

export function releaseFunds(scriptAddress: string): Promise<string> {
  return settle(scriptAddress, "Release");
}

export function refundFunds(scriptAddress: string): Promise<string> {
  return settle(scriptAddress, "Refund");
}

export function resolveFunds(
  scriptAddress: string,
  paySeller: boolean,
): Promise<string> {
  return settle(scriptAddress, { Resolve: { pay_seller: paySeller } });
}
