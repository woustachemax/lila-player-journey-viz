"use client";

import { useMemo } from "react";
import { EVENT_STYLES } from "@/lib/eventStyles";
import { EVENT_TOGGLES, EventToggleKey, Filters, PARTIAL_DATES, setAllEvents } from "@/lib/filters";
import { formatDate } from "@/lib/format";
import { MatchMeta } from "@/lib/types";
import { MarkerSwatch } from "./Swatches";

interface FilterPanelProps {
  dates: string[];
  matches: MatchMeta[];
  filters: Filters;
  onChange: (next: Filters) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{children}</div>;
}

export default function FilterPanel({ dates, matches, filters, onChange }: FilterPanelProps) {
  const matchesPerDate = useMemo(() => {
    const counts = new Map<string, number>();
    matches.forEach((m) => counts.set(m.date, (counts.get(m.date) ?? 0) + 1));
    return counts;
  }, [matches]);

  const toggleEvent = (key: EventToggleKey) => {
    onChange({ ...filters, events: { ...filters.events, [key]: !filters.events[key] } });
  };

  return (
    <aside className="flex w-64 shrink-0 flex-col gap-5 overflow-y-auto border-l border-zinc-800 bg-zinc-950 p-4 text-sm">
      <section>
        <SectionTitle>View</SectionTitle>
        <div className="grid grid-cols-2 gap-1 rounded-md bg-zinc-900 p-1">
          {[
            { value: false, label: "One match" },
            { value: true, label: "All journeys" },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={(e) => {
                onChange({ ...filters, aggregate: opt.value });
                e.currentTarget.blur();
              }}
              className={`rounded px-2 py-1.5 text-xs font-medium ${
                filters.aggregate === opt.value ? "bg-blue-600 text-white" : "text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          {filters.aggregate
            ? "Every journey on this map for the chosen date, played together from the start of each match."
            : "One match from the list on the left."}
        </p>
      </section>

      <section>
        <SectionTitle>Date</SectionTitle>
        <select
          value={filters.date ?? ""}
          onChange={(e) => {
            onChange({ ...filters, date: e.target.value === "" ? null : e.target.value });
            e.currentTarget.blur();
          }}
          className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-200"
        >
          <option value="">All dates · {matches.length} matches</option>
          {dates.map((date) => (
            <option key={date} value={date}>
              {formatDate(date)}
              {PARTIAL_DATES.has(date) ? " (partial day)" : ""} · {matchesPerDate.get(date) ?? 0} matches
            </option>
          ))}
        </select>
        {filters.date !== null && PARTIAL_DATES.has(filters.date) && (
          <p className="mt-2 text-xs text-amber-400">Data collection was still running on this day, so it has fewer matches.</p>
        )}
      </section>

      <section>
        <SectionTitle>Paths</SectionTitle>
        <div className="flex flex-col gap-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-zinc-200">
            <input
              type="checkbox"
              checked={filters.humans}
              onChange={(e) => {
                onChange({ ...filters, humans: !filters.humans });
                e.currentTarget.blur();
              }}
            />
            Humans
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-zinc-200">
            <input
              type="checkbox"
              checked={filters.bots}
              onChange={(e) => {
                onChange({ ...filters, bots: !filters.bots });
                e.currentTarget.blur();
              }}
            />
            Bots
          </label>
        </div>
        <p className="mt-2 text-xs text-zinc-500">Turning humans off also hides their markers.</p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Events</div>
          <div className="flex gap-1 text-xs">
            <button
              onClick={(e) => {
                onChange(setAllEvents(filters, true));
                e.currentTarget.blur();
              }}
              className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300 hover:bg-zinc-700"
            >
              All
            </button>
            <button
              onClick={(e) => {
                onChange(setAllEvents(filters, false));
                e.currentTarget.blur();
              }}
              className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300 hover:bg-zinc-700"
            >
              None
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {EVENT_TOGGLES.map((toggle) => {
            const style = EVENT_STYLES[toggle.eventName];
            return (
              <label key={toggle.key} className="flex cursor-pointer items-center gap-2 text-zinc-200">
                <input
                  type="checkbox"
                  checked={filters.events[toggle.key]}
                  onChange={(e) => {
                    toggleEvent(toggle.key);
                    e.currentTarget.blur();
                  }}
                />
                {style && <MarkerSwatch shape={style.shape} color={style.color} />}
                {toggle.label}
              </label>
            );
          })}
        </div>
      </section>
    </aside>
  );
}
