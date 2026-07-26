import type { PlatformStats } from "../types/stats";

function formatAda(lovelace: number): string {
  return `${(lovelace / 1_000_000).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })} ADA`;
}

export function StatsBar({
  stats,
  loading,
}: {
  stats: PlatformStats | null;
  loading: boolean;
}) {
  if (loading || !stats) return null;

  const tiles = [
    { label: "Escrows created", value: String(stats.totalEscrows) },
    { label: "Currently locked", value: formatAda(stats.totalLovelaceLocked) },
    { label: "Feedback submissions", value: String(stats.totalFeedback) },
    {
      label: "Average rating",
      value: stats.averageRating === null ? "—" : `${stats.averageRating} / 5`,
    },
  ];

  return (
    <div className="stats-bar">
      {tiles.map((tile) => (
        <div className="stats-tile" key={tile.label}>
          <div className="stats-tile-value">{tile.value}</div>
          <div className="stats-tile-label">{tile.label}</div>
        </div>
      ))}
    </div>
  );
}
