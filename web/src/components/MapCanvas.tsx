"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { drawMarker } from "@/lib/eventStyles";
import { MarkerInfo, findStackedTopMarkers, markerPriorityRank } from "@/lib/markers";
import { PlaybackClock } from "@/lib/playbackClock";
import { Track, drawPlayerDot, hasStarted, positionAt, tracePath } from "@/lib/playback";
import { HeatmapGrid, heatColor } from "@/lib/heatmap";
import { formatDuration } from "@/lib/format";
import Tooltip from "./Tooltip";

interface MapCanvasProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  tracks: Track[];
  markers: MarkerInfo[];
  clock: PlaybackClock;
  aggregate: boolean;
  heatmap: HeatmapGrid | null;
  heatmapOpacity: number;
}

const PATH_STYLE = {
  bot: { stroke: "rgba(148,163,184,0.55)", width: 1.4, dash: [5, 4] },
  human: { stroke: "rgba(37,99,235,0.9)", width: 2, dash: [] as number[] },
  botAggregate: { stroke: "rgba(148,163,184,0.22)", width: 1, dash: [3, 3] },
  humanAggregate: { stroke: "rgba(37,99,235,0.2)", width: 1, dash: [] as number[] },
};

function buildHeatmapCanvas(heatmap: HeatmapGrid): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = heatmap.resolution;
  canvas.height = heatmap.resolution;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(heatmap.resolution, heatmap.resolution);
  for (let i = 0; i < heatmap.counts.length; i++) {
    const t = heatmap.max > 0 ? Math.sqrt(heatmap.counts[i] / heatmap.max) : 0;
    const [r, g, b, a] = heatColor(t);
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = g;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

interface HoveredItem {
  label: string;
  t: number;
  playerId: string;
  kind: "human" | "bot";
  flag: boolean;
}

interface HoveredGroup {
  screenX: number;
  screenY: number;
  items: HoveredItem[];
}

interface StackCache {
  markers: MarkerInfo[];
  scale: number;
  count: number;
  tops: Set<number>;
}

const MIN_SCALE_FACTOR = 0.6;
const MAX_SCALE_FACTOR = 30;
const STACK_RING_RADIUS_PX = 5;
const HOVER_RADIUS_PX = 9;
const DOT_SIZE_PX = 5.5;

function groupKey(g: HoveredGroup | null): string {
  if (!g) return "";
  return g.items.map((it) => `${it.playerId}:${it.label}:${it.t}`).join("|");
}

function prepareCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.round(cssW * dpr);
  const targetH = Math.round(cssH * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  return { ctx, cssW, cssH };
}

export default function MapCanvas({
  imageSrc,
  imageWidth,
  imageHeight,
  tracks,
  markers,
  clock,
  aggregate,
  heatmap,
  heatmapOpacity,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const transformRef = useRef<Transform>({ scale: 1, tx: 0, ty: 0 });
  const fitScaleRef = useRef(1);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const stackCacheRef = useRef<StackCache | null>(null);

  const [imageReady, setImageReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<HoveredGroup | null>(null);
  const [prevTracks, setPrevTracks] = useState(tracks);

  if (tracks !== prevTracks) {
    setPrevTracks(tracks);
    setHovered(null);
  }

  const botTracks = useMemo(() => tracks.filter((t) => t.journey.kind === "bot"), [tracks]);
  const humanTracks = useMemo(() => tracks.filter((t) => t.journey.kind === "human"), [tracks]);

  const heatmapCanvas = useMemo(() => (heatmap ? buildHeatmapCanvas(heatmap) : null), [heatmap]);

  const drawBase = useCallback(() => {
    const img = imageRef.current;
    const prepared = prepareCanvas(baseRef.current);
    if (!img || !prepared) return;
    const { ctx } = prepared;
    const { scale, tx, ty } = transformRef.current;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);
    if (heatmapCanvas) {
      ctx.globalAlpha = heatmapOpacity;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(heatmapCanvas, 0, 0, imageWidth, imageHeight);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }, [imageWidth, imageHeight, heatmapCanvas, heatmapOpacity]);

  const drawOverlay = useCallback(() => {
    if (!imageRef.current) return;
    const prepared = prepareCanvas(overlayRef.current);
    if (!prepared) return;
    const { ctx } = prepared;
    const time = clock.getTime();
    const { scale, tx, ty } = transformRef.current;

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    const botStyle = aggregate ? PATH_STYLE.botAggregate : PATH_STYLE.bot;
    const humanStyle = aggregate ? PATH_STYLE.humanAggregate : PATH_STYLE.human;

    ctx.strokeStyle = botStyle.stroke;
    ctx.lineWidth = botStyle.width / scale;
    ctx.setLineDash(botStyle.dash.map((d) => d / scale));
    botTracks.forEach((track) => {
      if (!hasStarted(track, time)) return;
      tracePath(ctx, track, time);
      ctx.stroke();
    });

    ctx.strokeStyle = humanStyle.stroke;
    ctx.lineWidth = humanStyle.width / scale;
    ctx.setLineDash(humanStyle.dash.map((d) => d / scale));
    humanTracks.forEach((track) => {
      if (!hasStarted(track, time)) return;
      tracePath(ctx, track, time);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    ctx.globalAlpha = aggregate ? 0.55 : 1;
    const dotSize = (aggregate ? DOT_SIZE_PX * 0.7 : DOT_SIZE_PX) / scale;
    botTracks.forEach((track) => {
      const pos = positionAt(track, time);
      if (pos) drawPlayerDot(ctx, pos.x, pos.y, "bot", dotSize);
    });
    humanTracks.forEach((track) => {
      const pos = positionAt(track, time);
      if (pos) drawPlayerDot(ctx, pos.x, pos.y, "human", dotSize);
    });
    ctx.globalAlpha = 1;

    const visible: MarkerInfo[] = [];
    for (const m of markers) {
      if (m.t <= time) visible.push(m);
    }
    visible.forEach((m) => {
      ctx.globalAlpha = m.alpha;
      drawMarker(ctx, m.x, m.y, m.shape, m.color, m.size / scale);
    });
    ctx.globalAlpha = 1;

    let cache = stackCacheRef.current;
    if (!cache || cache.markers !== markers || cache.scale !== scale || cache.count !== visible.length) {
      cache = {
        markers,
        scale,
        count: visible.length,
        tops: findStackedTopMarkers(visible, STACK_RING_RADIUS_PX / scale),
      };
      stackCacheRef.current = cache;
    }
    cache.tops.forEach((idx) => {
      const m = visible[idx];
      ctx.beginPath();
      ctx.arc(m.x, m.y, (m.size / scale) * 1.7, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.95)";
      ctx.lineWidth = 1.6 / scale;
      ctx.stroke();
    });

    ctx.restore();

    if (hovered) {
      ctx.beginPath();
      ctx.arc(hovered.screenX, hovered.screenY, 10, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [clock, botTracks, humanTracks, markers, hovered, aggregate]);

  const drawAll = useCallback(() => {
    drawBase();
    drawOverlay();
  }, [drawBase, drawOverlay]);

  const fitToContainer = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (cw === 0 || ch === 0) return;
    const scale = Math.min(cw / imageWidth, ch / imageHeight);
    const tx = (cw - imageWidth * scale) / 2;
    const ty = (ch - imageHeight * scale) / 2;
    transformRef.current = { scale, tx, ty };
    fitScaleRef.current = scale;
  }, [imageWidth, imageHeight]);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      imageRef.current = img;
      setImageReady(true);
    };
    img.src = imageSrc;
    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  useEffect(() => {
    if (!imageReady) return;
    fitToContainer();
  }, [imageReady, fitToContainer]);

  useEffect(() => {
    drawBase();
  }, [drawBase, imageReady]);

  useEffect(() => {
    drawOverlay();
  }, [drawOverlay, imageReady]);

  useEffect(() => clock.subscribe(drawOverlay), [clock, drawOverlay]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      drawAll();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [drawAll]);

  const findHoveredMarkers = useCallback(
    (mouseX: number, mouseY: number): HoveredGroup | null => {
      const { scale, tx, ty } = transformRef.current;
      const time = clock.getTime();
      const within: (HoveredItem & { sx: number; sy: number; dist: number; rank: number })[] = [];
      for (const m of markers) {
        if (m.t > time) continue;
        const sx = tx + m.x * scale;
        const sy = ty + m.y * scale;
        const dist = Math.hypot(sx - mouseX, sy - mouseY);
        if (dist < HOVER_RADIUS_PX) {
          within.push({
            label: m.label,
            t: m.t,
            playerId: m.playerId,
            kind: m.kind,
            flag: m.flag,
            sx,
            sy,
            dist,
            rank: markerPriorityRank(m.markerKind),
          });
        }
      }
      if (within.length === 0) return null;
      within.sort((a, b) => b.rank - a.rank);
      const anchor = within.reduce((best, cur) => (cur.dist < best.dist ? cur : best));
      return {
        screenX: anchor.sx,
        screenY: anchor.sy,
        items: within.map(({ label, t, playerId, kind, flag }) => ({ label, t, playerId, kind, flag })),
      };
    },
    [markers, clock],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const canvas = overlayRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const { scale, tx, ty } = transformRef.current;
      const zoomFactor = Math.exp(-e.deltaY * 0.0015);
      const minScale = fitScaleRef.current * MIN_SCALE_FACTOR;
      const maxScale = fitScaleRef.current * MAX_SCALE_FACTOR;
      const newScale = Math.min(maxScale, Math.max(minScale, scale * zoomFactor));
      const mapX = (mouseX - tx) / scale;
      const mapY = (mouseY - ty) / scale;
      transformRef.current = { scale: newScale, tx: mouseX - mapX * newScale, ty: mouseY - mapY * newScale };
      drawAll();
    },
    [drawAll],
  );

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    lastPointerRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      transformRef.current = {
        ...transformRef.current,
        tx: transformRef.current.tx + dx,
        ty: transformRef.current.ty + dy,
      };
      if (hovered) setHovered(null);
      drawAll();
      return;
    }

    const canvas = overlayRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const found = findHoveredMarkers(e.clientX - rect.left, e.clientY - rect.top);
    if (groupKey(found) !== groupKey(hovered)) {
      setHovered(found);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onPointerLeave = () => {
    if (!isDragging) setHovered(null);
  };

  return (
    <div ref={containerRef} className="absolute inset-0">
      <canvas ref={baseRef} className="absolute inset-0 w-full h-full block" />
      <canvas
        ref={overlayRef}
        className="absolute inset-0 w-full h-full block"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
      />
      {hovered && (
        <Tooltip
          x={hovered.screenX}
          y={hovered.screenY}
          items={hovered.items.map((it) => ({
            label: it.label,
            time: formatDuration(it.t),
            playerId: it.playerId,
            kind: it.kind,
            flag: it.flag,
          }))}
        />
      )}
    </div>
  );
}
