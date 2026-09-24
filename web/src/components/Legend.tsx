"use client";

import { useState } from "react";
import { EVENT_STYLES } from "@/lib/eventStyles";
import { EXTRACTED_MARKER_STYLE, START_MARKER_STYLE } from "@/lib/markers";
import { DotSwatch, LineSwatch, MarkerSwatch } from "./Swatches";

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
