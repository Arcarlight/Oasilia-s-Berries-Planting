#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""界面动作自检：界面上写出来的 data-act，必须在 ACT 里有实现。

为什么要有这个：
    2026 年那次改研发页，动手替换 ACT 里的一段动作时，切除范围一路切到了对象结尾，
    把夹在中间的 15 个动作（recipe / craft / buySeed / buyRecipe / buyMaterial /
    craftItem / tripGo / deliver / hire / buyTalent / migrate / settings …）一起删了。
    语法没错、页面能开、自检也全绿 —— 因为坏掉的是"按钮点了没反应"，只有真去点才发现。

    这条检查是静态的，不跑浏览器，任何时候都能跑。
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UI = ROOT / "src" / "ui" / "ui.js"

# 不走 ACT 的动作：下拉框用 change 事件，设置按钮另有入口
ELSEWHERE = {"picksell", "settings"}


def main():
    src = UI.read_text(encoding="utf-8")

    # ① ACT 里注册了哪些动作
    i = src.index("const ACT = {")
    j = src.index("UI.bubble =", i)
    act_block = src[i:j]
    # 对象字面量里写的一批
    keys = set(re.findall(r"^\s{4}([a-zA-Z][a-zA-Z0-9]*):", act_block, re.M))
    # 对象外挂上去的（ACT.exportSave = ... 这种），漏掉它们会误报成死按钮
    keys |= set(re.findall(r"^\s*ACT\.([a-zA-Z][a-zA-Z0-9]*)\s*=", src, re.M))
    if not keys:
        print("界面动作检查：失败 —— 一个动作都没解析到，八成是 ACT 的写法变了")
        return 1

    # ② 界面上用到了哪些 data-act（跳过 ${...} 这种拼出来的）
    #    index.html 里也有按钮，一起扫，否则会漏
    sources = [src]
    for extra in (ROOT / "index.html", ROOT / "src" / "main.js"):
        if extra.exists():
            sources.append(extra.read_text(encoding="utf-8"))
    used = set()
    for text in sources:
        for m in re.finditer(r"""data-act=['"]([^'"]+)['"]""", text):
            v = m.group(1)
            if "${" in v:
                continue
            used.add(v)
    # data-act="${a[0]}" 这种要另外认：storeDetail 里的动作名来自 actions 数组
    for m in re.finditer(r"""\["([a-zA-Z]+)",\s*"[^"]+",\s*\{""", src):
        used.add(m.group(1))

    dead = sorted(used - keys - ELSEWHERE)
    unused = sorted(keys - used)

    if dead:
        print("界面动作检查：失败")
        for a in dead:
            print("  ✗ data-act=\"%s\" 在界面上有，但 ACT 里没有实现 —— 这个按钮点了不会有反应" % a)
        return 1

    print("界面动作检查：通过（%d 个动作，界面用到 %d 个）" % (len(keys), len(used)))
    if unused:
        # 不算错误：有些动作是弹层或键盘快捷方式触发的，界面上不一定有按钮
        print("  提示：这些动作界面上暂时没有入口 —— " + "、".join(unused))
    return 0


if __name__ == "__main__":
    sys.exit(main())
