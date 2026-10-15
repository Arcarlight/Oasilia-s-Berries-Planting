# -*- coding: utf-8 -*-
"""由 index.html 生成 dev.html（放在项目根目录）：同一套页面 + 自动化驱动脚本，用于截图验收。

放在根目录是为了让 css/ 与 assets/ 的相对路径与正式页面完全一致。
用法: python3 tools/make_dev.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
src = src.replace("</body>", '<script src="tools/simtest.js"></script>\n'
                            '<script src="tools/devdriver.js"></script>\n</body>')
open(os.path.join(ROOT, "dev.html"), "w", encoding="utf-8").write(src)
print("写出 dev.html（根目录）")
