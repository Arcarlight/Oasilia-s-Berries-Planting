# -*- coding: utf-8 -*-
"""把 data_raw/berries.json 编译成前端可用的 src/data/berries.js。

计算并写入：分级、售价、生长秒数、结果数、种子价、首次可购区域、主色。
用法: python3 tools/gen_game_data.py
"""
import json
import os
import colorsys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data_raw", "berries.json")
OUT = os.path.join(ROOT, "src", "data", "berries.js")

TIER_PRICE = {1: 6, 2: 18, 3: 55, 4: 170, 5: 520, 6: 1600, 7: 5000}
FIRMNESS = {"很柔软": 1, "柔软": 2, "坚硬": 3, "很坚硬": 4, "非常坚硬": 5}
FIRMNESS_CN = {1: "很柔软", 2: "柔软", 3: "坚硬", 4: "很坚硬", 5: "非常坚硬"}

# 每个区域首次可购买种子的树果编号区间（1 起）
REGION_RANGE = [(1, 5), (6, 11), (12, 18), (19, 25), (26, 32),
                (33, 39), (40, 46), (47, 53), (54, 59), (60, 65)]


def tier_of(no):
    if no <= 10:
        return 1
    if no <= 20:
        return 2
    if no <= 30:
        return 3
    if no <= 40:
        return 4
    if no <= 50:
        return 5
    if no <= 60:
        return 6
    return 7


def region_of(no):
    for i, (a, b) in enumerate(REGION_RANGE, 1):
        if a <= no <= b:
            return i
    return 10


def dominant_color(path):
    try:
        im = Image.open(path).convert("RGBA")
    except Exception:  # noqa: BLE001
        return "#8cbf6a"
    im = im.resize((32, 32))
    px = [(r, g, b, a) for r, g, b, a in im.getdata() if a > 128]
    if not px:
        return "#8cbf6a"
    # 用饱和度加权取主色
    best, best_w = None, -1
    buckets = {}
    for r, g, b, a in px:
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if v < 0.15:
            continue
        key = int(h * 12)
        w = s * v
        acc = buckets.setdefault(key, [0.0, 0.0, 0.0, 0.0])
        acc[0] += r * w
        acc[1] += g * w
        acc[2] += b * w
        acc[3] += w
        if acc[3] > best_w:
            best_w = acc[3]
            best = key
    if best is None:
        return "#8cbf6a"
    r, g, b, w = buckets[best]
    if w == 0:
        return "#8cbf6a"
    rr, gg, bb = int(r / w), int(g / w), int(b / w)
    # 拉一点亮度和饱和，避免图标色发灰
    h, s, v = colorsys.rgb_to_hsv(rr / 255, gg / 255, bb / 255)
    s = min(1.0, s * 1.15 + 0.12)
    v = min(1.0, max(0.45, v * 1.05 + 0.08))
    rr, gg, bb = [int(c * 255) for c in colorsys.hsv_to_rgb(h, s, v)]
    return "#%02x%02x%02x" % (rr, gg, bb)


def main():
    data = json.load(open(RAW, encoding="utf-8"))
    out = []
    for idx, b in enumerate(data, 1):
        # 百科表格里编号列有世代差异，抓取时后半段会串行；列表顺序本身是权威的，直接按序编号
        no = idx
        tier = tier_of(no)
        firm = FIRMNESS.get(b.get("firmness", ""), 2)
        base = TIER_PRICE[tier]
        grow_h = b.get("grow8") or b.get("grow_or") or 24
        icon_path = os.path.join(ROOT, b["icon"])
        rec = {
            "id": no,
            "zh": b["zh"],
            "ja": b["ja"],
            "en": b["en"],
            "no": no,
            "firmness": firm,
            "firmnessCn": FIRMNESS_CN[firm],
            "flavor": b.get("flavor", "甜").replace("味", ""),
            "growHours": grow_h,
            "effect": b["effect"],
            "icon": b["icon"],
            "color": dominant_color(icon_path),
            "tier": tier,
            "basePrice": base,
            "growTime": 10 + grow_h * 3,
            "yield": 2 + (tier + 1) // 2,
            "seedCost": max(3, round(base * 0.7)),
            "region": region_of(no),
        }
        out.append(rec)

    lines = [
        "// 自动生成，请勿手改。来源：tools/gen_game_data.py + 神奇宝贝百科",
        "// 字段说明见 DESIGN.md 3.1",
        "window.G = window.G || {};",
        "G.BERRIES = " + json.dumps(out, ensure_ascii=False, indent=0).replace("\n", "") + ";",
        "G.BERRY_BY_ID = Object.fromEntries(G.BERRIES.map(b => [b.id, b]));",
    ]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print("写出", OUT, len(out), "种树果")
    for r in out:
        print(f"  {r['id']:2d} {r['zh']:6s} R{r['region']} T{r['tier']} ₽{r['basePrice']:5d} "
              f"{r['growTime']:4d}s 收{r['yield']} 种₽{r['seedCost']:4d} {r['flavor']} {r['color']}")


if __name__ == "__main__":
    main()
