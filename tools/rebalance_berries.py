#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把树果数值调平：消灭「陷阱果」，并引入精品 / 量产两型。

## 问题

种地真正的指标是「每格每小时的收益」：

    密度 = 果价 × 产量 ÷ 生长时间

原来的 `basePrice` 是手写档位（6 / 18 / 55 / 170 / 520 / 1600 / 5000），
`growHours` 是另一条线独立飘（8~96h），两者没绑在一起。后果：

    · 同区域内差 3~7 倍 —— 木子果、番荔果、草蚕果、谜芝果是纯陷阱，种了不如不种
    · 区域 9 最好的果子（83.3）还不如区域 8 最好的（111.1）
    · 谜芝果（区域 10）比霹霹果（区域 8）还差

## 做法

**一、每个区域定一个密度基准 D(r)**

    D(r) = max(本区现在最好的那个, D(r-1) × 1.08)

取「本区现在最好的」是为了尽量不动已经平衡好的经济 —— 玩家反正只种最好的那个，
把差果子抬上来只是让更多内容可用，不会让最优解变强。

**二、长得久的，单位收益更高（耐心加成）**

    密度目标 = D(r) × (生长时间 ÷ 本区最短的生长时间) ^ 0.25

最长的那颗比最短的高 7%~32%，所以「快收多轮」和「慢收高质」都成立，
没有哪种是纯亏的。

**三、同口味分两型**

同一个「区域 + 口味」里按生长时间排名：排前面的（长得快的）是**精品**——
果子少、单价高；后面的（长得慢的）是**量产**——果子多、单价低。
两型密度一样，所以是风格选择，不是强弱选择。

`产量 = 本区基础产量 + (排名≥1 ? 1 : 0) + (排名≥3 ? 1 : 0)`，最多 +2。

因为「本区基础产量」逐区递增而密度只涨 8%，所以量产型跨区域的表现是：
**产量涨、单价反而略降** —— 这就是"比上一代同口味果子多但不见得更贵"。

**四、反推单价**

    单价 = 密度目标 × 生长时间 ÷ 产量

再取两位有效数字（和原来的档位手感一致），种子价按原来 0.70 的比例跟着走。

用法：
    python3 tools/rebalance_berries.py           # 预览，不写文件
    python3 tools/rebalance_berries.py --write   # 写回 src/data/berries.js
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / "src" / "data" / "berries.js"

GROWTH = 1.08          # 区域之间密度至少涨这么多
PATIENCE_POW = 0.25    # 耐心加成的指数
SPREAD_CAP = 2         # 同区内量产型最多比精品型多几颗
SEED_RATIO = 0.70      # 种子价 ÷ 果价（原来就是这个比例）

# 每个区域的基础产量（精品型的产量），逐区递增
# 每个区域的基础产量（精品型的产量）。
# 不能简单地 +1/+2 递增：量产型的加档取决于那一区有几个同口味果子，
# 所以各区的平均产量会飘（r7 大多是单果子口味，平均反而被 r6 压过去）。
# 这里是按「基准 + 实际加档」凑出单调的平均产量定的。
BASE_YIELD = {1: 3, 2: 3, 3: 3, 4: 4, 5: 4, 6: 5, 7: 7, 8: 7, 9: 8, 10: 8}


def density(b):
    return b["basePrice"] * b["yield"] / b["growHours"]


def nice(v):
    """取两位有效数字 —— 和原来 6/18/55/170/520/1600/5000 那种档位手感一致。"""
    if v <= 0:
        return 1
    import math
    mag = 10 ** (math.floor(math.log10(v)) - 1)
    return max(1, int(round(v / mag)) * mag)


def load():
    s = TARGET.read_text(encoding="utf-8")
    m = re.search(r"G\.BERRIES = (\[.*?\]);\n", s, re.S)
    if not m:
        raise SystemExit("没找到 G.BERRIES")
    return s, json.loads(m.group(1))


