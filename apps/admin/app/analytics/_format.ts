export function formatDuration(seconds: number): string {
  if (!seconds) return "under a second";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 1000) / 10}%`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}
