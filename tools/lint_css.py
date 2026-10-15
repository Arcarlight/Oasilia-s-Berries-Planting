# -*- coding: utf-8 -*-
"""样式动效自检（静态读文件）。

为什么不在浏览器里查：本地双击打开时是 file://，浏览器不允许 JS 读取本地样式表
（cssRules 抛异常），在页内做这类检查会"看起来全过"，其实是空跑。
所以搬到文件层面来查。

用法: python3 tools/lint_css.py
"""
import re
import sys
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSS = os.path.join(ROOT, "css", "style.css")


def strip_comments(s):
    return re.sub(r"/\*.*?\*/", "", s, flags=re.S)


def main():
    raw = open(CSS, encoding="utf-8").read()
    css = strip_comments(raw)
    problems = []

    # 1) transition: all —— 会把无关属性一起动画化，性能和预期都不可控
    for m in re.finditer(r"transition(?:-property)?\s*:\s*all\b", css):
        line = css[:m.start()].count("\n") + 1
        problems.append(f"第 {line} 行：transition: all（要逐条列属性）")

    # 2) scale(0) 进场 —— 物体不该凭空出现，用 scale(0.9~0.97) + opacity
    for m in re.finditer(r"scale\(\s*0\s*\)", css):
        line = css[:m.start()].count("\n") + 1
        problems.append(f"第 {line} 行：scale(0)（改 0.96 配 opacity: 0）")

    # 3) 裸 ease-in —— 起步慢，恰好拖在用户最关注的那一刻
    for m in re.finditer(r"ease-in(?!-out|\s*;?\s*$)", css):
        seg = css[m.start():m.start() + 14]
        if seg.startswith("ease-in-out"):
            continue
        line = css[:m.start()].count("\n") + 1
        problems.append(f"第 {line} 行：ease-in（UI 用 ease-out 或自定义强曲线）")

    # 4) 必须带减弱动效分支
    if "prefers-reduced-motion" not in css:
        problems.append("缺少 @media (prefers-reduced-motion: reduce) 分支")

    # 5) 鼠标动效必须做 hover 能力判断（触屏点一下会误触发假 hover）
    if re.search(r":hover[^{]*\{[^}]*transform", css) and "(hover: hover)" not in css:
        problems.append("有悬停位移但没有 @media (hover: hover) and (pointer: fine) 保护")

    # 6) 动效时长不该超过 300ms（弹层/抽屉除外，这里只提示）
    for m in re.finditer(r"--dur-[a-z]+\s*:\s*(\d+)ms", css):
        if int(m.group(1)) > 300:
            line = css[:m.start()].count("\n") + 1
            problems.append(f"第 {line} 行：时长 {m.group(1)}ms 超过 300ms")

    if problems:
        print("样式动效检查：发现 %d 个问题" % len(problems))
        for p in problems:
            print("  ✗ " + p)
        return 1
    print("样式动效检查：通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
