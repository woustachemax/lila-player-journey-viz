import { EventName, Journey } from "./types";
import { EVENT_STYLES, MarkerShape } from "./eventStyles";

export type MarkerLayer = "loot" | "start" | "end" | "event";

export interface MarkerInfo {
  x: number;
  y: number;
  label: string;
  color: string;
  shape: MarkerShape;
  layer: MarkerLayer;
  size: number;
  alpha: number;
  t: number;
  playerId: string;
  kind: "human" | "bot";
  flag: boolean;
}

export const MARKER_LAYER_ORDER: MarkerLayer[] = ["loot", "start", "end", "event"];

export const START_MARKER_STYLE = { label: "Journey start", color: "#e5e7eb", shape: "hollowCircle" as MarkerShape };
export const EXTRACTED_MARKER_STYLE = { label: "Extracted safely", color: "#0891b2", shape: "square" as MarkerShape };

const DEATH_EVENTS = new Set<EventName>(["Killed", "BotKilled", "KilledByStorm"]);

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

  journey.points.forEach((pt) => {
    const name = eventNames[pt.e];
    const style = EVENT_STYLES[name];
    if (!style) return;
    const { x, y } = toXY(pt);
    markers.push({
      x,
      y,
      label: style.label,
      color: style.color,
      shape: style.shape,
      layer: name === "Loot" ? "loot" : "event",
      size: name === "Loot" ? 4 : 6,
      alpha: name === "Loot" ? 0.65 : 1,
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
    label: START_MARKER_STYLE.label,
    color: START_MARKER_STYLE.color,
    shape: START_MARKER_STYLE.shape,
    layer: "start",
    size: 5,
    alpha: 1,
    t: first.t,
    playerId: journey.playerId,
    kind: journey.kind,
    flag: journey.flag,
  });

  const hasDeath = journey.points.some((pt) => DEATH_EVENTS.has(eventNames[pt.e]));
  if (!hasDeath) {
    const last = journey.points[journey.points.length - 1];
    const lastXY = toXY(last);
    markers.push({
      x: lastXY.x,
      y: lastXY.y,
      label: EXTRACTED_MARKER_STYLE.label,
      color: EXTRACTED_MARKER_STYLE.color,
      shape: EXTRACTED_MARKER_STYLE.shape,
      layer: "end",
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
