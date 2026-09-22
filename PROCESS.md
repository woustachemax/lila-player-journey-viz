# Process

## Milestone 1: map view

Built the Next.js app in `web/` per ARCHITECTURE.md and web/AGENTS.md. Scope: map selector, match list, canvas minimap with journeys, event markers, zoom/pan, hover tooltip, legend. No playback or date filters yet.

### Data layer
`lib/types.ts` mirrors the JSON shapes exactly. `lib/loadData.ts` fetches index.json then a map's JSON on selection. `lib/journeys.ts` does one pass over the parallel `rows` arrays (already sorted by player then time, per ARCHITECTURE.md) to build a `Map<matchIndex, Journey[]>` — grouping by player boundary (`p[i]` changing) and then bucketing by the player's `match` field. This runs once per map load, so switching matches after that is just a Map lookup, no re-scan.

### Rendering
`MapCanvas` draws the minimap and journeys on a single canvas, transform-based (translate/scale) so zoom and pan are just a `{scale, tx, ty}` update plus a redraw, not a re-render. Devicewise DPR is handled by sizing the backing store to `clientWidth*dpr` and scaling the context. Bot paths draw first (dashed gray, path only) then human paths on top (solid blue), then markers on top of that, human journeys only, per ARCHITECTURE.md's note that bot-side combat events duplicate the human side. Marker size and line width are divided by the current scale so they stay a constant size on screen regardless of zoom level.

Hover uses screen-space hit testing (recomputed on pointer move from the current transform) rather than tracking DOM elements per marker, since a busy match can have a few hundred markers and re-rendering that many DOM nodes on every pan/zoom would be slower than a canvas redraw.

### Decisions
- **Map switch remounts the canvas (`key={mapMeta.id}`), match switch doesn't.** Switching maps resets zoom/pan to fit (makes sense, it's a different image and coordinate space). Switching matches within the same map keeps the user's current zoom/pan, so they can compare matches at the same spot on the map without re-finding it.
- **Default match = the one with the most non-movement events**, so the initial view is never an empty map with a single 10-second journey on it. The sidebar auto-scrolls to and highlights that match on load.
- Next.js 16 / eslint-config-next ships React Compiler lint rules (`react-hooks/refs`, `react-hooks/set-state-in-effect`) that flag ref reads during render and unconditional `setState` in effect bodies. Reworked the canvas component to keep pan/zoom in a ref (read only inside imperative draw calls and event handlers, never during render) and used the "compare prop to previous-render state, conditionally setState during render" pattern for clearing the hover tooltip when the match changes, instead of resetting it in a `useEffect`.

### Testing
No browser tool was available in this session by default, so I installed Playwright + Chromium locally (scratchpad only, not a project dependency) and drove the running dev server: loaded the app, switched maps, switched matches, zoomed (wheel), panned (drag), and hovered markers to confirm the tooltip. Checked the browser console for errors on each of these. Also ran `npm run lint` and `npm run build` clean.

## Data observations (for INSIGHTS.md)

**The per-match `events` field in the data double-counts kills/deaths for matches with several bots, because it sums rows from both sides of a fight.** Example: AmbroseValley, match `de5aa1ae-6246-4cfb-9941-adf5996ef678` (Feb 12, index 463 in the map's match array). `matches[463].events` reports `BotKilled: 11`, which looks like the human died 11 times in one match. Checking the raw rows: the human player in that match (`1429`, one of the numeric-ID players that moves like a human per ARCHITECTURE.md) has **zero** `BotKilled` rows of its own — all 11 come from the 14 background bots' own logs of their own deaths. Same pattern on `BotKill`: 4 of the 12 are the human's, 8 are bots killing other bots. So `matches[i].events` is a raw sum across every player's file in the match, not deduplicated the way ARCHITECTURE.md says the heatmap data is. I didn't touch the pipeline (out of scope), but I stopped using `match.events` for the sidebar's kill/death/loot summary and instead compute it client-side from the human-only journeys — the same data source the map markers use — so the sidebar text and the markers on screen always agree. If a later milestone (or someone reading `AmbroseValley.json` directly) uses `matches[i].events` for anything human-centric, it needs the same correction.

**The numeric-ID players that move like humans aren't one-off.** `1429` (AmbroseValley) shows up as the lone human in 14 separate matches spanning Feb 10 to Feb 14, with `humans: 1` in all but one of them. Real human players in this dataset are mostly single-match (per ARCHITECTURE.md, "most matches only have one human file"), so a numeric ID appearing as *the* human across 14 matches over 5 days stands out — it behaves less like a one-off classification edge case and more like a persistent test/QA account that happens to move like a player. Worth a note in INSIGHTS.md if player counts or "unique humans" get cited anywhere, since this one ID would otherwise be silently folded into "human" totals 14 times over. The other two flagged IDs (`1402` on Lockdown, `1379` on GrandRift) each show up in only 1–2 matches, so they read more like the ordinary bot-shaped-like-a-human edge case.

**No teleporting/jump artifacts found in position data.** Checked all three maps for consecutive same-player position samples with implausibly large uv-space jumps in a short time window (would show up as a path snapping across the map) — found none. Movement paths are clean; whatever noise exists in this dataset is in the event/kill counting, not the positions.

**Loot and kill markers cluster tightly around a few structures**, consistent with INSIGHTS.md's point 2 — e.g. AmbroseValley match `d3a3297e-2cdf-4a49-8450-09119b91a779` (index 74, the highest-activity match on that map: 1 human vs 13 bots, 12 kills, 10 deaths, 68 loot) has almost all of its loot and kill markers sitting on top of two building clusters, with long empty stretches of path between them.
