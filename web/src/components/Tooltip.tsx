interface TooltipProps {
  x: number;
  y: number;
  eventLabel: string;
  playerId: string;
  kind: "human" | "bot";
  flag: boolean;
  time: string;
}

export default function Tooltip({ x, y, eventLabel, playerId, kind, flag, time }: TooltipProps) {
  const kindLabel = kind === "human" ? (flag ? "Human (numeric ID)" : "Human") : "Bot";
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md bg-zinc-900/95 border border-zinc-700 px-3 py-2 text-xs text-zinc-100 shadow-lg"
      style={{ left: x + 14, top: y + 14 }}
    >
      <div className="font-medium">{eventLabel}</div>
      <div className="text-zinc-400 mt-0.5">
        {kindLabel} · {playerId}
      </div>
      <div className="text-zinc-400">{time}</div>
    </div>
  );
}
