import { EventName, MatchMeta } from "./types";
import { MarkerInfo, MarkerKind } from "./markers";

export type EventToggleKey =
  | "loot"
  | "botKill"
  | "playerKill"
  | "killedByBot"
  | "killedByPlayer"
  | "stormDeath";

export interface EventToggleDef {
  key: EventToggleKey;
  label: string;
  eventName: EventName;
}

export const EVENT_TOGGLES: EventToggleDef[] = [
  { key: "loot", label: "Loot", eventName: "Loot" },
  { key: "botKill", label: "Bot kills", eventName: "BotKill" },
  { key: "playerKill", label: "Player kills", eventName: "Kill" },
  { key: "killedByBot", label: "Killed by bot", eventName: "BotKilled" },
  { key: "killedByPlayer", label: "Killed by player", eventName: "Killed" },
  { key: "stormDeath", label: "Storm deaths", eventName: "KilledByStorm" },
];

export const PARTIAL_DATES = new Set(["2026-02-14"]);

export interface Filters {
  date: string | null;
  aggregate: boolean;
  humans: boolean;
  bots: boolean;
  events: Record<EventToggleKey, boolean>;
}

export const DEFAULT_FILTERS: Filters = {
  date: null,
  aggregate: false,
  humans: true,
  bots: true,
  events: {
    loot: true,
    botKill: true,
    playerKill: true,
    killedByBot: true,
    killedByPlayer: true,
    stormDeath: true,
  },
};

export function setAllEvents(filters: Filters, value: boolean): Filters {
  const events = { ...filters.events };
  EVENT_TOGGLES.forEach((t) => {
    events[t.key] = value;
  });
  return { ...filters, events };
}

export function matchInDate(match: MatchMeta, date: string | null): boolean {
  return date === null || match.date === date;
}

export function filterMarkers(markers: MarkerInfo[], filters: Filters): MarkerInfo[] {
  if (!filters.humans) return [];
  return markers.filter((m) => {
    if (m.markerKind === "start" || m.markerKind === "extracted") return !filters.aggregate;
    return filters.events[m.markerKind as EventToggleKey];
  });
}

export interface FilteredCounts {
  journeys: number;
  humanJourneys: number;
  botJourneys: number;
  humansIncluded: boolean;
  botsIncluded: boolean;
  kills: number | null;
  deaths: number | null;
  loot: number | null;
}

const DEATH_KINDS: MarkerKind[] = ["killedByBot", "killedByPlayer", "stormDeath"];

export function countVisible(
  humanJourneys: number,
  botJourneys: number,
  markers: MarkerInfo[],
  filters: Filters,
): FilteredCounts {
  let kills = 0;
  let deaths = 0;
  let loot = 0;
  markers.forEach((m) => {
    if (m.markerKind === "loot") loot++;
    else if (m.markerKind === "botKill" || m.markerKind === "playerKill") kills++;
    else if (DEATH_KINDS.includes(m.markerKind)) deaths++;
  });
  const e = filters.events;
  const includedHumanJourneys = filters.humans ? humanJourneys : 0;
  const includedBotJourneys = filters.bots ? botJourneys : 0;
  return {
    journeys: includedHumanJourneys + includedBotJourneys,
    humanJourneys: includedHumanJourneys,
    botJourneys: includedBotJourneys,
    humansIncluded: filters.humans,
    botsIncluded: filters.bots,
    kills: e.botKill || e.playerKill ? kills : null,
    deaths: e.killedByBot || e.killedByPlayer || e.stormDeath ? deaths : null,
    loot: e.loot ? loot : null,
  };
}
