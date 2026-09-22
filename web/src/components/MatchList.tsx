import { useEffect, useRef } from "react";
import { MatchMeta } from "@/lib/types";
import { MatchSummary } from "@/lib/journeys";
import { formatDate, formatDuration, formatMatchSummary } from "@/lib/format";

interface MatchListProps {
  matches: MatchMeta[];
  summaries: Map<number, MatchSummary>;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export default function MatchList({ matches, summaries, selectedIndex, onSelect }: MatchListProps) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "center" });
  }, [matches, selectedIndex]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 px-1 mb-1">
        Matches
      </span>
      {matches.map((match, index) => {
        const active = index === selectedIndex;
        return (
          <button
            key={match.id}
            ref={active ? selectedRef : undefined}
            onClick={() => onSelect(index)}
            className={`flex flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors ${
              active
                ? "bg-blue-600 text-white"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{formatDate(match.date)}</span>
              <span className={active ? "text-blue-100" : "text-zinc-500"}>
                {formatDuration(match.duration)}
              </span>
            </div>
            <div className={`text-xs ${active ? "text-blue-100" : "text-zinc-500"}`}>
              {match.humans} human{match.humans === 1 ? "" : "s"} · {match.bots} bot
              {match.bots === 1 ? "" : "s"}
            </div>
            <div className={`text-xs ${active ? "text-blue-50" : "text-zinc-400"}`}>
              {formatMatchSummary(summaries.get(index) ?? { kills: 0, deaths: 0, loot: 0 })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
