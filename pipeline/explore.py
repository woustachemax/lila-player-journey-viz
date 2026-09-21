from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "raw" / "player_data"
OUT = ROOT / "pipeline" / "checks"

MAPS = {
    "AmbroseValley": (900, -370, -473, "AmbroseValley_Minimap.png"),
    "GrandRift": (581, -290, -290, "GrandRift_Minimap.png"),
    "Lockdown": (1000, -500, -500, "Lockdown_Minimap.jpg"),
}


def load():
    frames, bad = [], []
    for path in sorted(DATA.glob("February_*/*")):
        if path.name.startswith("."):
            continue
        try:
            table = pq.read_table(str(path))
        except Exception as e:
            bad.append((path.name, str(e)))
            continue
        df = table.to_pandas()
        df["ts_raw"] = table.column("ts").cast(pa.int64()).to_numpy()
        df["folder"] = path.parent.name
        df["file"] = path.name
        frames.append(df)
    df = pd.concat(frames, ignore_index=True)
    df["event"] = df["event"].apply(lambda b: b.decode("utf-8") if isinstance(b, bytes) else b)
    df["match_id"] = df["match_id"].str.removesuffix(".nakama-0")
    df["is_bot"] = df["user_id"].str.fullmatch(r"\d+")
    return df, bad


def report(df, bad):
    print("rows:", len(df), "| files:", df["file"].nunique(), "| files failed:", len(bad))
    for name, err in bad[:5]:
        print("  failed:", name, err)

    print("\nevents by is_bot:\n", pd.crosstab(df["event"], df["is_bot"]))

    file_user = df["file"].str.split("_", n=1).str[0]
    print("\nfilename vs column user_id mismatches:", (file_user != df["user_id"]).sum())

    span = df.groupby("match_id")["ts_raw"].agg(lambda s: s.max() - s.min())
    print("\nraw ts span per match:\n", span.describe())

    lo, hi = df["ts_raw"].min(), df["ts_raw"].max()
    print("\nraw ts read as unix seconds:", pd.to_datetime(lo, unit="s"), "to", pd.to_datetime(hi, unit="s"))

    print("\nmatches split across folders:", (df.groupby("match_id")["folder"].nunique() > 1).sum())
    print("matches with more than one map:", (df.groupby("match_id")["map_id"].nunique() > 1).sum())

    per_match = df.groupby("match_id").agg(
        humans=("user_id", lambda s: s[~s.str.fullmatch(r"\d+")].nunique()),
        bots=("user_id", lambda s: s[s.str.fullmatch(r"\d+")].nunique()),
    )
    print("\nplayers per match:\n", per_match.describe())

    print("\nmatches per map and folder:\n", df.groupby(["map_id", "folder"])["match_id"].nunique().unstack(fill_value=0))


def readme_example():
    scale, ox, oz, _ = MAPS["AmbroseValley"]
    u, v = (-301.45 - ox) / scale, (-355.55 - oz) / scale
    print("\nreadme example pixel:", round(u * 1024), round((1 - v) * 1024), "(expected 78 890)")


def overlay(df):
    OUT.mkdir(exist_ok=True)
    print()
    for name, (scale, ox, oz, img_name) in MAPS.items():
        m = df[df["map_id"] == name]
        u = (m["x"] - ox) / scale
        v = (m["z"] - oz) / scale
        img = Image.open(DATA / "minimaps" / img_name)
        w, h = img.size
        outside = ((u < 0) | (u > 1) | (v < 0) | (v > 1)).mean()
        print(f"{name}: image {w}x{h}, {len(m)} rows, {outside:.2%} outside map bounds")
        colors = m["is_bot"].map({True: "red", False: "cyan"}).tolist()
        plt.figure(figsize=(10, 10))
        plt.imshow(img)
        plt.scatter(u * w, (1 - v) * h, s=1, c=colors, alpha=0.4)
        plt.axis("off")
        plt.savefig(OUT / f"check_{name}.png", dpi=100, bbox_inches="tight")
        plt.close()


if __name__ == "__main__":
    df, bad = load()
    report(df, bad)
    readme_example()
    overlay(df)
