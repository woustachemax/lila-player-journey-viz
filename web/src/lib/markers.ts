import { EventName, Journey } from "./types";
import { EVENT_STYLES, MarkerShape } from "./eventStyles";

export type MarkerKind =
  | "start"
  | "loot"
  | "botKill"
  | "playerKill"
  | "extracted"
  | "killedByBot"
  | "killedByPlayer"
  | "stormDeath";

export const MARKER_PRIORITY: MarkerKind[] = [
  "start",
  "loot",
  "botKill",
  "playerKill",
  "extracted",
  "killedByBot",
  "killedByPlayer",
  "stormDeath",
];

export function markerPriorityRank(kind: MarkerKind): number {
  return MARKER_PRIORITY.indexOf(kind);
}

export interface MarkerInfo {
  x: number;
  y: number;
  markerKind: MarkerKind;
  label: string;
  color: string;
  shape: MarkerShape;
  size: number;
  alpha: number;
  t: number;
  playerId: string;
  kind: "human" | "bot";
  flag: boolean;
}

export const START_MARKER_STYLE = { label: "Journey start", color: "#e5e7eb", shape: "hollowCircle" as MarkerShape };
export const EXTRACTED_MARKER_STYLE = { label: "Extracted safely", color: "#0891b2", shape: "square" as MarkerShape };

const EVENT_TO_MARKER_KIND: Partial<Record<EventName, MarkerKind>> = {
  Loot: "loot",
  BotKill: "botKill",
  Kill: "playerKill",
  BotKilled: "killedByBot",
  Killed: "killedByPlayer",
  KilledByStorm: "stormDeath",
};

const DEATH_KINDS = new Set<MarkerKind>(["killedByBot", "killedByPlayer", "stormDeath"]);

export function buildJourneyMarkers(
  journey: Journey,
  eventNames: EventName[],
  imageWidth: number,
  imageHeight: number,
): MarkerInfo[] {
  if (journey.kind !== "human" || journey.points.length === 0) return [];

  const toXY = (pt: { u: number; v: number }) => ({
    x: pt.u * imageWidth,
    y: (1 - pt.v) * imageHeight,
  });

  const markers: MarkerInfo[] = [];
  let hasDeath = false;

  journey.points.forEach((pt) => {
    const name = eventNames[pt.e];
    const markerKind = EVENT_TO_MARKER_KIND[name];
    const style = EVENT_STYLES[name];
    if (!markerKind || !style) return;
    if (DEATH_KINDS.has(markerKind)) hasDeath = true;
    const { x, y } = toXY(pt);
    markers.push({
      x,
      y,
      markerKind,
      label: style.label,
      color: style.color,
      shape: style.shape,
      size: markerKind === "loot" ? 4 : 6,
      alpha: markerKind === "loot" ? 0.65 : 1,
      t: pt.t,
      playerId: journey.playerId,
      kind: journey.kind,
      flag: journey.flag,
    });
  });

  const first = journey.points[0];
  const firstXY = toXY(first);
  markers.push({
    x: firstXY.x,
    y: firstXY.y,
    markerKind: "start",
    label: START_MARKER_STYLE.label,
    color: START_MARKER_STYLE.color,
    shape: START_MARKER_STYLE.shape,
    size: 5,
    alpha: 1,
    t: first.t,
    playerId: journey.playerId,
    kind: journey.kind,
    flag: journey.flag,
  });

  if (!hasDeath) {
    const last = journey.points[journey.points.length - 1];
    const lastXY = toXY(last);
    markers.push({
      x: lastXY.x,
      y: lastXY.y,
      markerKind: "extracted",
      label: EXTRACTED_MARKER_STYLE.label,
      color: EXTRACTED_MARKER_STYLE.color,
      shape: EXTRACTED_MARKER_STYLE.shape,
      size: 6,
      alpha: 1,
      t: last.t,
      playerId: journey.playerId,
      kind: journey.kind,
      flag: journey.flag,
    });
  }

  return markers;
}

export function sortByPriority(markers: MarkerInfo[]): MarkerInfo[] {
  return [...markers].sort((a, b) => markerPriorityRank(a.markerKind) - markerPriorityRank(b.markerKind));
}

export function findStackedTopMarkers(markers: MarkerInfo[], radius: number): Set<number> {
  const tops = new Set<number>();
  for (let i = 0; i < markers.length; i++) {
    let hasNeighbor = false;
    let isTop = true;
    for (let j = 0; j < markers.length; j++) {
      if (i === j) continue;
      const dist = Math.hypot(markers[i].x - markers[j].x, markers[i].y - markers[j].y);
      if (dist > radius) continue;
      hasNeighbor = true;
      const rankI = markerPriorityRank(markers[i].markerKind);
      const rankJ = markerPriorityRank(markers[j].markerKind);
      if (rankJ > rankI || (rankJ === rankI && j > i)) {
        isTop = false;
      }
    }
    if (hasNeighbor && isTop) tops.add(i);
  }
  return tops;
}
