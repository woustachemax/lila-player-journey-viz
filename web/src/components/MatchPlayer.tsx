"use client";

import { useEffect, useMemo, useState } from "react";
import { EventName, Journey, MapMeta } from "@/lib/types";
import { buildJourneyMarkers, sortByPriority } from "@/lib/markers";
import { buildTracks, maxJourneyTime } from "@/lib/playback";
import { DEFAULT_PLAYBACK_SPEED, PlaybackClock, PlaybackSpeed } from "@/lib/playbackClock";
import MapCanvas from "./MapCanvas";
import Timeline from "./Timeline";

interface MatchPlayerProps {
  mapMeta: MapMeta;
  journeys: Journey[];
  eventNames: EventName[];
  matchKey: string;
  matchDuration: number;
}

const STEP_SECONDS = 5;

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA";
}

export default function MatchPlayer({
  mapMeta,
  journeys,
  eventNames,
  matchKey,
  matchDuration,
}: MatchPlayerProps) {
  const [speed, setSpeed] = useState<PlaybackSpeed>(DEFAULT_PLAYBACK_SPEED);

  const duration = useMemo(
    () => Math.max(matchDuration, maxJourneyTime(journeys)),
    [matchDuration, journeys],
  );

  const clock = useMemo(() => new PlaybackClock(matchKey, duration), [matchKey, duration]);

  const tracks = useMemo(
    () => buildTracks(journeys, eventNames, mapMeta.width, mapMeta.height),
    [journeys, eventNames, mapMeta.width, mapMeta.height],
  );

  const markers = useMemo(() => {
    const all = journeys.flatMap((j) =>
      buildJourneyMarkers(j, eventNames, mapMeta.width, mapMeta.height),
    );
    return sortByPriority(all);
  }, [journeys, eventNames, mapMeta.width, mapMeta.height]);

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
        />
      </div>
      <Timeline clock={clock} markers={markers} speed={speed} onSpeedChange={setSpeed} />
    </main>
  );
}
