# Architecture

The flow of the application is split into two parts, a python script using pandas, pyarrow and pillow which cleans the raw parquet files once and returns json,and a next.js app in typescript loads that json and does everything else in the browse, and I've used vercel for static files. The whole dataset is around 8mb and 89k rows so i did want one place where all the cleaning happens making it easier to poke in pandas.


## Data flow

`pipeline/build_data.py` reads all 1,243 files with pyarrow, decodes the `event` column from bytes and strips the `.nakama-0` off match ids. then it drops duplicates, decides if each journey is a human or a bot, converts world coords to uv and turns timestamps into seconds since the match started. It writes an `index.json` with the maps and dates and one json per map with every match, player and event, whichh are both stored in `web/public/data`. it also shrinks the minimaps to 2048px webp and stores them in `web/public/maps`. The browser loads the index first and then grabs one map file when you pick a map. Rows are stored as parallel arrays with player, time, u, v, event.

## Coordinate mapping
`y` is height, so only `x` and `z` matter for a minimap. i converted a world point to uv 0 to 1 across the map using the scale and origin from the readme, then multiplied by the image size and flip v since images start at the top left

```
u = (x - origin_x) / scale
v = (z - origin_z) / scale
pixel_x = u * width
pixel_y = (1 - v) * height
```

The readme says the minimaps are 1024x1024 but they range from 2160px to 9000px, so i kept everything in uv and scale it acc to the image that is on screen.
## Assumptions

The readme says `ts` is milliseconds but the raw values are unix seconds, they land on the folder dates and matches last 13 to 890 seconds, so playback uses seconds since each match started. Numeric ids are supposed to be bots but 1379, 1402 and 1429 move and loot like humans in 17 journeys, so i classify each journey by its movement event (`Position` is human, `BotPosition` is bot) and flag those 17. `BotKill` and `BotKilled` are described two different ways in the readme. The bot side combat events that line up with a human event are the same fight logged twice, so heatmaps only use the human side.

There are 1,505 exact duplicate rows, mostly loot. i dropped repeated positions but kept repeated events since `ts` is whole seconds and two pickups in one second look identical. One journey shows up in both the feb 10 and feb 11 folders so i merged it, and a match takes the earliest folder it appears in. 177 rows come after a death, possibly a downed or revive state, so i kept them. Most matches only have one human file so i treat the data as a sample of journeys wich is why map wide views matter as much as playback. Positions are sampled every 5 seconds so playback interpolates between them, and feb 14 is labelled partial in the date filter.

## Tradeoffs
I went with a one time build step over querying the parquet live with an api or duckdb since the data is small and doesnt change, the only downside is rerunning the script if new data comes in. one map gets one json instead of one per match so i can show every journey on a map at once, and heatmaps are binned in the browser so they always match the filters. The original minimaps go up to 9000px so i resized them to 2048px webp at around 200kb each.