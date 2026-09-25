import { useEffect, useMemo, useRef, useState } from "react";
import { MatchMeta } from "@/lib/types";
import { MatchSummary } from "@/lib/journeys";
import { matchInDate } from "@/lib/filters";
import { formatDate, formatDurationLong, formatMatchSummary } from "@/lib/format";

interface MatchListProps {
  matches: MatchMeta[];
  summaries: Map<number, MatchSummary>;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  dateFilter: string | null;
}

type SortMode = "newest" | "mostEvents" | "mostBots";

function totalEvents(summary: MatchSummary | undefined): number {
  if (!summary) return 0;
  return (
    summary.playerKills +
    summary.botKills +
    summary.killedByPlayer +
    summary.killedByBot +
    summary.stormDeaths +
    summary.loot
  );
}

export default function MatchList({ matches, summaries, selectedIndex, onSelect, dateFilter }: MatchListProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [sortMode, setSortMode] = useState<SortMode>("newest");

  const orderedIndices = useMemo(() => {
    const indices: number[] = [];
    matches.forEach((m, i) => {
      if (matchInDate(m, dateFilter)) indices.push(i);
    });
    if (sortMode === "newest") {
      indices.sort((a, b) => matches[b].start - matches[a].start);
    } else if (sortMode === "mostEvents") {
      indices.sort((a, b) => totalEvents(summaries.get(b)) - totalEvents(summaries.get(a)));
    } else if (sortMode === "mostBots") {
      indices.sort((a, b) => matches[b].bots - matches[a].bots);
    }
    return indices;
  }, [matches, summaries, sortMode, dateFilter]);

  useEffect(() => {
    if (selectedIndex === null) return;
    selectedRef.current?.scrollIntoView({ block: "center" });
  }, [orderedIndices, selectedIndex]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Matches</span>
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="text-xs bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-300"
        >
          <option value="newest">Newest</option>
          <option value="mostEvents">Most events</option>
          <option value="mostBots">Most bots</option>
        </select>
      </div>
      {orderedIndices.length === 0 && (
        <p className="px-1 py-2 text-xs text-zinc-500">No matches on this date.</p>
      )}
      {orderedIndices.map((index) => {
        const match = matches[index];
        const active = selectedIndex !== null && index === selectedIndex;
        return (
          <button
            key={match.id}
            ref={active ? selectedRef : undefined}
            onClick={() => onSelect(index)}
            className={`flex flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors border ${
              active
                ? "bg-blue-600 text-white border-blue-300 ring-2 ring-blue-400"
                : "bg-zinc-900 text-zinc-300 border-transparent hover:bg-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{formatDate(match.date)}</span>
              <span className={active ? "text-blue-100" : "text-zinc-500"}>
                {formatDurationLong(match.duration)}
              </span>
            </div>
            <div className={`text-xs ${active ? "text-blue-100" : "text-zinc-500"}`}>
              {match.humans} human{match.humans === 1 ? "" : "s"} · {match.bots} bot
              {match.bots === 1 ? "" : "s"}
            </div>
            <div className={`text-xs ${active ? "text-blue-50" : "text-zinc-400"}`}>
              {formatMatchSummary(
                summaries.get(index) ?? {
                  playerKills: 0,
                  botKills: 0,
                  killedByPlayer: 0,
                  killedByBot: 0,
                  stormDeaths: 0,
                  loot: 0,
                },
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
