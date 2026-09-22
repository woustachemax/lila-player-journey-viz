export type EventName =
  | "Position"
  | "BotPosition"
  | "Loot"
  | "Kill"
  | "Killed"
  | "BotKill"
  | "BotKilled"
  | "KilledByStorm";

export interface MapMeta {
  id: string;
  label: string;
  data: string;
  image: string;
  width: number;
  height: number;
  matches: number;
}

export interface IndexData {
  events: EventName[];
  dates: string[];
  maps: MapMeta[];
}

export interface MatchMeta {
  id: string;
  date: string;
  start: number;
  duration: number;
  humans: number;
  bots: number;
  events: Partial<Record<EventName, number>>;
}

export interface PlayerMeta {
  id: string;
  match: number;
  kind: "human" | "bot";
  flag: boolean;
}

export interface MapRows {
  p: number[];
  t: number[];
  u: number[];
  v: number[];
  e: number[];
}

export interface MapData {
  map: string;
  matches: MatchMeta[];
  players: PlayerMeta[];
  rows: MapRows;
}

export interface JourneyPoint {
  t: number;
  u: number;
  v: number;
  e: number;
}

export interface Journey {
  playerIndex: number;
  playerId: string;
  kind: "human" | "bot";
  flag: boolean;
  points: JourneyPoint[];
}
