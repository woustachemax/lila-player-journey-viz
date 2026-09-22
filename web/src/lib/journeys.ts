import { EventName, Journey, JourneyPoint, MapData } from "./types";

export interface MatchSummary {
  kills: number;
  deaths: number;
  loot: number;
}

export function buildJourneysByMatch(mapData: MapData): Map<number, Journey[]> {
  const { players, rows } = mapData;
  const journeysByMatch = new Map<number, Journey[]>();

  const flush = (playerIndex: number, points: JourneyPoint[]) => {
    if (playerIndex < 0 || points.length === 0) return;
    const player = players[playerIndex];
    const journey: Journey = {
      playerIndex,
      playerId: player.id,
      kind: player.kind,
      flag: player.flag,
      points,
    };
    const list = journeysByMatch.get(player.match);
    if (list) list.push(journey);
    else journeysByMatch.set(player.match, [journey]);
  };

  let currentPlayerIndex = -1;
  let currentPoints: JourneyPoint[] = [];

  for (let i = 0; i < rows.p.length; i++) {
    const playerIndex = rows.p[i];
    if (playerIndex !== currentPlayerIndex) {
      flush(currentPlayerIndex, currentPoints);
      currentPlayerIndex = playerIndex;
      currentPoints = [];
    }
    currentPoints.push({ t: rows.t[i], u: rows.u[i], v: rows.v[i], e: rows.e[i] });
  }
  flush(currentPlayerIndex, currentPoints);

  return journeysByMatch;
}

export function buildMatchSummaries(
  journeysByMatch: Map<number, Journey[]>,
  eventNames: EventName[],
): Map<number, MatchSummary> {
  const summaries = new Map<number, MatchSummary>();
  journeysByMatch.forEach((journeys, matchIndex) => {
    const summary: MatchSummary = { kills: 0, deaths: 0, loot: 0 };
    journeys.forEach((journey) => {
      if (journey.kind !== "human") return;
      journey.points.forEach((pt) => {
        const name = eventNames[pt.e];
        if (name === "Kill" || name === "BotKill") summary.kills++;
        else if (name === "Killed" || name === "BotKilled" || name === "KilledByStorm") summary.deaths++;
        else if (name === "Loot") summary.loot++;
      });
    });
    summaries.set(matchIndex, summary);
  });
  return summaries;
}

export function pickDefaultMatch(matches: MapData["matches"]): number {
  let bestIndex = 0;
  let bestScore = -1;
  matches.forEach((match, index) => {
    const score = Object.values(match.events).reduce((sum, count) => sum + (count ?? 0), 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}
