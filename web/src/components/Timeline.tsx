"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import { MarkerInfo, MarkerKind } from "@/lib/markers";
import { PLAYBACK_SPEEDS, PlaybackClock, PlaybackSpeed } from "@/lib/playbackClock";
import { formatDurationLong } from "@/lib/format";

interface TimelineProps {
  clock: PlaybackClock;
  markers: MarkerInfo[];
  speed: PlaybackSpeed;
  onSpeedChange: (speed: PlaybackSpeed) => void;
}

interface Tick {
  key: string;
  t: number;
  color: string;
  label: string;
  heightPct: number;
}

const TICK_HEIGHT: Record<MarkerKind, number> = {
  start: 0,
  loot: 38,
  botKill: 66,
  playerKill: 66,
  extracted: 100,
  killedByBot: 100,
  killedByPlayer: 100,
  stormDeath: 100,
};

export default function Timeline({ clock, markers, speed, onSpeedChange }: TimelineProps) {
  const snapshot = useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getSnapshot);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);
  const resumeRef = useRef(false);

  const ticks = useMemo(() => {
    const seen = new Set<string>();
    const result: Tick[] = [];
    markers.forEach((m) => {
      if (m.markerKind === "start") return;
      const key = `${m.markerKind}:${m.t}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push({ key, t: m.t, color: m.color, label: m.label, heightPct: TICK_HEIGHT[m.markerKind] });
    });
    return result;
  }, [markers]);

  const { time, playing, duration } = snapshot;
  const ended = time >= duration;
  const progress = duration > 0 ? (time / duration) * 100 : 0;

  const seekFromPointer = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    clock.seek(fraction * duration);
  };

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    scrubbingRef.current = true;
    resumeRef.current = clock.getSnapshot().playing;
    clock.pause();
    e.currentTarget.setPointerCapture(e.pointerId);
    seekFromPointer(e.clientX);
  };

  const onTrackPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (scrubbingRef.current) seekFromPointer(e.clientX);
  };

  const onTrackPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scrubbingRef.current) return;
    scrubbingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (resumeRef.current && clock.getTime() < duration) clock.play();
  };

  const onPrimary = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (ended) clock.restart();
    else clock.toggle();
    e.currentTarget.blur();
  };

  const onRestart = (e: React.MouseEvent<HTMLButtonElement>) => {
    clock.restart();
    e.currentTarget.blur();
  };

  const primaryLabel = ended ? "Restart" : playing ? "Pause" : "Play";

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-3 text-sm">
        <button
          onClick={onPrimary}
          title="Space"
          className="w-20 rounded-md bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-500"
        >
          {primaryLabel}
        </button>
        {!ended && (
          <button
            onClick={onRestart}
            className="rounded-md bg-zinc-800 px-3 py-1.5 text-zinc-200 hover:bg-zinc-700"
          >
            Restart
          </button>
        )}
        <div className="tabular-nums text-zinc-100">
          {formatDurationLong(time)}
          <span className="text-zinc-500"> / {formatDurationLong(duration)}</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-xs uppercase tracking-wide text-zinc-500">Speed</span>
          {PLAYBACK_SPEEDS.map((s) => (
            <button
              key={s}
              onClick={(e) => {
                onSpeedChange(s);
                e.currentTarget.blur();
              }}
              className={`rounded px-2 py-1 text-xs ${
                s === speed ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Match timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        className="relative h-9 cursor-pointer touch-none select-none rounded bg-zinc-800"
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={onTrackPointerUp}
      >
        <div className="absolute inset-y-0 left-0 rounded-l bg-blue-600/25" style={{ width: `${progress}%` }} />
        {ticks.map((tick) => (
          <button
            key={tick.key}
            title={`${tick.label} · ${formatDurationLong(tick.t)}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              clock.seek(tick.t);
              e.currentTarget.blur();
            }}
            className="absolute bottom-0 flex h-full w-[7px] -translate-x-1/2 items-end justify-center"
            style={{ left: `${duration > 0 ? (tick.t / duration) * 100 : 0}%` }}
          >
            <span className="block w-[2px] rounded-sm" style={{ height: `${tick.heightPct}%`, backgroundColor: tick.color }} />
          </button>
        ))}
        <div
          className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white"
          style={{ left: `${progress}%` }}
        >
          <div className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-white" />
        </div>
      </div>
    </div>
  );
}
