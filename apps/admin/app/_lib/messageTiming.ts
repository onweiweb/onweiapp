/** Shared by the WhatsApp and SMS logs. */
export const MESSAGE_WHEN = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

/** "after 4s", "after 3 min", "after 2 h". */
export function after(from: Date, to: Date | null): string | null {
  if (!to) return null;
  const seconds = Math.max(
    0,
    Math.round((to.getTime() - from.getTime()) / 1000),
  );
  if (seconds < 60) return `after ${seconds}s`;
  if (seconds < 3600) return `after ${Math.round(seconds / 60)} min`;
  if (seconds < 172800) return `after ${Math.round(seconds / 3600)} h`;
  return `after ${Math.round(seconds / 86400)} days`;
}
