"use client";

import { useEffect, useRef, useState } from "react";
import { EVENT_STYLES, MarkerShape, drawMarker } from "@/lib/eventStyles";
import { EXTRACTED_MARKER_STYLE, START_MARKER_STYLE } from "@/lib/markers";
import { drawPlayerDot } from "@/lib/playback";

function MarkerSwatch({ shape, color }: { shape: MarkerShape; color: string }) {
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

function DotSwatch({ kind }: { kind: "human" | "bot" }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 28 * dpr;
    canvas.height = 14 * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, 28, 14);
    drawPlayerDot(ctx, 14, 7, kind, 5.5);
  }, [kind]);

  return <canvas ref={ref} className="w-[28px] h-[14px] shrink-0" style={{ width: 28, height: 14 }} />;
}

export default function Legend() {
  const [open, setOpen] = useState(true);
  const markerEntries = Object.entries(EVENT_STYLES) as [string, (typeof EVENT_STYLES)[keyof typeof EVENT_STYLES]][];

  return (
    <div className="shrink-0 border-t border-zinc-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wide text-zinc-500 hover:text-zinc-300"
      >
        <span>Legend</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-zinc-200">
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex items-center gap-2">
              <LineSwatch dashed={false} />
              <span>Human path</span>
            </div>
            <div className="flex items-center gap-2">
              <LineSwatch dashed={true} />
              <span>Bot path</span>
            </div>
            <div className="flex items-center gap-2">
              <DotSwatch kind="human" />
              <span>Human position now</span>
            </div>
            <div className="flex items-center gap-2">
              <DotSwatch kind="bot" />
              <span>Bot position now</span>
            </div>
            <div className="flex items-center gap-2">
              <MarkerSwatch shape={START_MARKER_STYLE.shape} color={START_MARKER_STYLE.color} />
              <span>{START_MARKER_STYLE.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <MarkerSwatch shape={EXTRACTED_MARKER_STYLE.shape} color={EXTRACTED_MARKER_STYLE.color} />
              <span>{EXTRACTED_MARKER_STYLE.label}</span>
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
      )}
    </div>
  );
}
