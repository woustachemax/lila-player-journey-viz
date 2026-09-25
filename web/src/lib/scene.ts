import { EventName, Journey, MapMeta } from "./types";
import { Filters, filterMarkers } from "./filters";
import { MarkerInfo, buildJourneyMarkers, sortByPriority } from "./markers";
import { Track, buildTracks } from "./playback";

export interface Scene {
  filteredJourneys: Journey[];
  tracks: Track[];
  allMarkers: MarkerInfo[];
  visibleMarkers: MarkerInfo[];
}

export function buildScene(
  journeys: Journey[],
  eventNames: EventName[],
  mapMeta: MapMeta,
  filters: Filters,
): Scene {
  const filteredJourneys = journeys.filter((j) => (j.kind === "human" ? filters.humans : filters.bots));
  const tracks = buildTracks(filteredJourneys, eventNames, mapMeta.width, mapMeta.height);
  const allMarkers = sortByPriority(
    filteredJourneys.flatMap((j) => buildJourneyMarkers(j, eventNames, mapMeta.width, mapMeta.height)),
  );
  const visibleMarkers = filterMarkers(allMarkers, filters);
  return { filteredJourneys, tracks, allMarkers, visibleMarkers };
}
