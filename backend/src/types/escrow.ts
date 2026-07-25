export type EscrowStatus = "locked" | "released" | "refunded" | "resolved";

export interface EscrowInput {
  buyerAddress: string;
  sellerAddress: string;
  arbiterAddress: string;
  milestoneAmountLovelace: number;
  deadlineUnixMs: number;
}

export interface EscrowRecord extends EscrowInput {
  id: string;
  status: EscrowStatus;
  scriptAddress: string;
  lockTxHash: string;
  settleTxHash?: string;
  createdAt: string;
  updatedAt: string;
}
