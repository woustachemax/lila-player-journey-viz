"use client";

import { useEffect, useRef } from "react";
import { EVENT_STYLES, drawMarker } from "@/lib/eventStyles";

function MarkerSwatch({ shape, color }: { shape: "circle" | "triangleUp" | "triangleDown" | "diamond" | "star" | "cross"; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 18 * dpr;
    canvas.height = 18 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 18, 18);
    drawMarker(ctx, 9, 9, shape, color, 6);
  }, [shape, color]);

  return <canvas ref={ref} className="w-[18px] h-[18px] shrink-0" style={{ width: 18, height: 18 }} />;
}

function LineSwatch({ dashed }: { dashed: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 28 * dpr;
    canvas.height = 12 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 28, 12);
    ctx.strokeStyle = dashed ? "#9ca3af" : "#2563eb";
    ctx.lineWidth = dashed ? 1.6 : 2.2;
    ctx.setLineDash(dashed ? [4, 3] : []);
    ctx.beginPath();
    ctx.moveTo(2, 6);
    ctx.lineTo(26, 6);
    ctx.stroke();
  }, [dashed]);

  return <canvas ref={ref} className="w-[28px] h-[12px] shrink-0" style={{ width: 28, height: 12 }} />;
}

export default function Legend() {
  const markerEntries = Object.entries(EVENT_STYLES) as [string, (typeof EVENT_STYLES)[keyof typeof EVENT_STYLES]][];

  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-lg bg-zinc-900/90 border border-zinc-700 px-4 py-3 text-xs text-zinc-200 shadow-lg max-w-xs">
      <div className="font-medium mb-2 text-zinc-100">Legend</div>
      <div className="flex flex-col gap-1.5 mb-3">
        <div className="flex items-center gap-2">
          <LineSwatch dashed={false} />
          <span>Human path</span>
        </div>
        <div className="flex items-center gap-2">
          <LineSwatch dashed={true} />
          <span>Bot path</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {markerEntries.map(([name, style]) =>
          style ? (
            <div key={name} className="flex items-center gap-2">
              <MarkerSwatch shape={style.shape} color={style.color} />
              <span>{style.label}</span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
