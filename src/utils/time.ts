export const STATUS_TIMEOUTS: Record<string, number> = {
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  "8h": 8 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

export const STATUS_POLL_INTERVAL_MS = 5_000;

export function formatRelativeTimestamp(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Just now";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return "Just now";

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60)
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? "" : "s"} ago`;

  return date.toLocaleDateString();
}

export const getExpirationTime = (timeoutKey: string): number | null => {
  if (timeoutKey === "never") return null;
  const duration = STATUS_TIMEOUTS[timeoutKey];
  return duration ? Date.now() + duration : null;
};
