# -*- coding: utf-8 -*-
"""从神奇宝贝百科抓取 64 种树果的基础数据与图标。

产物:
  data_raw/berries.json   树果数据（编号、中/日英文名、硬度、口味、颜色、生长时间、效果、图标路径）
  assets/berry/*.png      树果图标（30x30）

用法: python3 tools/fetch_berry_data.py
网络说明: wiki.52poke.com 图床需要 Referer 头，且对 python-urllib 不稳定，这里统一走 curl。
"""
import html
import json
import os
import re
import subprocess
import time
import urllib.parse

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36")
REF = "https://wiki.52poke.com/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data_raw")
BERRY_DIR = os.path.join(ROOT, "assets", "berry")
WIKI = "https://wiki.52poke.com"


def curl(url, binary=False, tries=4):
    out = os.path.join(RAW, "_tmp.bin")
    for i in range(tries):
        p = subprocess.run(
            ["curl", "-sSL", "--compressed", "-m", "45", "-A", UA, "-e", REF,
             "-o", out, "-w", "%{http_code}", url],
            capture_output=True, text=True)
        code = p.stdout.strip()
        if code == "200" and os.path.exists(out) and os.path.getsize(out) > 0:
            with open(out, "rb") as f:
                data = f.read()
            if binary:
                return data
            return data.decode("utf-8", "replace")
        time.sleep(1.0 + i)
    return None if not binary else b""


def strip_tags(s):
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"\s+", "", html.unescape(s)).strip()


def clean_text(s):
    s = re.sub(r"<[^>]+>", "", s)
    return re.sub(r"[ \t\u00a0]+", " ", html.unescape(s)).strip()


def main():
    os.makedirs(RAW, exist_ok=True)
    os.makedirs(BERRY_DIR, exist_ok=True)

    page = curl(WIKI + "/wiki/" + urllib.parse.quote("树果"))
    if not page:
        raise SystemExit("无法获取树果页面")
    tables = re.findall(r"<table.*?</table>", page, flags=re.S)
    table = max(tables, key=len)
    rows = re.findall(r"<tr.*?</tr>", table, flags=re.S)

    berries, seen = [], set()
    for row in rows:
        if "<td" not in row:
            continue
        cells = re.findall(r"<t[dh][^>]*>.*?</t[dh]>", row, flags=re.S)
        if len(cells) < 16:
            continue
        texts = [strip_tags(c) for c in cells]
        img = re.search(r'<img[^>]*src="(//s1\.52poke\.com/wiki/[^"]+Bag_[^"]+_Sprite\.png)"', row)
        link = re.search(r'href="(/wiki/[^"]+)"[^>]*title="([^"]+)"', row)
        nums = [t for t in texts if t.startswith("No.")]
        if not img or not link or not nums:
            continue
        name = link.group(2)
        if name in seen:
            continue
        seen.add(name)
        berries.append({
            "zh": name,
            # 表格列: 图标x10, 中文, 日文, 英文, 引入世代, 编号, 编号, 效果
            "ja": texts[-6] if len(texts) >= 6 else "",
            "en": texts[-5] if len(texts) >= 5 else "",
            "no": nums[0].replace("No.", ""),
            "effect": texts[-1],
            "icon_url": "https:" + img.group(1),
            "page": link.group(1),
        })

    # 已抓过分类就不重复拉取（脚本可反复运行）
    old = {}
    old_path = os.path.join(RAW, "berries.json")
    if os.path.exists(old_path):
        try:
            old = {b["zh"]: b for b in json.load(open(old_path, encoding="utf-8"))}
        except Exception:  # noqa: BLE001
            old = {}

    print("树果条目:", len(berries))
    for i, b in enumerate(berries, 1):
        cached = old.get(b["zh"], {})
        if cached.get("cats"):
            for k in ("cats", "firmness", "flavor", "color", "grow8", "grow_or"):
                if k in cached:
                    b[k] = cached[k]
            cats = b["cats"]
        else:
            bp = curl(WIKI + b["page"])
            if not bp:
                print("  ! 页面失败", b["zh"])
                continue
            m = re.search(r'"wgCategories":(\[.*?\])', bp)
            cats = json.loads(m.group(1)) if m else []
            b["cats"] = cats
        for c in cats:
            if c.startswith("硬度为") and c.endswith("的树果"):
                b["firmness"] = c[3:-3]
            if c.endswith("味树果（第四世代起）"):
                b["flavor"] = c[:-9]
            if c.startswith("颜色为") and c.endswith("的树果（ORAS）"):
                b["color"] = c[3:-11]
            if c.startswith("生长") and c.endswith("小时的树果（第八世代）"):
                b["grow8"] = int(re.sub(r"\D", "", c))
            if c.startswith("生长") and c.endswith("小时的树果（ORAS）"):
                b["grow_or"] = int(re.sub(r"\D", "", c))
        fn = urllib.parse.unquote(b["icon_url"].rsplit("/", 1)[-1])
        local = os.path.join(BERRY_DIR, fn)
        if not os.path.exists(local):
            data = curl(b["icon_url"], binary=True)
            if data:
                with open(local, "wb") as f:
                    f.write(data)
                # 图床会按 Accept 协商成 WebP，但文件名还是 .png，浏览器按扩展名解析会显示不出来
                try:
                    from PIL import Image
                    with open(local, "rb") as f:
                        head = f.read(12)
                    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
                        Image.open(local).convert("RGBA").save(local, "PNG")
                except ImportError:
                    print("  ! 没有 Pillow，图标可能仍是 WebP 内容，请检查", fn)
        b["icon"] = "assets/berry/" + fn
        b.pop("icon_url", None)
        print(f"  {i:2d}/{len(berries)} {b['zh']:6s} No.{b['no']:>2s} 硬度={b.get('firmness','?'):4s} "
              f"味={b.get('flavor','?'):2s} 色={b.get('color','?'):3s} 生长={b.get('grow8','?')}h")
        time.sleep(0.15)

    with open(os.path.join(RAW, "berries.json"), "w", encoding="utf-8") as f:
        json.dump(berries, f, ensure_ascii=False, indent=1)
    print("写出 data_raw/berries.json:", len(berries))


if __name__ == "__main__":
    main()
