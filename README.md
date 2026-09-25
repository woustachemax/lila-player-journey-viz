# Player Journey Viewer

A browser tool for LILA Games level designers to explore player telemetry from LILA BLACK on the three maps in rotation.

Also in this repo: [ARCHITECTURE.md](ARCHITECTURE.md) for how it is built and the assumptions i made, [INSIGHTS.md](INSIGHTS.md) for three things the tool turned up about the game, and [PROCESS.md](PROCESS.md) for the build log.

## What it does

Pick a map and a match to see every journey drawn on the minimap, humans in solid blue and bots in dashed grey, with markers for loot, kills, deaths and storm deaths. Play the match back on a timeline with a scrubber and speed control, or switch to All journeys to watch every run on a map play out on one shared clock. Filter by date, event type and human or bot, and turn on a traffic, kills or deaths heatmap over the top with adjustable grid size and opacity.

## Stack

Python (pandas, pyarrow, pillow) for the one time data build, Next.js and TypeScript for the app, canvas for the rendering, deployed on vercel as a static site. No backend and no database, the reasoning is in ARCHITECTURE.md.

## Env vars

None. The app reads static JSON from its own `public` folder.

## Running it

The processed data is committed, so the app runs on its own:

```
cd web
npm install
npm run dev
```

Open http://localhost:3000.

## Rebuilding the data

Only needed if the raw data changes. Unzip `player_data` into `data/raw/` first, it is gitignored because it is production data with player ids in it.

```
python3 -m venv .venv
source .venv/bin/activate
pip install -r pipeline/requirements.txt
python pipeline/build_data.py
```

That writes the per map JSON into `web/public/data` and the resized minimaps into `web/public/maps`. `pipeline/explore.py` prints the schema and sanity checks the coordinate mapping, `pipeline/anomalies.py` digs into the odd rows, and `pipeline/insights.py` prints the stats behind INSIGHTS.md.

## Layout

```
pipeline/     python data build and the exploration scripts
data/raw/     unzipped player_data, gitignored
web/          next.js app
  public/data processed JSON, one file per map plus an index
  public/maps minimaps resized to 2048px webp
  src/lib     data loading, journey building, markers, playback, heatmap binning
  src/components  sidebar, canvas, timeline, filters, legend
```
