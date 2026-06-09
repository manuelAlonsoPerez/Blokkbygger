export function formatTime(isoString: string | null): string {
  if (!isoString) return "\u2014";
  return new Date(isoString).toLocaleTimeString("nb-NO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
