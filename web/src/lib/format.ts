import { MatchSummary } from "./journeys";

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDurationLong(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
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
  const { playerKills, botKills, killedByPlayer, killedByBot, stormDeaths, loot } = summary;
  const parts: string[] = [];
  if (playerKills > 0) parts.push(`${playerKills} player kill${playerKills === 1 ? "" : "s"}`);
  if (botKills > 0) parts.push(`${botKills} bot kill${botKills === 1 ? "" : "s"}`);
  if (killedByPlayer > 0) parts.push(`${killedByPlayer} killed by player`);
  if (killedByBot > 0) parts.push(`${killedByBot} killed by bot`);
  if (stormDeaths > 0) parts.push(`${stormDeaths} storm death${stormDeaths === 1 ? "" : "s"}`);
  if (loot > 0) parts.push(`${loot} loot`);
  return parts.length > 0 ? parts.join(" · ") : "no notable events";
}
