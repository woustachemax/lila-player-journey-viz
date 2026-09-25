"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { IndexData, Journey, MapData } from "@/lib/types";
import { loadIndex, loadMapData } from "@/lib/loadData";
import { buildJourneysByMatch, buildMatchSummaries, pickDefaultMatch } from "@/lib/journeys";
import { DEFAULT_FILTERS, Filters, countVisible, matchInDate } from "@/lib/filters";
import { buildScene } from "@/lib/scene";
import { maxJourneyTime } from "@/lib/playback";
import { DEFAULT_HEATMAP_SETTINGS, HeatmapGrid, HeatmapSettings, buildHeatmapGrid, heatmapCacheKey } from "@/lib/heatmap";
import { formatDate } from "@/lib/format";
import Sidebar from "@/components/Sidebar";
import MatchPlayer from "@/components/MatchPlayer";
import FilterPanel from "@/components/FilterPanel";
import StatsBar from "@/components/StatsBar";

export default function Home() {
  const [index, setIndex] = useState<IndexData | null>(null);
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [journeysByMatch, setJourneysByMatch] = useState<Map<number, Journey[]> | null>(null);
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<number | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [heatmap, setHeatmap] = useState<HeatmapSettings>(DEFAULT_HEATMAP_SETTINGS);
  const [mapDataCache, setMapDataCache] = useState<Map<string, MapData>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const heatmapCacheRef = useRef(new Map<string, HeatmapGrid>());

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
        heatmapCacheRef.current = new Map();
        setMapDataCache((prev) => (prev.has(data.map) ? prev : new Map(prev).set(data.map, data)));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [index, selectedMapId]);

  useEffect(() => {
    if (!index) return;
    let cancelled = false;
    index.maps.forEach((meta) => {
      loadMapData(meta.data)
        .then((data) => {
          if (cancelled) return;
          setMapDataCache((prev) => (prev.has(data.map) ? prev : new Map(prev).set(data.map, data)));
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [index]);

  const mapMeta = useMemo(
    () => index?.maps.find((m) => m.id === selectedMapId) ?? null,
    [index, selectedMapId],
  );

  const mapDataReady = mapData !== null && mapData.map === selectedMapId;

  const matchSummaries = useMemo(() => {
    if (!journeysByMatch || !index) return new Map();
    return buildMatchSummaries(journeysByMatch, index.events);
  }, [journeysByMatch, index]);

  function handleFiltersChange(next: Filters) {
    const dateChanged = next.date !== filters.date;
    setFilters(next);
    if (dateChanged && mapData) {
      const current = selectedMatchIndex !== null ? mapData.matches[selectedMatchIndex] : null;
      if (!current || !matchInDate(current, next.date)) {
        setSelectedMatchIndex(pickDefaultMatch(mapData.matches, next.date));
      }
    }
  }

  function handleSelectMatch(index: number) {
    setSelectedMatchIndex(index);
    setFilters((f) => (f.aggregate ? { ...f, aggregate: false } : f));
  }

  const dateFilteredMatchIndices = useMemo(() => {
    if (!mapData || !mapDataReady) return [];
    const idxs: number[] = [];
    mapData.matches.forEach((m, i) => {
      if (matchInDate(m, filters.date)) idxs.push(i);
    });
    return idxs;
  }, [mapData, filters.date, mapDataReady]);

  const dateScopedJourneys = useMemo(() => {
    if (!journeysByMatch) return [];
    return dateFilteredMatchIndices.flatMap((i) => journeysByMatch.get(i) ?? []);
  }, [journeysByMatch, dateFilteredMatchIndices]);

  const dateScopedDuration = useMemo(() => {
    if (!mapData) return 0;
    let max = 0;
    dateFilteredMatchIndices.forEach((i) => {
      if (mapData.matches[i].duration > max) max = mapData.matches[i].duration;
    });
    return max;
  }, [mapData, dateFilteredMatchIndices]);

  const scope = useMemo(() => {
    if (!mapMeta || !mapDataReady) return { journeys: [] as Journey[], duration: 0, key: "" };
    if (filters.aggregate) {
      return {
        journeys: dateScopedJourneys,
        duration: Math.max(dateScopedDuration, maxJourneyTime(dateScopedJourneys)),
        key: `${mapMeta.id}:agg:${filters.date ?? "all"}`,
      };
    }
    if (!mapData || selectedMatchIndex === null) return { journeys: [] as Journey[], duration: 0, key: "" };
    const journeys = journeysByMatch?.get(selectedMatchIndex) ?? [];
    return {
      journeys,
      duration: Math.max(mapData.matches[selectedMatchIndex].duration, maxJourneyTime(journeys)),
      key: `${mapMeta.id}:${selectedMatchIndex}`,
    };
  }, [
    mapMeta,
    mapDataReady,
    filters.aggregate,
    filters.date,
    dateScopedJourneys,
    dateScopedDuration,
    mapData,
    journeysByMatch,
    selectedMatchIndex,
  ]);

  const scene = useMemo(() => {
    if (!mapMeta || !index) return null;
    return buildScene(scope.journeys, index.events, mapMeta, filters);
  }, [scope.journeys, index, mapMeta, filters]);

  const counts = useMemo(() => {
    if (!scene) {
      return {
        journeys: 0,
        humanJourneys: 0,
        botJourneys: 0,
        humansIncluded: filters.humans,
        botsIncluded: filters.bots,
        kills: null,
        deaths: null,
        loot: null,
      };
    }
    const humanCount = scope.journeys.filter((j) => j.kind === "human").length;
    const botCount = scope.journeys.filter((j) => j.kind === "bot").length;
    return countVisible(humanCount, botCount, scene.visibleMarkers, filters);
  }, [scene, scope.journeys, filters]);

  const mapMatchCounts = useMemo(() => {
    if (!index) return {};
    const counts: Record<string, number> = {};
    index.maps.forEach((m) => {
      const cached = mapDataCache.get(m.id);
      counts[m.id] = cached
        ? cached.matches.filter((match) => matchInDate(match, filters.date)).length
        : m.matches;
    });
    return counts;
  }, [index, mapDataCache, filters.date]);

  const heatmapJourneys = useMemo(
    () => dateScopedJourneys.filter((j) => (j.kind === "human" ? filters.humans : filters.bots)),
    [dateScopedJourneys, filters.humans, filters.bots],
  );

  const heatmapGrid = useMemo(() => {
    if (heatmap.layer === "off" || !index || !mapMeta) return null;
    const key = heatmapCacheKey(mapMeta.id, filters.date, filters.humans, filters.bots, heatmap.layer, heatmap.resolution);
    const cached = heatmapCacheRef.current.get(key);
    if (cached) return cached;
    const grid = buildHeatmapGrid(heatmapJourneys, index.events, heatmap.layer, heatmap.resolution);
    if (grid) heatmapCacheRef.current.set(key, grid);
    return grid;
  }, [heatmap.layer, heatmap.resolution, heatmapJourneys, index, mapMeta, filters.date, filters.humans, filters.bots]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center text-red-400 text-sm">
        Failed to load data: {error}
      </div>
    );
  }

  if (!index || !mapMeta || !mapData || !mapDataReady || selectedMatchIndex === null || !scene) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-400 text-sm">
        Loading player journeys…
      </div>
    );
  }

  const positionInFilteredMatches = dateFilteredMatchIndices.indexOf(selectedMatchIndex) + 1;
  const scopeLabel = `${mapMeta.label} · ${filters.date ? formatDate(filters.date) : "All dates"} · ${
    filters.aggregate
      ? "All journeys"
      : `Match ${positionInFilteredMatches} of ${dateFilteredMatchIndices.length}`
  }`;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <header className="shrink-0 border-b border-zinc-800 px-4 py-2.5">
        <h1 className="text-sm font-semibold text-zinc-100">Player Journey Viewer</h1>
      </header>
      <StatsBar scopeLabel={scopeLabel} counts={counts} />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          maps={index.maps}
          selectedMapId={mapMeta.id}
          onSelectMap={setSelectedMapId}
          matches={mapData.matches}
          summaries={matchSummaries}
          selectedMatchIndex={filters.aggregate ? null : selectedMatchIndex}
          onSelectMatch={handleSelectMatch}
          dateFilter={filters.date}
          mapMatchCounts={mapMatchCounts}
        />
        <MatchPlayer
          mapMeta={mapMeta}
          tracks={scene.tracks}
          markers={scene.visibleMarkers}
          duration={scope.duration}
          playerKey={scope.key}
          aggregate={filters.aggregate}
          heatmap={heatmapGrid}
          heatmapOpacity={heatmap.opacity}
        />
        <FilterPanel
          dates={index.dates}
          matches={mapData.matches}
          filters={filters}
          onChange={handleFiltersChange}
          heatmap={heatmap}
          onHeatmapChange={setHeatmap}
          heatmapGrid={heatmapGrid}
        />
      </div>
    </div>
  );
}
