import pandas as pd

from build_data import MAPS, classify, dedupe
from explore import load

DEATHS = ["Killed", "BotKilled", "KilledByStorm"]
GRID = 16


def prepare():
    df, _ = load()
    df = dedupe(df)
    df = df.merge(classify(df), on=["match_id", "user_id"])
    df["t"] = df["ts_raw"] - df.groupby("match_id")["ts_raw"].transform("min")
    ox = df["map_id"].map({k: c["ox"] for k, c in MAPS.items()})
    oz = df["map_id"].map({k: c["oz"] for k, c in MAPS.items()})
    scale = df["map_id"].map({k: c["scale"] for k, c in MAPS.items()})
    df["u"] = (df["x"].astype("float64") - ox) / scale
    df["v"] = (df["z"].astype("float64") - oz) / scale
    return df[df["kind"] == "human"]


def summarize(h):
    g = h.groupby(["map_id", "match_id", "user_id"])
    j = pd.DataFrame({
        "died": g["event"].agg(lambda s: s.isin(DEATHS).any()),
        "bot_kills": g["event"].agg(lambda s: (s == "BotKill").sum()),
        "loot": g["event"].agg(lambda s: (s == "Loot").sum()),
        "length": g["t"].max() - g["t"].min(),
    }).reset_index()
    j["died"] = j["died"].astype(bool)
    return j


def cells(d):
    col = (d["u"].clip(0, 0.9999) * GRID).astype(int).astype(str)
    row = ((1 - d["v"]).clip(0, 0.9999) * GRID).astype(int).astype(str)
    return (col + "," + row).value_counts()


def report(h, j):
    print("\nhuman journeys:", len(j), "| survived:", f"{(~j['died']).mean():.1%}")

    per = j.groupby("map_id").agg(
        journeys=("died", "size"),
        survived_pct=("died", lambda s: 100 * (~s).mean()),
        bot_kills=("bot_kills", "mean"),
        loot=("loot", "mean"),
        median_minutes=("length", lambda s: s.median() / 60),
    )
    print("\nper map:\n", per.round(1).to_string())

    matches = h.groupby("map_id")["match_id"].nunique()
    print("\nshare of matches per map (%):", (100 * matches / matches.sum()).round(1).to_dict())

    deaths = h[h["event"].isin(DEATHS)]
    print("\ndeaths by type per map:\n", pd.crosstab(deaths["map_id"], deaths["event"], margins=True).to_string())

    print("\nsurvived vs died, average per journey:\n", j.groupby("died")[["loot", "bot_kills"]].mean().round(1).to_string())

    print("\nmedian minute of death by type:\n", (deaths.groupby("event")["t"].median() / 60).round(1).to_string())

    storm = deaths[deaths["event"] == "KilledByStorm"]
    print("\nstorm deaths (u = left to right, v = bottom to top):")
    print(storm.groupby("map_id").agg(
        n=("u", "size"),
        mean_u=("u", "mean"),
        mean_v=("v", "mean"),
        median_minute=("t", lambda s: s.median() / 60),
    ).round(2).to_string())

    print(f"\ndeath hotspots on a {GRID}x{GRID} grid (col,row from top-left):")
    for name, d in deaths.groupby("map_id"):
        c = cells(d)
        top = c.head(5)
        print(f"{name}: {len(d)} deaths in {len(c)} cells, top 5 cells hold {top.sum() / len(d):.0%}")
        print("   ", ", ".join(f"{k} ({n})" for k, n in top.items()))

    pos = h[h["event"] == "Position"]
    busiest = GRID * GRID // 10
    print(f"\ntraffic on a {GRID}x{GRID} grid:")
    for name, p in pos.groupby("map_id"):
        c = cells(p)
        print(f"{name}: {len(c)} of {GRID * GRID} cells visited, busiest {busiest} cells hold {c.head(busiest).sum() / len(p):.0%} of samples")


if __name__ == "__main__":
    h = prepare()
    report(h, summarize(h))
