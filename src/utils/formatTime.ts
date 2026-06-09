export function formatTime(isoString: string | null): string {
  if (!isoString) return "\u2014";

  const date = new Date(isoString);
  const day = date.getDate();
  const month = date.toLocaleDateString("nb-NO", { month: "long" });
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}. ${month} ${year} kl. ${hours}:${minutes}`;
}
