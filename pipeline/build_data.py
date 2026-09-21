import json
from datetime import datetime
from pathlib import Path

from PIL import Image

from explore import DATA, load

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "web" / "public"
MAX_SIDE = 2048

MAPS = {
    "AmbroseValley": {"label": "Ambrose Valley", "scale": 900, "ox": -370, "oz": -473, "image": "AmbroseValley_Minimap.png"},
    "GrandRift": {"label": "Grand Rift", "scale": 581, "ox": -290, "oz": -290, "image": "GrandRift_Minimap.png"},
    "Lockdown": {"label": "Lockdown", "scale": 1000, "ox": -500, "oz": -500, "image": "Lockdown_Minimap.jpg"},
}

EVENTS = ["Position", "BotPosition", "Loot", "Kill", "Killed", "BotKill", "BotKilled", "KilledByStorm"]
POSITIONS = ["Position", "BotPosition"]
KEYS = ["user_id", "match_id", "ts_raw", "event", "x", "y", "z"]


def folder_to_date(folder):
    return datetime.strptime(f"{folder} 2026", "%B_%d %Y").date().isoformat()


def dedupe(df):
    dup = df.duplicated(subset=KEYS)
    split = df.groupby("file")["folder"].transform("nunique") > 1
    print("exact duplicate rows by event:")
    print(df.loc[dup, "event"].value_counts().to_string())
    drop = dup & (split | df["event"].isin(POSITIONS))
    print(f"dropped {int(drop.sum())} rows (duplicate position samples plus overlap in the journey stored in two folders)")
    return df[~drop].reset_index(drop=True)


def classify(df):
    j = df.groupby(["match_id", "user_id"]).agg(
        numeric=("is_bot", "first"),
        pos=("event", lambda s: (s == "Position").any()),
        botpos=("event", lambda s: (s == "BotPosition").any()),
    ).reset_index()
    for col in ["numeric", "pos", "botpos"]:
        j[col] = j[col].astype(bool)
    human = ~j["numeric"] | (j["pos"] & ~j["botpos"])
    j["kind"] = human.map({True: "human", False: "bot"})
    j["flag"] = j["numeric"] & human
    print("journeys by kind:", j["kind"].value_counts().to_dict(), "| numeric IDs treated as human:", int(j["flag"].sum()))
    return j[["match_id", "user_id", "kind", "flag"]]


def save_image(name, cfg):
    img = Image.open(DATA / "minimaps" / cfg["image"])
    img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
    img.thumbnail((MAX_SIDE, MAX_SIDE), Image.Resampling.LANCZOS)
    img.save(PUBLIC / "maps" / f"{name}.webp", "WEBP", quality=85)
    return img.size


def build_map(df, journeys, match_date, name, cfg):
    m = df[df["map_id"] == name].copy()
    m["t"] = m["ts_raw"] - m.groupby("match_id")["ts_raw"].transform("min")
    m["u"] = ((m["x"].astype("float64") - cfg["ox"]) / cfg["scale"]).round(4)
    m["v"] = ((m["z"].astype("float64") - cfg["oz"]) / cfg["scale"]).round(4)
    m["e"] = m["event"].map({e: i for i, e in enumerate(EVENTS)})

    spans = m.groupby("match_id")["ts_raw"].agg(["min", "max"]).sort_values("min")
    match_index = {mid: i for i, mid in enumerate(spans.index)}

    js = journeys[journeys["match_id"].isin(match_index)].copy()
    js["match"] = js["match_id"].map(match_index)
    js = js.sort_values(["match", "kind", "user_id"]).reset_index(drop=True)
    player_index = {(r.match_id, r.user_id): i for i, r in enumerate(js.itertuples())}
    m["p"] = [player_index[k] for k in zip(m["match_id"], m["user_id"])]
    m = m.sort_values(["p", "t", "e"])

    counts = m[~m["event"].isin(POSITIONS)].groupby(["match_id", "event"]).size().unstack(fill_value=0)
    matches = []
    for mid, (start, end) in spans.iterrows():
        mj = js[js["match_id"] == mid]
        ev = counts.loc[mid] if mid in counts.index else {}
        matches.append({
            "id": mid,
            "date": match_date[mid],
            "start": int(start),
            "duration": int(end - start),
            "humans": int((mj["kind"] == "human").sum()),
            "bots": int((mj["kind"] == "bot").sum()),
            "events": {k: int(n) for k, n in ev.items() if n},
        })

    players = [
        {"id": r.user_id[:8], "match": int(r.match), "kind": r.kind, "flag": bool(r.flag)}
        for r in js.itertuples()
    ]

    return {
        "map": name,
        "matches": matches,
        "players": players,
        "rows": {c: m[c].tolist() for c in ["p", "t", "u", "v", "e"]},
    }


def main():
    df, bad = load()
    if bad:
        print("unreadable files:", len(bad))
    df["date"] = df["folder"].map(folder_to_date)
    match_date = df.groupby("match_id")["date"].min()
    df = dedupe(df)
    journeys = classify(df)

    (PUBLIC / "data").mkdir(parents=True, exist_ok=True)
    (PUBLIC / "maps").mkdir(parents=True, exist_ok=True)

    index = {"events": EVENTS, "dates": sorted(set(match_date)), "maps": []}
    for name, cfg in MAPS.items():
        width, height = save_image(name, cfg)
        payload = build_map(df, journeys, match_date, name, cfg)
        out = PUBLIC / "data" / f"{name}.json"
        out.write_text(json.dumps(payload, separators=(",", ":")))
        index["maps"].append({
            "id": name,
            "label": cfg["label"],
            "data": f"/data/{name}.json",
            "image": f"/maps/{name}.webp",
            "width": width,
            "height": height,
            "matches": len(payload["matches"]),
        })
        print(f"{name}: {len(payload['matches'])} matches, {len(payload['players'])} journeys, {out.stat().st_size / 1e6:.2f} MB")

    (PUBLIC / "data" / "index.json").write_text(json.dumps(index, indent=2))


if __name__ == "__main__":
    main()
