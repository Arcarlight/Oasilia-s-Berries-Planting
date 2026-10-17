#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""发版前的一次性检查：语法 + 界面动作 + 样式。

为什么要有这个：
    0.13.4 和 0.13.5 连着两次把 src/data/build.js 写坏 —— 更新日志的文案里
    直接用了英文双引号（"帮助"、"像说明的"），把 JS 字符串截断了。检查确实跑了，
    但命令里用了 `;` 分隔，`node --check` 失败之后后面的 git commit 照样执行，
    坏版本被推上线，站点白屏。

    所以：跑这一个脚本，全绿才允许 commit。它自己用 `&&` 串，任何一步失败就返回非 0。

用法：
    python3 tools/check_all.py
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NODE = "node"


def run(cmd, cwd=ROOT):
    p = subprocess.run(cmd, cwd=str(cwd), shell=True, capture_output=True, text=True)
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def main():
    fails = []

    # ① 全部前端脚本的语法
    js = sorted(list((ROOT / "src").rglob("*.js")) + list((ROOT / "tools").rglob("*.js")))
    bad = []
    for f in js:
        rc, out = run('%s --check "%s"' % (NODE, f))
        if rc != 0:
            bad.append((f.relative_to(ROOT), out.strip().splitlines()[-1] if out.strip() else ""))
    print("语法检查：%d 个文件%s" % (len(js), "，全部通过" if not bad else "，%d 个失败" % len(bad)))
    for f, msg in bad:
        print("  ✗ %s：%s" % (f, msg))
    if bad:
        fails.append("语法")

    # ② 界面动作（data-act 必须有实现）
    rc, out = run("python3 tools/lint_acts.py")
    print(out.strip().splitlines()[0] if out.strip() else "")
    if rc != 0:
        print(out)
        fails.append("界面动作")

    # ③ 样式/动效
    rc, out = run("python3 tools/lint_css.py")
    print(out.strip().splitlines()[0] if out.strip() else "")
    if rc != 0:
        print(out)
        fails.append("样式")

    # ④ 资源版本号是不是最新的
    rc, out = run("python3 tools/bump_asset_version.py --check")
    print(out.strip().splitlines()[0] if out.strip() else "")
    if rc != 0:
        print("  （发版前记得跑 python3 tools/bump_asset_version.py）")
        fails.append("资源版本")

    if fails:
        print("\n没通过：" + "、".join(fails) + "　—— 不要 commit，先修。")
        return 1
    print("\n全部通过，可以 commit。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
