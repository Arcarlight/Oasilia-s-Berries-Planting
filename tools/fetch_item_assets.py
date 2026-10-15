# -*- coding: utf-8 -*-
"""抓取「树果的树」生长阶段图与商品图标（神奇宝贝百科）。

产物:
  assets/tree/{berryId}_1..5.png   种子 / 发芽 / 长高 / 开花 / 结果
  assets/item/{jam,juice,pie,wine}.png
  assets/item/cube_{辣涩甜苦酸}.png
  assets/item/poffin_{辣涩甜苦酸}.png
  assets/item/CREDITS.md

文件名 → 图床路径用的是 MediaWiki 的 md5 规则，可以直接算，不用逐页解析。
用法: python3 tools/fetch_item_assets.py
"""
import hashlib
import json
import os
import subprocess
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TREE = os.path.join(ROOT, "assets", "tree")
ITEM = os.path.join(ROOT, "assets", "item")
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
REF = "https://wiki.52poke.com/"

# 通用阶段（所有树果共用）。_III 是第三世代图，没有后缀的是第四世代之后补的图，都是 22x32。
GENERIC_STAGES = [(["树果树_种子_III.png", "树果树_种子.png"], 1),
                  (["树果树_发芽_III.png", "树果树_发芽.png"], 2)]
# 按树果单独出图的阶段；后面的世代只有无后缀版本，再不行退回通用发芽图
BERRY_STAGES = [("长高", 3), ("开花", 4), ("结果", 5)]

# 商品基础贴图：类别 → 文件名（口味类另算）
BASE = {
    "jam": "Bag_甜甜蜜_Sprite.png",
    "juice": "Bag_树果汁_Sprite.png",
    "pie": "Bag_心形甜点_Sprite.png",
    "wine": "Bag_果汁牛奶_Sprite.png",
}
CUBE = {"辣": "红色宝可方块_VI.png", "涩": "蓝色宝可方块_VI.png", "甜": "粉色宝可方块_VI.png",
        "苦": "绿色宝可方块_VI.png", "酸": "黄色宝可方块_VI.png"}
POFFIN = {"辣": "辣宝芬.png", "涩": "涩宝芬.png", "甜": "甜宝芬.png",
          "苦": "苦宝芬.png", "酸": "酸宝芬.png"}


def url_of(filename):
    h = hashlib.md5(filename.encode("utf-8")).hexdigest()
    return "https://s1.52poke.com/wiki/%s/%s/%s" % (h[0], h[:2], urllib.parse.quote(filename))


def png_ok(path):
    try:
        with open(path, "rb") as f:
            head = f.read(16)
    except OSError:
        return False
    return head[:8] == b"\x89PNG\r\n\x1a\n" or (head[:4] == b"RIFF" and head[8:12] == b"WEBP")


def to_png(path):
    """图床会按 Accept 协商成 WebP，但文件名是 .png，浏览器按扩展名解析会显示不出来。"""
    with open(path, "rb") as f:
        head = f.read(12)
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        from PIL import Image
        Image.open(path).convert("RGBA").save(path, "PNG")


def grab(candidates, dest):
    """按顺序试若干个候选文件名，第一个拿到的就用。"""
    if isinstance(candidates, str):
        candidates = [candidates]
    if os.path.exists(dest) and png_ok(dest):
        return True
    tmp = dest + ".part"
    for filename in candidates:
        for i in range(2):
            p = subprocess.run(["curl", "-sSL", "--compressed", "--http1.1", "-m", "30",
                                "-A", UA, "-e", REF, "-o", tmp, "-w", "%{http_code}",
                                url_of(filename)], capture_output=True, text=True)
            if p.stdout.strip() == "200" and png_ok(tmp):
                os.replace(tmp, dest)
                to_png(dest)
                return True
            time.sleep(0.4)
    if os.path.exists(tmp):
        os.remove(tmp)
    return False


def main():
    os.makedirs(TREE, exist_ok=True)
    os.makedirs(ITEM, exist_ok=True)
    berries = json.load(open(os.path.join(ROOT, "data_raw", "berries.json"), encoding="utf-8"))

    jobs = []
    for cands, idx in GENERIC_STAGES:
        jobs.append((cands, os.path.join(TREE, "_%d.png" % idx), "通用"))
    for i, b in enumerate(berries, 1):
        for stem, idx in BERRY_STAGES:
            cands = ["树果树_%s_%s_III.png" % (b["zh"], stem),
                     "树果树_%s_%s.png" % (b["zh"], stem),
                     "树果树_%s.png" % stem,
                     "树果树_发芽.png"]
            jobs.append((cands, os.path.join(TREE, "%d_%d.png" % (i, idx)), b["zh"]))
    for cat, fn in BASE.items():
        jobs.append((fn, os.path.join(ITEM, cat + ".png"), cat))
    for fl, fn in CUBE.items():
        jobs.append((fn, os.path.join(ITEM, "cube_%s.png" % fl), "宝可方块"))
    for fl, fn in POFFIN.items():
        jobs.append((fn, os.path.join(ITEM, "poffin_%s.png" % fl), "宝芬"))

    ok, fail = 0, []
    with ThreadPoolExecutor(max_workers=6) as ex:
        for (cands, dest, tag), good in zip(jobs, ex.map(lambda j: grab(j[0], j[1]), jobs)):
            if good:
                ok += 1
            else:
                fail.append("%s (%s)" % (cands[0] if isinstance(cands, list) else cands, tag))

    # 前端统一按 {树果id}_{阶段}.png 取图：
    #  阶段 1/2（种子、发芽）所有树果共用同一张，复制一份成每颗树果各自的文件；
    #  阶段 3/4/5 缺图时退回通用发芽图，保证永远有图可显示。
    import shutil
    fallback = 0
    for i, b in enumerate(berries, 1):
        for _, idx in GENERIC_STAGES:
            dest = os.path.join(TREE, "%d_%d.png" % (i, idx))
            src = os.path.join(TREE, "_%d.png" % idx)
            if not os.path.exists(dest) and os.path.exists(src):
                shutil.copy(src, dest)
        for _, idx in BERRY_STAGES:
            dest = os.path.join(TREE, "%d_%d.png" % (i, idx))
            if not os.path.exists(dest):
                src = os.path.join(TREE, "_2.png")
                if os.path.exists(src):
                    shutil.copy(src, dest)
                    fallback += 1

    with open(os.path.join(ITEM, "CREDITS.md"), "w", encoding="utf-8") as f:
        f.write("# 贴图来源\n\n"
                "全部取自神奇宝贝百科（wiki.52poke.com），版权归 "
                "The Pokémon Company / GAME FREAK / Creatures Inc.，仅用于非商业同人作品。\n\n"
                "## 树果的树（assets/tree）\n"
                "`树果树_种子_III.png`、`树果树_发芽_III.png` 为通用阶段；\n"
                "长高 / 开花 / 结果按树果单独出图，原图 22x32。\n\n"
                "## 商品图标（assets/item）\n"
                "| 类别 | 原作道具 |\n|------|----------|\n"
                "| 果酱 | 甜甜蜜 |\n| 果汁 | 树果汁 |\n"
                "| 宝可方块 | 各色宝可方块 |\n| 宝芬 | 各口味宝芬 |\n"
                "| 树果派 | 心形甜点 |\n| 陈酿果酒 | 果汁牛奶（瓶子当酒器用） |\n")
    print("完成：成功 %d，失败 %d，兜底 %d" % (ok, len(fail), fallback))
    if fail:
        print("失败清单：")
        for x in fail[:20]:
            print("  ", x)


if __name__ == "__main__":
    main()
