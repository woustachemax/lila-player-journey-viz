"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EventName, Journey } from "@/lib/types";
import { drawMarker } from "@/lib/eventStyles";
import { MARKER_LAYER_ORDER, buildJourneyMarkers } from "@/lib/markers";
import { formatDuration } from "@/lib/format";
import Tooltip from "./Tooltip";

interface MapCanvasProps {
  imageSrc: string;
  imageWidth: number;
  imageHeight: number;
  journeys: Journey[];
  eventNames: EventName[];
}

interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

interface HoveredMarker {
  screenX: number;
  screenY: number;
  label: string;
  playerId: string;
  kind: "human" | "bot";
  flag: boolean;
  t: number;
}

const MIN_SCALE_FACTOR = 0.6;
const MAX_SCALE_FACTOR = 30;

export default function MapCanvas({
  imageSrc,
  imageWidth,
  imageHeight,
  journeys,
  eventNames,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const transformRef = useRef<Transform>({ scale: 1, tx: 0, ty: 0 });
  const fitScaleRef = useRef(1);
  const lastPointerRef = useRef({ x: 0, y: 0 });

  const [imageReady, setImageReady] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hovered, setHovered] = useState<HoveredMarker | null>(null);
  const [prevJourneys, setPrevJourneys] = useState(journeys);

  if (journeys !== prevJourneys) {
    setPrevJourneys(journeys);
    setHovered(null);
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

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

    const { scale, tx, ty } = transformRef.current;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, imageWidth, imageHeight);

    const bots = journeys.filter((j) => j.kind === "bot");
    const humans = journeys.filter((j) => j.kind === "human");

    const drawPath = (journey: Journey, strokeStyle: string, lineWidth: number, dash: number[]) => {
      if (journey.points.length < 2) return;
      ctx.beginPath();
      journey.points.forEach((pt, i) => {
        const x = pt.u * imageWidth;
        const y = (1 - pt.v) * imageHeight;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth / scale;
      ctx.setLineDash(dash.map((d) => d / scale));
      ctx.stroke();
      ctx.setLineDash([]);
    };

    bots.forEach((j) => drawPath(j, "rgba(148,163,184,0.55)", 1.4, [5, 4]));
    humans.forEach((j) => drawPath(j, "rgba(37,99,235,0.9)", 2, []));

    const allMarkers = humans.flatMap((j) => buildJourneyMarkers(j, eventNames, imageWidth, imageHeight));
    MARKER_LAYER_ORDER.forEach((layer) => {
      allMarkers
        .filter((m) => m.layer === layer)
        .forEach((m) => {
          ctx.globalAlpha = m.alpha;
          drawMarker(ctx, m.x, m.y, m.shape, m.color, m.size / scale);
        });
    });
    ctx.globalAlpha = 1;

    ctx.restore();

    if (hovered) {
      ctx.beginPath();
      ctx.arc(hovered.screenX, hovered.screenY, 10, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [imageWidth, imageHeight, journeys, eventNames, hovered]);

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
    draw();
  }, [imageReady, fitToContainer, draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      draw();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [draw]);

  const findHoveredMarker = useCallback(
    (mouseX: number, mouseY: number): HoveredMarker | null => {
      const { scale, tx, ty } = transformRef.current;
      const threshold = 9;
      let best: HoveredMarker | null = null;
      let bestDist = threshold;
      const humans = journeys.filter((j) => j.kind === "human");
      const allMarkers = humans.flatMap((j) => buildJourneyMarkers(j, eventNames, imageWidth, imageHeight));
      for (const m of allMarkers) {
        const sx = tx + m.x * scale;
        const sy = ty + m.y * scale;
        const dx = sx - mouseX;
        const dy = sy - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          best = {
            screenX: sx,
            screenY: sy,
            label: m.label,
            playerId: m.playerId,
            kind: m.kind,
            flag: m.flag,
            t: m.t,
          };
        }
      }
      return best;
    },
    [journeys, eventNames, imageWidth, imageHeight],
  );

  const onWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
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
      const newTx = mouseX - mapX * newScale;
      const newTy = mouseY - mapY * newScale;
      transformRef.current = { scale: newScale, tx: newTx, ty: newTy };
      draw();
    },
    [draw],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
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
      draw();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const found = findHoveredMarker(mouseX, mouseY);
    const changed =
      found?.playerId !== hovered?.playerId ||
      found?.t !== hovered?.t ||
      found?.label !== hovered?.label;
    if (changed) {
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
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
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
          eventLabel={hovered.label}
          playerId={hovered.playerId}
          kind={hovered.kind}
          flag={hovered.flag}
          time={formatDuration(hovered.t)}
        />
      )}
    </div>
  );
}
