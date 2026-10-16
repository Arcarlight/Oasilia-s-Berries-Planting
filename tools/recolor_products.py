#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 化け猫缶 的图标按口味换色，给果酱 / 果汁 / 果酒 / 树果派各出五张图。

原来五个口味共用一张百科的「甜甜蜜」，只靠右下角那颗树果区分，太偷懒了。
这个脚本拿一个罐子当底，转 HSV 之后只换"果酱本体"的色相：

    · 饱和度高的像素 = 果酱本体 → 换成目标色相，**明度原样保留**（高光和阴影还在）
    · 饱和度低的像素 = 盖子、标签、描边 → 原样不动

授权上没问题：化け猫缶 明确允许加工，且加工后再配布也自由。

用法（需要带 Pillow 的解释器；macOS 系统自带的 python3 没有，用打包的那个）：
    "$DSH_PYTHON" tools/recolor_jam.py /tmp/neko [罐子编号]
    # 例如：
    # /Users/<你>/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3 \
    #     tools/recolor_products.py /tmp/neko

化け猫缶 的图标是 24×24 GIF，源文件在 /tmp/neko 之类的临时目录里，不随仓库走 ——
要重跑得自己重新下一份（站点：http://neko.moo.jp/BS/ ，图标页 /BS/main/3/5823.htm）。
"""
import colorsys
import glob
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "item"

# 每一类用哪个图标当底。找法是：把 24×24 的图标全渲染出来，对每一类挑
# 「该变色的那部分能被色相替换吃到、不该变的（杯子/酥皮/盖子）留得住」的那个。
#
#   果酱 #0284  罐身整块都能吃色
#   果汁 #0394  只有杯里的液体吃色，杯子本身是低饱和的，留住了
#   果酒 #0329  瓶身和标签跟着换
#   树果派 #0272 圆扁的果子酥。注意 #0277 是牛排不是派（看走眼过一次），
#                  #0271 是带盘子的果塔、已经被「挞」占用，所以派只能挑这个
TARGETS = [
    ("jam", 284),
    ("juice", 394),
    ("wine", 329),
    ("pie", 272),
]

# 五个口味的主题色，和 src/data/products.js 里的 FLAVOR_COLOR 保持一致
FLAVORS = [("辣", "#e05635"), ("涩", "#714fda"), ("甜", "#ff9861"), ("苦", "#77d2e2"), ("酸", "#e9d93f")]

SAT_MIN = 0.22       # 高于这个饱和度才当成"果酱本体"
VAL_MIN = 0.12       # 太黑的像素（描边）不动
SAT_SCALE = 0.82     # 饱和度压一点，配合整体偏灰的调子


def parse_hex(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def desaturate(im, keep=0.12):
    """把颜色抽掉，只留一点残余 —— 用来做「无味」那版。
    明度不动，所以形状和高光还在，看着就是同一件东西没了味道。"""
    out = im.copy()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > 0.05:
                rr, gg, bb = colorsys.hsv_to_rgb(h, s * keep, v)
                out.putpixel((x, y), (int(rr * 255), int(gg * 255), int(bb * 255), a))
    return out


def recolor(im, target):
    th, ts, _ = colorsys.rgb_to_hsv(*[c / 255 for c in parse_hex(target)])
    out = im.copy()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if a == 0:
                continue
            _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > SAT_MIN and v > VAL_MIN:
                rr, gg, bb = colorsys.hsv_to_rgb(th, min(1.0, ts * SAT_SCALE), v)
                out.putpixel((x, y), (int(rr * 255), int(gg * 255), int(bb * 255), a))
    return out


def main():
    from PIL import Image
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    src_dir = sys.argv[1]
    files = sorted(f for f in glob.glob(os.path.join(src_dir, "*"))
                   if f.lower().endswith((".gif", ".png")) and Image.open(f).size == (24, 24))
    if not files:
        print("在那个目录里没找到 24×24 的图标")
        return 1
    only = sys.argv[2] if len(sys.argv) > 2 else None
    OUT.mkdir(parents=True, exist_ok=True)
    for cat, idx in TARGETS:
        if only and only != cat:
            continue
        base = Image.open(files[idx]).convert("RGBA")
        print("%s ← #%d %s" % (cat, idx, os.path.basename(files[idx])))
        for flavor, color in FLAVORS:
            path = OUT / ("%s_%s.png" % (cat, flavor))
            recolor(base, color).save(path)
            print("    %s  ← %s" % (path.name, color))
        # 无味那版：把颜色抽掉
        path = OUT / ("%s_无味.png" % cat)
        desaturate(base).save(path)
        print("    %s  ← 抽掉颜色" % path.name)

    # 宝可方块 / 宝芬 用的是百科的成图，按口味本来就有五张；
    # 无味那版直接拿「甜」那张抽色。
    for cat, src in (("cube", "cube_甜.png"), ("poffin", "poffin_甜.png")):
        p = OUT / src
        if p.exists():
            out = OUT / ("%s_无味.png" % cat)
            desaturate(Image.open(p).convert("RGBA")).save(out)
            print("    %s  ← 由 %s 抽色" % (out.name, src))
    return 0


if __name__ == "__main__":
    sys.exit(main())
