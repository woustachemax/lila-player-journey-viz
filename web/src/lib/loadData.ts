import { IndexData, MapData } from "./types";

export async function loadIndex(): Promise<IndexData> {
  const res = await fetch("/data/index.json");
  if (!res.ok) throw new Error(`Failed to load index.json: ${res.status}`);
  return res.json();
}

export async function loadMapData(path: string): Promise<MapData> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}
