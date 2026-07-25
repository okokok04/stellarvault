export type EscrowStatus = "locked" | "released" | "refunded" | "resolved";

export interface EscrowRecord {
  id: string;
  buyerAddress: string;
  sellerAddress: string;
  arbiterAddress: string;
  milestoneAmountLovelace: number;
  deadlineUnixMs: number;
  status: EscrowStatus;
  scriptAddress: string;
  lockTxHash: string;
  settleTxHash?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEscrowInput {
  buyerAddress: string;
  sellerAddress: string;
  arbiterAddress: string;
  milestoneAmountLovelace: number;
  deadlineUnixMs: number;
}
