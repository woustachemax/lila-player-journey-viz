interface TooltipItem {
  label: string;
  time: string;
  playerId: string;
  kind: "human" | "bot";
  flag: boolean;
}

interface TooltipProps {
  x: number;
  y: number;
  items: TooltipItem[];
}

export default function Tooltip({ x, y, items }: TooltipProps) {
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md bg-zinc-900/95 border border-zinc-700 px-3 py-2 text-xs text-zinc-100 shadow-lg"
      style={{ left: x + 14, top: y + 14 }}
    >
      {items.map((item, i) => {
        const kindLabel = item.kind === "human" ? (item.flag ? "Human (numeric ID)" : "Human") : "Bot";
        const prev = items[i - 1];
        const samePlayerAsPrev =
          prev && prev.playerId === item.playerId && prev.kind === item.kind && prev.flag === item.flag;
        return (
          <div key={i} className={i > 0 ? "mt-1.5 pt-1.5 border-t border-zinc-700" : ""}>
            <div className="font-medium">{item.label}</div>
            {!samePlayerAsPrev && (
              <div className="text-zinc-400 mt-0.5">
                {kindLabel} · {item.playerId}
              </div>
            )}
            <div className="text-zinc-400">{item.time}</div>
          </div>
        );
      })}
    </div>
  );
}
