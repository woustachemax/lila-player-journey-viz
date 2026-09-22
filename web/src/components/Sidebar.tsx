import { MapMeta, MatchMeta } from "@/lib/types";
import { MatchSummary } from "@/lib/journeys";
import MapSelector from "./MapSelector";
import MatchList from "./MatchList";
import Legend from "./Legend";

interface SidebarProps {
  maps: MapMeta[];
  selectedMapId: string;
  onSelectMap: (mapId: string) => void;
  matches: MatchMeta[];
  summaries: Map<number, MatchSummary>;
  selectedMatchIndex: number;
  onSelectMatch: (index: number) => void;
}

export default function Sidebar({
  maps,
  selectedMapId,
  onSelectMap,
  matches,
  summaries,
  selectedMatchIndex,
  onSelectMatch,
}: SidebarProps) {
  return (
    <aside className="flex flex-col w-72 shrink-0 border-r border-zinc-800 bg-zinc-950 min-h-0">
      <MapSelector maps={maps} selectedMapId={selectedMapId} onSelect={onSelectMap} />
      <MatchList
        matches={matches}
        summaries={summaries}
        selectedIndex={selectedMatchIndex}
        onSelect={onSelectMatch}
      />
      <Legend />
    </aside>
  );
}
