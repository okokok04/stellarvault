export interface FeedbackInput {
  rating: number;
  message: string;
  walletAddress?: string;
  contact?: string;
}

export type FeedbackStatus = "new" | "triaged" | "actioned" | "wont_fix";

export interface FeedbackRecord extends FeedbackInput {
  id: string;
  status: FeedbackStatus;
  createdAt: string;
  updatedAt: string;
}
