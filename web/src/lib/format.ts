import { MatchSummary } from "./journeys";

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDate(date: string): string {
  const [, month, day] = date.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[Number(month) - 1]} ${Number(day)}`;
}

export function formatMatchSummary(summary: MatchSummary): string {
  const { kills, deaths, loot } = summary;
  const parts: string[] = [];
  if (kills > 0) parts.push(`${kills} kill${kills === 1 ? "" : "s"}`);
  if (deaths > 0) parts.push(`${deaths} death${deaths === 1 ? "" : "s"}`);
  if (loot > 0) parts.push(`${loot} loot`);
  return parts.length > 0 ? parts.join(" · ") : "no notable events";
}