def plan(berries):
    by_region = {}
    for b in berries:
        by_region.setdefault(b["region"], []).append(b)

    # 一、每区域的密度基准
    #
    # 注意要比的是**耐心加成之后的实际值**，不是基准值：
    # 一个区里生长时间跨度大（比如 r5 从 24h 到 60h），耐心加成会把它的实际
    # 天花板抬高 25%，只按基准值推进的话下一区反而会低下去（踩过）。
    targets = {}
    span = {}
    for r in sorted(by_region):
        hs = [b["growHours"] for b in by_region[r]]
        span[r] = (max(hs) / min(hs)) ** PATIENCE_POW
    for r in sorted(by_region):
        best = max(density(b) for b in by_region[r])
        if r - 1 in targets:
            best = max(best, targets[r - 1] * span[r - 1] * GROWTH)
        targets[r] = best

    # 二、同区内按生长时间排名（慢的排后面），快的是精品、慢的是量产
    for r, group in by_region.items():
        hmin = min(b["growHours"] for b in group)
        order = sorted(group, key=lambda b: (b["growHours"], b["id"]))
        rank = {}
        for i, b in enumerate(order):
            # 生长时间相同的并排，算同一档
            same = [x for x in order if x["growHours"] == b["growHours"]]
            rank[b["id"]] = min(i for x in same for i in [order.index(x)])

        for b in group:
            rk = rank[b["id"]]
            # 把「排名」压成 0/1/2 三档，避免一个组里散太开
            step = 0 if rk == 0 else (1 if rk < 3 else SPREAD_CAP)
            step = min(step, SPREAD_CAP)
            b["_archetype"] = "精品" if rk == 0 else "量产"
            b["_rank"] = rk
            b["yield"] = BASE_YIELD[r] + step
            pat = (b["growHours"] / hmin) ** PATIENCE_POW
            b["basePrice"] = nice(targets[r] * pat * b["growHours"] / b["yield"])
            b["seedCost"] = max(1, int(round(b["basePrice"] * SEED_RATIO)))
    # 三、让量产型"多个头但不见得更贵"
    #
    # 跨代的密度差一般是 1.4~3.2 倍，想保住上一代的价钱就得让产量翻倍 —— 不现实。
    # 所以只在跨度小的那几代做，而且允许它比目标密度低一点（最多 15%）：
    # 拿一点单位收益，换"这一代果子比上一代多、价钱还没涨"。
    holds = []
    for r in sorted(by_region):
        if r - 1 not in by_region:
            continue
        for b in by_region[r]:
            if b["_archetype"] != "量产":
                continue
            # 上一代同口味里产量最高的那颗
            prevs = [x for x in by_region[r - 1] if x["flavor"] == b["flavor"]]
            if not prevs:
                continue
            pb = max(prevs, key=lambda x: x["yield"])
            if pb["basePrice"] >= b["basePrice"]:
                continue                      # 价钱本来就没涨
            pat = (b["growHours"] / min(x["growHours"] for x in by_region[r])) ** PATIENCE_POW
            tgt = targets[r] * pat
            # 按住上一代的价钱，产量由密度目标反推
            y = int(round(tgt * b["growHours"] / pb["basePrice"]))
            if y <= pb["yield"] or y > BASE_YIELD[r] + 4:
                continue                      # 产量涨不上去，或者涨得离谱，就算了
            if (pb["basePrice"] * y / b["growHours"]) < tgt * 0.85:
                continue                      # 低太多就成陷阱了
            b["basePrice"] = pb["basePrice"]
            b["yield"] = y
            b["seedCost"] = max(1, int(round(b["basePrice"] * SEED_RATIO)))
            b["_hold"] = True
            holds.append((r, b, r - 1, pb))
    return targets, by_region, holds


def report(berries, targets, by_region, holds):
    print("每区域的密度：目标 → 实际（最低 / 最高）")
    for r in sorted(by_region):
        ds = sorted(density(b) for b in by_region[r])
        ok = "✓" if ds[0] >= targets[r] * 0.85 else "✗"
        print("  r%-2d  目标 %8.1f   实际 %8.1f ~ %8.1f   %s" % (r, targets[r], ds[0], ds[-1], ok))
    print()
    print("跨区域最优是否递增：")
    prev = None
    for r in sorted(by_region):
        best = max(by_region[r], key=density)
        mark = "✓"
        if prev and density(best) <= prev[0]:
            mark = "✗ 比 r%d 的 %s 还差" % (prev[1], prev[2])
        print("  r%-2d %s(%s, y%d, ₽%d) %.1f  %s" %
              (r, best["zh"], best["_archetype"], best["yield"], best["basePrice"], density(best), mark))
        if not prev or density(best) > prev[0]:
            prev = (density(best), r, best["zh"])
    print()
    print("「比上一代同口味产量更大、但不见得更贵」的例子：")
    for r, b, pr, pb in holds:
        print("  r%d %s(%s, y%d, ₽%d)  ←  r%d %s(y%d, ₽%d)   产量 +%d，价钱持平" %
              (r, b["zh"], b["_archetype"], b["yield"], b["basePrice"],
               pr, pb["zh"], pb["yield"], pb["basePrice"], b["yield"] - pb["yield"]))
    if not holds:
        print("  （没有）")
    print("  共 %d 对" % len(holds))
    print("  （跨代密度差普遍 1.9~3.2 倍，要保住价钱得让产量翻两三倍，"
          "所以只有跨度小的那一代做得到）")
    print()
    print("同一个区域里「精品 / 量产」的搭配（这才是这个取舍的主战场）：")
    shown = 0
    for r in sorted(by_region):
        for flavor in ["辣", "涩", "甜", "苦", "酸"]:
            g = [b for b in by_region[r] if b["flavor"] == flavor]
            fine = [b for b in g if b["_archetype"] == "精品"]
            bulk = [b for b in g if b["_archetype"] == "量产"]
            if not fine or not bulk:
                continue
            f, k = fine[0], bulk[0]
            print("  r%-2d %s：%s 少而贵（y%d ₽%d）／ %s 多而便宜（y%d ₽%d）" %
                  (r, flavor, f["zh"], f["yield"], f["basePrice"], k["zh"], k["yield"], k["basePrice"]))
            shown += 1
    if not shown:
        print("  （没有）")


def main():
    s, berries = load()
    targets, by_region, holds = plan(berries)
    report(berries, targets, by_region, holds)
    if "--write" not in sys.argv:
        print("\n（预览模式，没写文件。加 --write 才写回）")
        return 0
    for b in berries:
        b.pop("_archetype", None)
        b.pop("_rank", None)
        b.pop("_hold", None)
    out = json.dumps(berries, ensure_ascii=False, separators=(",", ": "))
    s = re.sub(r"G\.BERRIES = \[.*?\];\n", "G.BERRIES = " + out + ";\n", s, count=1, flags=re.S)
    TARGET.write_text(s, encoding="utf-8")
    print("\n已写回 %s" % TARGET.relative_to(ROOT))
    return 0


if __name__ == "__main__":
    sys.exit(main())
