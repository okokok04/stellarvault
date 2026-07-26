export interface PlatformStats {
  totalEscrows: number;
  escrowsByStatus: Record<string, number>;
  totalLovelaceLocked: number;
  totalFeedback: number;
  averageRating: number | null;
}
