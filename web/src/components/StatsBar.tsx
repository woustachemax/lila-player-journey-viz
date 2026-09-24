import { FilteredCounts } from "@/lib/filters";

interface StatsBarProps {
  scopeLabel: string;
  counts: FilteredCounts;
}

function plural(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

export default function StatsBar({ scopeLabel, counts }: StatsBarProps) {
  const parts: string[] = [plural(counts.journeys, "journey", "journeys")];
  if (counts.kills !== null) parts.push(plural(counts.kills, "kill", "kills"));
  if (counts.deaths !== null) parts.push(plural(counts.deaths, "death", "deaths"));
  if (counts.loot !== null) parts.push(plural(counts.loot, "loot pickup", "loot pickups"));

  return (
    <div className="flex shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-zinc-800 bg-zinc-950 px-4 py-2 text-sm">
      <span className="text-zinc-400">{scopeLabel}</span>
      <span className="font-medium tabular-nums text-zinc-100">{parts.join(", ")}</span>
    </div>
  );
}
