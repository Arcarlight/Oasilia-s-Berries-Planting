# -*- coding: utf-8 -*-
"""并发下载 PMD Sprite Repository (PMDCollab/SpriteCollab) 的立绘与动画表。

原始仓库: https://github.com/PMDCollab/SpriteCollab
在线浏览: https://sprites.pmdcollab.org/
素材按 CC BY-NC-SA 4.0 使用，署名见 assets/pmd/CREDITS.md。

jsDelivr 的镜像偶尔抽风（同一个文件可能 404 / 超时），所以这里多镜像轮换 + 并发 + 校验 PNG 头。

产物:
  assets/pmd/{dex}_portrait.png   立绘（对话头像，多为 40x40）
  assets/pmd/{dex}_idle.png       待机动画表（8x8 网格）
  assets/pmd/{dex}_walk.png       行走动画表（8x8 网格）
  assets/pmd/manifest.json        尺寸清单（前端切帧用）

用法: python3 tools/fetch_pmd_sprites.py [--portrait-only]
"""
import concurrent.futures as futures
import json
import os
import struct
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "pmd")

# 优先走本机代理直连 GitHub（raw 最稳）；没有代理时退回 jsDelivr 镜像。
PROXY = os.environ.get("DSH_HTTP_PROXY", "http://127.0.0.1:7890")
DIRECT_BASE = "https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/"
MIRRORS = [
    "https://testingcf.jsdelivr.net/gh/PMDCollab/SpriteCollab@master/",
    "https://gcore.jsdelivr.net/gh/PMDCollab/SpriteCollab@master/",
]


def proxy_alive():
    try:
        p = subprocess.run(
            ["curl", "-sS", "-m", "6", "-x", PROXY, "-o", "/dev/null", "-w", "%{http_code}",
             DIRECT_BASE + "portrait/0004/Normal.png"],
            capture_output=True, text=True)
        return p.stdout.strip() == "200"
    except Exception:  # noqa: BLE001
        return False

ROSTER = {
    330: "沙漠蜻蜓", 373: "暴飞龙", 328: "大颚蚁", 329: "超音波幼虫",
    190: "长尾怪手", 204: "榛果球", 273: "橡实果", 285: "蘑蘑菇", 163: "咕咕", 267: "狩猎凤蝶",
    399: "大牙狸", 427: "卷卷耳", 403: "小猫怪", 504: "探探鼠", 506: "小约克", 519: "咕咕鸽",
    270: "莲叶童子", 283: "溜溜糖球", 418: "泳圈鼬", 183: "玛力露", 339: "泥泥鳅", 456: "萤光鱼",
    278: "长翅鸥", 341: "龙虾小兵", 363: "海豹球", 370: "爱心鱼", 211: "千针鱼", 594: "保母曼波",
    175: "波克比", 173: "皮宝宝", 298: "露力丽", 447: "利欧路", 587: "电飞鼠", 235: "图图犬",
    397: "姆克鸟", 304: "可可多拉", 322: "呆火驼", 324: "煤炭龟", 207: "天蝎", 333: "青绵鸟",
    218: "熔岩虫", 449: "沙河马", 524: "石丸子", 529: "螺钉地鼠", 631: "熔蚁兽", 632: "铁蚁",
    303: "大嘴娃", 302: "勾魂眼", 436: "铜镜怪", 433: "铃铛响", 355: "夜巡灵", 607: "烛光灵",
    443: "圆陆鲨", 551: "黑眼鳄", 290: "土居忍士", 445: "烈咬陆鲨",
    334: "七夕青鸟", 468: "波克基斯", 380: "拉帝亚斯", 381: "拉帝欧斯", 490: "玛纳霏",
    383: "固拉多", 382: "盖欧卡", 384: "烈空坐",
}


def png_size(path):
    try:
        with open(path, "rb") as f:
            head = f.read(33)
    except OSError:
        return None
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    w, h = struct.unpack(">II", head[16:24])
    return w, h


