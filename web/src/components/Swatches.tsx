"use client";

import { useEffect, useRef } from "react";
import { MarkerShape, drawMarker } from "@/lib/eventStyles";
import { drawPlayerDot } from "@/lib/playback";
import { heatColor } from "@/lib/heatmap";

export function MarkerSwatch({ shape, color }: { shape: MarkerShape; color: string }) {
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

export function LineSwatch({ dashed }: { dashed: boolean }) {
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

export function DotSwatch({ kind }: { kind: "human" | "bot" }) {
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

export function HeatmapGradientBar() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = 160;
    const h = 10;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = heatColor(x / (w - 1));
      ctx.fillStyle = `rgba(${r},${g},${b},${a / 255})`;
      ctx.fillRect(x, 0, 1, h);
    }
  }, []);

  return <canvas ref={ref} className="h-[10px] w-40 rounded" style={{ width: 160, height: 10 }} />;
}
