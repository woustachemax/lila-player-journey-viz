import { MapMeta } from "@/lib/types";

interface MapSelectorProps {
  maps: MapMeta[];
  selectedMapId: string;
  onSelect: (mapId: string) => void;
}

export default function MapSelector({ maps, selectedMapId, onSelect }: MapSelectorProps) {
  return (
    <div className="flex flex-col gap-1 p-3 border-b border-zinc-800">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 px-1 mb-1">
        Map
      </span>
      <div className="flex flex-col gap-1">
        {maps.map((map) => {
          const active = map.id === selectedMapId;
          return (
            <button
              key={map.id}
              onClick={() => onSelect(map.id)}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm text-left transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              <span className="font-medium">{map.label}</span>
              <span className={`text-xs ${active ? "text-blue-100" : "text-zinc-500"}`}>
                {map.matches} matches
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
