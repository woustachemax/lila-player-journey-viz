import { EventName } from "./types";

export type MarkerShape =
  | "circle"
  | "triangleUp"
  | "triangleDown"
  | "diamond"
  | "star"
  | "cross"
  | "hollowCircle"
  | "square";

export interface EventStyle {
  label: string;
  color: string;
  shape: MarkerShape;
}

export const EVENT_STYLES: Partial<Record<EventName, EventStyle>> = {
  Loot: { label: "Loot picked up", color: "#eab308", shape: "circle" },
  Kill: { label: "Killed another player", color: "#db2777", shape: "star" },
  Killed: { label: "Killed by another player", color: "#991b1b", shape: "cross" },
  BotKill: { label: "Killed a bot", color: "#16a34a", shape: "triangleUp" },
  BotKilled: { label: "Killed by a bot", color: "#ea580c", shape: "triangleDown" },
  KilledByStorm: { label: "Killed by the storm", color: "#7c3aed", shape: "diamond" },
};

export function drawMarker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  shape: MarkerShape,
  color: string,
  size: number,
) {
  ctx.fillStyle = color;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, size * 0.18);

  switch (shape) {
    case "circle": {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "diamond": {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y);
      ctx.lineTo(x, y + size);
      ctx.lineTo(x - size, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "triangleUp": {
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size, y + size * 0.8);
      ctx.lineTo(x - size, y + size * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "triangleDown": {
      ctx.beginPath();
      ctx.moveTo(x, y + size);
      ctx.lineTo(x + size, y - size * 0.8);
      ctx.lineTo(x - size, y - size * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "star": {
      const spikes = 5;
      const outer = size;
      const inner = size * 0.45;
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const angle = (Math.PI / spikes) * i - Math.PI / 2;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "cross": {
      const w = Math.max(1.6, size * 0.4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-size, -w / 2, size * 2, w);
      ctx.fillRect(-w / 2, -size, w, size * 2);
      ctx.restore();
      break;
    }
    case "hollowCircle": {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(15,23,42,0.55)";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.4, size * 0.3);
      ctx.stroke();
      break;
    }
    case "square": {
      const half = size * 0.85;
      ctx.beginPath();
      ctx.rect(x - half, y - half, half * 2, half * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
}
