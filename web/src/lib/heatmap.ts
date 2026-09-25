import { EventName, Journey } from "./types";

export type HeatmapLayer = "off" | "traffic" | "kills" | "deaths";

export const HEATMAP_RESOLUTIONS = [32, 64, 128] as const;
export const DEFAULT_HEATMAP_RESOLUTION = 64;

export interface HeatmapSettings {
  layer: HeatmapLayer;
  opacity: number;
  resolution: number;
}

export const DEFAULT_HEATMAP_SETTINGS: HeatmapSettings = {
  layer: "off",
  opacity: 0.7,
  resolution: DEFAULT_HEATMAP_RESOLUTION,
};

export interface HeatmapGrid {
  resolution: number;
  counts: Uint32Array;
  max: number;
  total: number;
}

const TRAFFIC_NAMES = new Set<EventName>(["Position", "BotPosition"]);
const KILL_NAMES = new Set<EventName>(["Kill", "BotKill"]);
const DEATH_NAMES = new Set<EventName>(["Killed", "BotKilled", "KilledByStorm"]);

export function buildHeatmapGrid(
  journeys: Journey[],
  eventNames: EventName[],
  layer: HeatmapLayer,
  resolution: number,
): HeatmapGrid | null {
  if (layer === "off") return null;

  const counts = new Uint32Array(resolution * resolution);
  let max = 0;
  let total = 0;

  const bump = (u: number, v: number) => {
    let gx = Math.floor(u * resolution);
    let gy = Math.floor((1 - v) * resolution);
    if (gx < 0) gx = 0;
    else if (gx >= resolution) gx = resolution - 1;
    if (gy < 0) gy = 0;
    else if (gy >= resolution) gy = resolution - 1;
    const idx = gy * resolution + gx;
    const next = counts[idx] + 1;
    counts[idx] = next;
    if (next > max) max = next;
    total++;
  };

  const wanted = layer === "traffic" ? TRAFFIC_NAMES : layer === "kills" ? KILL_NAMES : DEATH_NAMES;

  journeys.forEach((journey) => {
    if (layer !== "traffic" && journey.kind !== "human") return;
    journey.points.forEach((pt) => {
      if (wanted.has(eventNames[pt.e])) bump(pt.u, pt.v);
    });
  });

  return { resolution, counts, max, total };
}

const HEAT_STOPS: [number, number, number, number][] = [
  [37, 99, 235, 0],
  [37, 99, 235, 130],
  [16, 185, 129, 165],
  [234, 179, 8, 200],
  [220, 38, 38, 235],
];

export function heatColor(t: number): [number, number, number, number] {
  if (t <= 0) return [0, 0, 0, 0];
  const clamped = Math.min(1, t);
  const pos = clamped * (HEAT_STOPS.length - 1);
  const i = Math.min(HEAT_STOPS.length - 2, Math.floor(pos));
  const f = pos - i;
  const a = HEAT_STOPS[i];
  const b = HEAT_STOPS[i + 1];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
    Math.round(a[3] + (b[3] - a[3]) * f),
  ];
}

export function heatmapCacheKey(
  mapId: string,
  date: string | null,
  humans: boolean,
  bots: boolean,
  layer: HeatmapLayer,
  resolution: number,
): string {
  return `${mapId}|${date ?? "all"}|${humans}|${bots}|${layer}|${resolution}`;
}
