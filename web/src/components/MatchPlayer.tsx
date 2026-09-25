"use client";

import { useEffect, useMemo, useState } from "react";
import { MapMeta } from "@/lib/types";
import { MarkerInfo } from "@/lib/markers";
import { Track } from "@/lib/playback";
import { HeatmapGrid } from "@/lib/heatmap";
import { DEFAULT_PLAYBACK_SPEED, PlaybackClock, PlaybackSpeed } from "@/lib/playbackClock";
import MapCanvas from "./MapCanvas";
import Timeline from "./Timeline";

interface MatchPlayerProps {
  mapMeta: MapMeta;
  tracks: Track[];
  markers: MarkerInfo[];
  duration: number;
  playerKey: string;
  aggregate: boolean;
  heatmap: HeatmapGrid | null;
  heatmapOpacity: number;
}

const STEP_SECONDS = 5;

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA";
}

export default function MatchPlayer({
  mapMeta,
  tracks,
  markers,
  duration,
  playerKey,
  aggregate,
  heatmap,
  heatmapOpacity,
}: MatchPlayerProps) {
  const [speed, setSpeed] = useState<PlaybackSpeed>(DEFAULT_PLAYBACK_SPEED);

  const clock = useMemo(() => new PlaybackClock(playerKey, duration), [playerKey, duration]);

  useEffect(() => {
    clock.setSpeed(speed);
  }, [clock, speed]);

  useEffect(() => () => clock.pause(), [clock]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTextEntry(e.target)) return;
      if (e.code === "Space") {
        e.preventDefault();
        clock.toggle();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        clock.step(-STEP_SECONDS);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        clock.step(STEP_SECONDS);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTextEntry(e.target)) e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [clock]);

  return (
    <main className="flex min-w-0 flex-1 flex-col bg-zinc-900">
      <div className="relative min-h-0 flex-1">
        <MapCanvas
          key={mapMeta.id}
          imageSrc={mapMeta.image}
          imageWidth={mapMeta.width}
          imageHeight={mapMeta.height}
          tracks={tracks}
          markers={markers}
          clock={clock}
          aggregate={aggregate}
          heatmap={heatmap}
          heatmapOpacity={heatmapOpacity}
        />
      </div>
      <Timeline clock={clock} markers={markers} speed={speed} onSpeedChange={setSpeed} />
    </main>
  );
}
