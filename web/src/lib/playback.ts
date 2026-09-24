import { EventName, Journey } from "./types";

export const GAP_SECONDS = 30;

const DEATH_NAMES = new Set<EventName>(["Killed", "BotKilled", "KilledByStorm"]);

export interface Track {
  journey: Journey;
  times: number[];
  xs: number[];
  ys: number[];
  endTime: number;
}

export function buildTracks(
  journeys: Journey[],
  eventNames: EventName[],
  imageWidth: number,
  imageHeight: number,
): Track[] {
  const tracks: Track[] = [];
  journeys.forEach((journey) => {
    const points = journey.points;
    if (points.length === 0) return;
    let endIndex = points.length - 1;
    for (let i = 0; i < points.length; i++) {
      if (DEATH_NAMES.has(eventNames[points[i].e])) {
        endIndex = i;
        break;
      }
    }
    const times: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= endIndex; i++) {
      times.push(points[i].t);
      xs.push(points[i].u * imageWidth);
      ys.push((1 - points[i].v) * imageHeight);
    }
    tracks.push({ journey, times, xs, ys, endTime: times[endIndex] });
  });
  return tracks;
}

export function maxJourneyTime(journeys: Journey[]): number {
  let max = 0;
  journeys.forEach((journey) => {
    const last = journey.points[journey.points.length - 1];
    if (last && last.t > max) max = last.t;
  });
  return max;
}

function locate(times: number[], t: number): number {
  let lo = 0;
  let hi = times.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= t) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export function hasStarted(track: Track, t: number): boolean {
  return t >= track.times[0];
}

export function isMoving(track: Track, t: number): boolean {
  return t >= track.times[0] && t < track.endTime;
}

export function positionAt(track: Track, t: number): { x: number; y: number } | null {
  if (!isMoving(track, t)) return null;
  const { times, xs, ys } = track;
  const i = locate(times, t);
  if (i < 0) return null;
  if (i >= times.length - 1) return { x: xs[i], y: ys[i] };
  const dt = times[i + 1] - times[i];
  if (dt > GAP_SECONDS) return { x: xs[i], y: ys[i] };
  const f = (t - times[i]) / dt;
  return { x: xs[i] + (xs[i + 1] - xs[i]) * f, y: ys[i] + (ys[i + 1] - ys[i]) * f };
}

export function tracePath(ctx: CanvasRenderingContext2D, track: Track, t: number): void {
  const { times, xs, ys } = track;
  const clamped = Math.min(t, track.endTime);
  const i = locate(times, clamped);
  if (i < 0) return;
  ctx.beginPath();
  ctx.moveTo(xs[0], ys[0]);
  for (let k = 1; k <= i; k++) {
    if (times[k] - times[k - 1] > GAP_SECONDS) ctx.moveTo(xs[k], ys[k]);
    else ctx.lineTo(xs[k], ys[k]);
  }
  if (i < times.length - 1) {
    const dt = times[i + 1] - times[i];
    if (dt <= GAP_SECONDS) {
      const f = (clamped - times[i]) / dt;
      ctx.lineTo(xs[i] + (xs[i + 1] - xs[i]) * f, ys[i] + (ys[i + 1] - ys[i]) * f);
    }
  }
}

export function drawPlayerDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: "human" | "bot",
  size: number,
): void {
  ctx.beginPath();
  if (kind === "human") {
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = "#2563eb";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = size * 0.4;
  } else {
    ctx.arc(x, y, size * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = "#94a3b8";
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = size * 0.3;
  }
  ctx.fill();
  ctx.stroke();
}
