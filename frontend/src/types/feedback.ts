export type FeedbackStatus = "new" | "triaged" | "actioned" | "wont_fix";

export interface FeedbackInput {
  rating: number;
  message: string;
  walletAddress?: string;
  contact?: string;
}

export interface FeedbackRecord {
  id: string;
  rating: number;
  message: string;
  walletAddress?: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}
