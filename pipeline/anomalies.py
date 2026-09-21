import pandas as pd

from explore import DATA, load

DEATHS = ["Killed", "BotKilled", "KilledByStorm"]

df, _ = load()

on_disk = [p.name for p in DATA.glob("February_*/*") if not p.name.startswith(".")]
empty = sorted(set(on_disk) - set(df["file"]))
print("files on disk:", len(on_disk), "| files with no rows:", len(empty))
for name in empty[:5]:
    print("  ", name)

dupes = df.duplicated(subset=["user_id", "match_id", "ts_raw", "event", "x", "y", "z"]).sum()
print("exact duplicate rows:", dupes)

odd_ids = df.loc[df["is_bot"] & df["event"].isin(["Position", "Loot"]), "user_id"].unique()
print("\nnumeric user_ids with Position/Loot rows:", len(odd_ids))
odd = df[df["user_id"].isin(odd_ids)]
print(odd.groupby(["user_id", "match_id"])["event"].value_counts().unstack(fill_value=0).head(15))

humans = df[~df["is_bot"]].groupby("match_id")["user_id"].nunique()
print("\nmatches with no human file:", len(set(df["match_id"]) - set(humans.index)))

bc = df[df["is_bot"] & df["event"].isin(["BotKill", "BotKilled"])].reset_index()
hc = df[~df["is_bot"] & df["event"].isin(["BotKill", "BotKilled"])]
pairs = bc.merge(hc, on="match_id", suffixes=("_bot", "_human"))
pairs = pairs[(pairs["ts_raw_bot"] - pairs["ts_raw_human"]).abs() <= 2]
print("\nbot-file combat events paired with a human combat event within 2s:")
print(pd.crosstab(pairs["event_bot"], pairs["event_human"]))
print("unpaired bot-file combat events:", (~bc["index"].isin(pairs["index"])).sum(), "of", len(bc))

split = df.groupby("match_id")["folder"].nunique()
split_ids = split[split > 1].index
print("\nmatch split across folders:")
print(df[df["match_id"].isin(split_ids)].groupby(["match_id", "folder"])["ts_raw"].agg(["min", "max", "count"]))

utc = pd.to_datetime(df["ts_raw"], unit="s")
print("\nUTC time range per folder:")
print(utc.groupby(df["folder"]).agg(["min", "max"]))

h = df[~df["is_bot"]]
death_rows = h[h["event"].isin(DEATHS)]
deaths = death_rows.groupby("file").size()
journeys = h["file"].nunique()
print("\nhuman journeys:", journeys, "| 0 deaths:", journeys - len(deaths), "| more than 1 death:", (deaths > 1).sum())

first_death = death_rows.groupby("file")["ts_raw"].min().rename("death_ts")
hd = h.join(first_death, on="file")
print("human rows after first death:", (hd["ts_raw"] > hd["death_ts"]).sum())

pos = h[h["event"] == "Position"].sort_values(["file", "ts_raw"])
gaps = pos.groupby("file")["ts_raw"].diff().dropna()
print("seconds between position samples: median", gaps.median(), "| p90", gaps.quantile(0.9))
