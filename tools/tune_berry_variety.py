# -*- coding: utf-8 -*-
"""树果差分：把「同区域 + 同味道 + 同生长时间 + 同产量 + 同单价」的树果拆开。

问题：这批数据（tools/gen_game_data.py 生成）里，同一区域同味道的几颗树果
经常数值完全一样 —— 商店里一看，三颗都是「16h／收3／果₽19」，等于没有选择。

做法：同一组里按「快 ↔ 慢」排开，三件事一起动：

    T' = T × f            生长时间
    Y' = Y + d            单次产量（+d 就是一次多收几个）
    P' = P × f × Y / Y'   单价（补偿产量变化）

于是 `P' × Y' / T' == P × Y / T`（四舍五入误差内），**每块地每小时的收益不变**，
变的只是节奏：快的那颗「周转快、一次收得少、单价高」，慢的那颗「等得久、
一次收得多、单价低」。种子价 `seedCost' = P' × (seedCost / P)`，保持原来的「种子价／果价」比例。

f 取 2^(k×0.3) 的等比数列、几何平均为 1，所以一组里最慢的比最快的慢约 1.5 倍。
每组的快慢方向按组序号奇偶对调，免得"编号靠前的永远最快"。

用法：
    python3 tools/tune_berry_variety.py           # 预览
    python3 tools/tune_berry_variety.py --write   # 写回 src/data/berries.js
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BERRY = ROOT / "src" / "data" / "berries.js"

SPREAD = 0.3        # 每组快慢跨度，0.3 → 最慢/最快 ≈ 1.5 倍
DY_MAX = 2          # 单次产量最多 ±2
Y_MIN, Y_MAX = 2, 9


def load():
    src = BERRY.read_text(encoding="utf-8")
    m = re.search(r"G\.BERRIES = (\[.*?\]);\n", src, re.S)
    head = src[:m.start(1)]
    tail = src[m.end(1):]
    return json.loads(m.group(1)), head, tail


def dump(arr):
    rows = [json.dumps(b, ensure_ascii=False, separators=(",", ": ")) for b in arr]
    return "[\n" + ",\n".join(rows) + "]"


def key(b):
    return (b["region"], b["flavor"], b["growHours"], b["yield"], b["basePrice"])


def main():
    arr, head, tail = load()
    groups = {}
    for b in arr:
        groups.setdefault(key(b), []).append(b)
    dups = {k: v for k, v in groups.items() if len(v) > 1}

    changed = 0
    for gi, (k, members) in enumerate(sorted(dups.items())):
        members.sort(key=lambda b: b["id"])
        n = len(members)
        flip = gi % 2 == 1          # 一半的组把快慢反过来
        for i, b in enumerate(members):
            kk = (i - (n - 1) / 2.0) * SPREAD
            if flip:
                kk = -kk
            f = 2.0 ** kk
            T, Y, P = b["growTime"], b["yield"], b["basePrice"]
            dy = max(-DY_MAX, min(DY_MAX, int(round(kk / SPREAD * 1.0))))
            Y2 = max(Y_MIN, min(Y_MAX, Y + dy))
            T2 = max(6, int(round(T * f)))
            P2 = max(1, int(round(P * f * Y / float(Y2))))
            H2 = max(1, int(round(b["growHours"] * f)))
            # 种子价跟着单价走、保持原来的「种子价 / 果价」比例 ——
            # 不能直接 ×f：那样比例会被 y 的变化带歪（单测会报"种子价还是果价的七成上下"）
            S2 = max(1, int(round(P2 * b["seedCost"] / float(P))))
            if (T2, Y2, P2, H2, S2) == (T, Y, P, b["growHours"], b["seedCost"]):
                continue
            print("%s%-6s %2dh/收%d/₽%-5d → %2dh/收%d/₽%-5d  （每地每小时 %.2f → %.2f）" % (
                "  " if changed else "", b["zh"], b["growHours"], Y, P, H2, Y2, P2,
                P * Y / float(T), P2 * Y2 / float(T2)))
            b["growTime"], b["yield"], b["basePrice"] = T2, Y2, P2
            b["growHours"], b["seedCost"] = H2, S2
            changed += 1

    # 写完自检：同区域+同味道+同数值的组合不该再剩下
    left = {}
    for b in arr:
        left.setdefault(key(b), []).append(b["zh"])
    still = {k: v for k, v in left.items() if len(v) > 1}
    print("\n改了 %d 颗；改完还剩 %d 组同数值" % (changed, len(still)))
    for k, v in still.items():
        print("  还剩：区%d %s %sh 收%d ₽%d → %s" % (k[0], k[1], k[2], k[3], k[4], ",".join(v)))

    if "--write" in sys.argv:
        BERRY.write_text(head + dump(arr) + tail, encoding="utf-8")
        print("已写回", BERRY)
    else:
        print("（预览模式，加 --write 才写回）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