def fetch_one(rel, dest, tries=6, use_proxy=False):
    if png_size(dest):
        return True
    tmp = dest + ".part"
    urls = []
    if use_proxy:
        urls.append(DIRECT_BASE + rel)
    urls += [m + rel for m in MIRRORS]
    for i in range(tries):
        url = urls[i % len(urls)]
        cmd = ["curl", "-sSL", "--http1.1", "-m", "15", "-o", tmp, "-w", "%{http_code}"]
        if use_proxy:
            cmd += ["-x", PROXY]
        cmd.append(url)
        subprocess.run(cmd, capture_output=True, text=True)
        if png_size(tmp):
            os.replace(tmp, dest)
            return True
        time.sleep(0.3)
    if os.path.exists(tmp):
        os.remove(tmp)
    return False


def main():
    os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, "manifest.json")
    manifest = json.load(open(mpath, encoding="utf-8")) if os.path.exists(mpath) else {}
    only_portrait = "--portrait-only" in sys.argv
    use_proxy = proxy_alive()
    print("直连 GitHub:" , "走代理 " + PROXY if use_proxy else "不可用，改用 jsDelivr 镜像")

    jobs = []
    for dex, name in sorted(ROSTER.items()):
        d4 = "%04d" % dex
        e = manifest.setdefault(d4, {})
        e["name"] = name
        jobs.append((d4, "portrait", f"portrait/{d4}/Normal.png", os.path.join(OUT, d4 + "_portrait.png")))
        if not only_portrait:
            jobs.append((d4, "idle", f"sprite/{d4}/Idle-Anim.png", os.path.join(OUT, d4 + "_idle.png")))
            jobs.append((d4, "walk", f"sprite/{d4}/Walk-Anim.png", os.path.join(OUT, d4 + "_walk.png")))

    done = {"ok": 0, "fail": []}

    def work(job):
        d4, kind, rel, dest = job
        ok = fetch_one(rel, dest, use_proxy=use_proxy)
        return job, ok

    t0 = time.time()
    with futures.ThreadPoolExecutor(max_workers=8) as ex:
        for job, ok in ex.map(work, jobs):
            d4, kind, rel, dest = job
            if ok:
                done["ok"] += 1
                sz = png_size(dest)
                if kind == "portrait":
                    manifest[d4]["portrait"] = {"w": sz[0], "h": sz[1]}
                else:
                    manifest[d4][kind] = {"w": sz[0], "h": sz[1],
                                          "cw": sz[0] // 8, "ch": sz[1] // 8,
                                          "cols": 8, "rows": 8}
            else:
                done["fail"].append(f"{d4}_{kind}")
                print("  ! 失败", d4, kind, flush=True)
            if (done["ok"] + len(done["fail"])) % 20 == 0:
                json.dump(manifest, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    json.dump(manifest, open(mpath, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    with open(os.path.join(OUT, "CREDITS.md"), "w", encoding="utf-8") as f:
        f.write(
            "# 素材来源\n\n"
            "## 宝可梦立绘 / 行走图\n"
            "- PMD Sprite Repository — https://sprites.pmdcollab.org/\n"
            "- 仓库: https://github.com/PMDCollab/SpriteCollab\n"
            "- 授权: CC BY-NC-SA 4.0（非商业、署名、相同方式共享）\n"
            "- 动画表为 8x8 网格，单帧尺寸记录在 manifest.json。\n"
            "- 完整作者名单见仓库内各精灵图目录的 credits。\n\n"
            "## 树果图标\n"
            "- 神奇宝贝百科 — https://wiki.52poke.com/\n"
            "- 版权归 The Pokémon Company / GAME FREAK / Creatures Inc. 所有，"
            "仅用于非商业同人作品。\n")
    print(f"完成：成功 {done['ok']}，失败 {len(done['fail'])}，用时 {time.time() - t0:.0f}s")
    if done["fail"]:
        print("失败清单:", ", ".join(done["fail"]))


if __name__ == "__main__":
    main()
