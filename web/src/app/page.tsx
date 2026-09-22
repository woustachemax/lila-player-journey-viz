"use client";

import { useEffect, useMemo, useState } from "react";
import { IndexData, Journey, MapData } from "@/lib/types";
import { loadIndex, loadMapData } from "@/lib/loadData";
import { buildJourneysByMatch, buildMatchSummaries, pickDefaultMatch } from "@/lib/journeys";
import Sidebar from "@/components/Sidebar";
import MapCanvas from "@/components/MapCanvas";
import Legend from "@/components/Legend";

export default function Home() {
  const [index, setIndex] = useState<IndexData | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [journeysByMatch, setJourneysByMatch] = useState<Map<number, Journey[]> | null>(null);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadIndex()
      .then((data) => {
        setIndex(data);
        setSelectedMapId(data.maps[0]?.id ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    if (!index || !selectedMapId) return;
    const meta = index.maps.find((m) => m.id === selectedMapId);
    if (!meta) return;
    let cancelled = false;
    loadMapData(meta.data)
      .then((data) => {
        if (cancelled) return;
        setMapData(data);
        setJourneysByMatch(buildJourneysByMatch(data));
        setSelectedMatchIndex(pickDefaultMatch(data.matches));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [index, selectedMapId]);

  const mapMeta = useMemo(
    () => index?.maps.find((m) => m.id === selectedMapId) ?? null,
    [index, selectedMapId],
  );

  const mapDataReady = mapData !== null && mapData.map === selectedMapId;

  const currentJourneys = useMemo(() => {
    if (!journeysByMatch || selectedMatchIndex === null || !mapDataReady) return [];
    return journeysByMatch.get(selectedMatchIndex) ?? [];
  }, [journeysByMatch, selectedMatchIndex, mapDataReady]);

  const matchSummaries = useMemo(() => {
    if (!journeysByMatch || !index) return new Map();
    return buildMatchSummaries(journeysByMatch, index.events);
  }, [journeysByMatch, index]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-red-400 text-sm">
        Failed to load data: {error}
      </div>
    );
  }

  if (!index || !mapMeta || !mapData || !mapDataReady || selectedMatchIndex === null) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-400 text-sm">
        Loading player journeys…
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <header className="shrink-0 border-b border-zinc-800 px-4 py-2.5">
        <h1 className="text-sm font-semibold text-zinc-100">Player Journey Viewer</h1>
        <p className="text-xs text-zinc-500">{mapMeta.label} · match {selectedMatchIndex + 1} of {mapData.matches.length}</p>
      </header>
      <div className="flex flex-1 min-h-0">
        <Sidebar
          maps={index.maps}
          selectedMapId={mapMeta.id}
          onSelectMap={setSelectedMapId}
          matches={mapData.matches}
          summaries={matchSummaries}
          selectedMatchIndex={selectedMatchIndex}
          onSelectMatch={setSelectedMatchIndex}
        />
        <main className="relative flex-1 min-w-0 bg-zinc-900">
          <MapCanvas
            key={mapMeta.id}
            imageSrc={mapMeta.image}
            imageWidth={mapMeta.width}
            imageHeight={mapMeta.height}
            journeys={currentJourneys}
            eventNames={index.events}
          />
          <Legend />
        </main>
      </div>
    </div>
  );
}
