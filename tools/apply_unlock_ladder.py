# -*- coding: utf-8 -*-
"""重写 src/data/regulars.js 里 60 位常客的解锁阶梯。

解锁条件是这一作的主要节奏阀门：条件定得太高，玩家会在区域里干等。
这里集中管理，方便用 tools/simtest.html 反复验证。

用法: python3 tools/apply_unlock_ladder.py
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "src", "data", "regulars.js")

# 每区 6 位，按顺序
LADDER = {
    1: [("harvest", 100), ("harvest", 250), ("harvest", 400),
        ("harvest", 600), ("harvest", 800), ("harvest", 1100)],
    2: [("harvest", 2000), ("species", 7), ("harvest", 4500),
        ("species", 9), ("crafted", 200), ("revenue", 60000)],
    3: [("crafted", 300), ("revenue", 100000), ("crafted", 700),
        ("species", 14), ("revenue", 250000), ("revenue", 450000)],
    4: [("crafted", 1200), ("revenue", 800000), ("crafted", 2200),
        ("affinity", 1), ("revenue", 1600000), ("revenue", 2500000)],
    5: [("crafted", 2500), ("revenue", 4000000), ("crafted", 4000),
        ("affinity", 2), ("revenue", 7000000), ("revenue", 10000000)],
    6: [("crafted", 4000), ("revenue", 20000000), ("crafted", 7000),
        ("affinity", 3), ("revenue", 30000000), ("revenue", 45000000)],
    7: [("crafted", 9000), ("revenue", 120000000), ("crafted", 15000),
        ("affinity", 4), ("revenue", 200000000), ("revenue", 300000000)],
    8: [("crafted", 12000), ("revenue", 500000000), ("crafted", 20000),
        ("affinity", 4), ("revenue", 900000000), ("revenue", 1400000000)],
    9: [("crafted", 26000), ("revenue", 3500000000), ("crafted", 42000),
        ("affinity", 5), ("revenue", 6500000000), ("revenue", 10000000000)],
    10: [("crafted", 55000), ("revenue", 28000000000), ("crafted", 90000),
         ("affinity", 5), ("revenue", 50000000000), ("revenue", 80000000000)],
}

# 每个区域在图鉴里可得的树果种类上限（用于校验 species 条件是否可达）
AVAILABLE_SPECIES = {1: 5, 2: 11, 3: 18, 4: 25, 5: 32, 6: 39, 7: 46, 8: 53, 9: 59, 10: 65}


def main():
    src = open(PATH, encoding="utf-8").read()
    blocks = [m for m in re.finditer(r"unlock: \{[^}]*\},", src)]
    assert len(blocks) == 60, f"期望 60 条 unlock，实际 {len(blocks)}"
    # 按 region 字段把 60 条分组；文件中顺序就是区域顺序（每区 6 条）
    out = []
    pos = 0
    for i, m in enumerate(blocks):
        region = i // 6 + 1
        kind, value = LADDER[region][i % 6]
        out.append(src[pos:m.start()])
        out.append('unlock: { type: "%s", value: %d },' % (kind, value))
        pos = m.end()
    out.append(src[pos:])
    new = "".join(out)

    # 自检：species 条件必须在该区域可达
    for i, m in enumerate(re.finditer(r'unlock: \{ type: "species", value: (\d+) \}', new)):
        region = new[:m.start()].count("unlock:") + 1
        # 用最近一次 region 声明判断属于哪个区
    for region in range(1, 11):
        for kind, value in LADDER[region]:
            if kind == "species":
                assert value < AVAILABLE_SPECIES[region], \
                    f"区域 {region} 要求 {value} 种树果，但只开放到 {AVAILABLE_SPECIES[region]} 种"

    open(PATH, "w", encoding="utf-8").write(new)
    print("已更新", PATH)
    for region in range(1, 11):
        print("  R%-2d" % region, " / ".join(f"{k} {v}" for k, v in LADDER[region]))


if __name__ == "__main__":
    main()
