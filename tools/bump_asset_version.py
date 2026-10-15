#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给 index.html 里的本地 css/js 加上（或换掉）版本号，用来破浏览器缓存。

为什么需要：
    GitHub Pages 对这些文件发的是 cache-control: max-age=600 —— 浏览器会把旧文件
    留十分钟。部署出新版本之后，已经打开过页面的人普通刷新拿到的还是旧的那份，
    于是"我明明修好了他怎么还说没好"。这类误会发生过一次，不值得再发生第二次。

用法：
    python3 tools/bump_asset_version.py          # 换成当前时间戳
    python3 tools/bump_asset_version.py 7        # 递增 7
    python3 tools/bump_asset_version.py --check  # 只检查有没有带版本号，不改

部署前跑一次（改完代码、提交之前）。tools/make_dev.py 会把这个版本号一起带进 dev.html。
"""
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"

# 只给本地资源加，外链不动
PAT = re.compile(r"""(?P<attr>\b(?:src|href))=(?P<q>["'])(?P<path>(?:src/|css/)[^"'?]+\.(?:js|css))(?:\?v=(?P<v>[^"']*))?(?P=q)""")


def current_version(text):
    m = re.search(r"\?v=(\d+)", text)
    return int(m.group(1)) if m else 0


def main():
    args = [a for a in sys.argv[1:]]
    text = INDEX.read_text(encoding="utf-8")
    old = current_version(text)

    if "--check" in args:
        hits = PAT.findall(text)
        missing = [h[2] for h in PAT.finditer(text) and [] or []]
        bare = [m.group("path") for m in PAT.finditer(text) if not m.group("v")]
        total = len(list(PAT.finditer(text)))
        if bare:
            print("资源版本检查：失败 —— 这些还没有版本号：")
            for b in bare:
                print("  " + b)
            return 1
        print("资源版本检查：通过（%d 个本地资源都带 ?v=%d）" % (total, old))
        return 0

    if args and args[0].isdigit():
        new = old + int(args[0])
    else:
        new = max(int(time.time()), old + 1)

    def sub(m):
        return '%s=%s%s?v=%d%s' % (m.group("attr"), m.group("q"), m.group("path"), new, m.group("q"))

    out, n = PAT.subn(sub, text)
    if not n:
        print("没找到需要处理的资源，检查一下 index.html 的写法")
        return 1
    INDEX.write_text(out, encoding="utf-8")
    print("资源版本：%d → %d（%d 个文件）" % (old, new, n))

    # 顺手把同一个 build 号写进 src/data/build.js，设置面板里显示的版本才对得上
    bpath = ROOT / "src" / "data" / "build.js"
    if bpath.exists():
        b = bpath.read_text(encoding="utf-8")
        today = time.strftime("%Y-%m-%d")
        b2 = re.sub(r"build:\s*\d+", "build: %d" % new, b, count=1)
        b2 = re.sub(r'date:\s*"\d{4}-\d{2}-\d{2}"', 'date: "%s"' % today, b2, count=1)
        if b2 != b:
            bpath.write_text(b2, encoding="utf-8")
            print("build.js：build → %d，日期 → %s" % (new, today))
    return 0


if __name__ == "__main__":
    sys.exit(main())
