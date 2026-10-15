# -*- coding: utf-8 -*-
"""把 regulars.js 的 60 条常客切成 5 个分片（供并行润色），润色完再合并回去。

分片文件是合法 JS：window.G.__CHUNK = [ ...条目... ];
合并时按分片顺序拼回 G.REGULARS，并保留原文件的头部注释与 NATURES 表。

用法:
  python3 tools/copy_chunks.py split
  python3 tools/copy_chunks.py merge
  python3 tools/copy_chunks.py check     # 结构自检（id/region/nature/flavor/dislike/unlock 必须原样）
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "data", "regulars.js")
BACKUP = os.path.join(ROOT, "data_raw", "copy_backup", "regulars.js")
CHUNK_DIR = os.path.join(ROOT, "data_raw", "copy")

GROUPS = [("r1_2", 0, 12), ("r3_4", 12, 24), ("r5_6", 24, 36), ("r7_8", 36, 48), ("r9_10", 48, 60)]

HEADER_END = "G.REGULARS = "


def scan_entries(text, start_marker):
    """从 start_marker 之后的 '[' 开始，扫出顶层 {...} 条目（原样文本）。"""
    i = text.index(start_marker) + len(start_marker)
    # 跳过 [ 之前的空白与 // 注释
    while i < len(text):
        if text[i] in " \t\r\n":
            i += 1
        elif text.startswith("//", i):
            i = text.index("\n", i) + 1
        else:
            break
    assert text[i] == "[", text[i:i + 60]
    i += 1
    entries = []
    depth = 0
    cur_start = None
    in_str = None
    esc = False
    while i < len(text):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == in_str:
                in_str = None
        else:
            if ch in "\"'`":
                in_str = ch
            elif ch == "{":
                if depth == 0:
                    cur_start = i
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    entries.append(text[cur_start:i + 1])
            elif ch == "]" and depth == 0:
                break
        i += 1
    return entries


def split():
    text = open(SRC, encoding="utf-8").read()
    entries = scan_entries(text, HEADER_END)
    assert len(entries) == 60, f"期望 60 条，实际 {len(entries)}"
    os.makedirs(CHUNK_DIR, exist_ok=True)
    for name, a, b in GROUPS:
        body = ",\n".join("  " + e.replace("\n", "\n  ") for e in entries[a:b])
        out = ("// 【待润色分片】%s：第 %d–%d 位常客。\n"
               "// 只允许改字符串里的中文文案；id/dex/name/region/nature/flavor/dislike/unlock 与结构一律不许动。\n"
               "window.G = window.G || {};\nG.__CHUNK = [\n%s\n];\n" % (name, a + 1, b, body))
        open(os.path.join(CHUNK_DIR, "regulars_%s.js" % name), "w", encoding="utf-8").write(out)
        print("切出", name, b - a, "条")


def merge():
    text = open(SRC, encoding="utf-8").read()
    head = text[:text.index(HEADER_END)] + "G.REGULARS = ["
    old_entries = scan_entries(text, HEADER_END)
    assert len(old_entries) == 60

    new_entries = []
    for name, a, b in GROUPS:
        p = os.path.join(CHUNK_DIR, "regulars_%s.js" % name)
        chunk = open(p, encoding="utf-8").read()
        got = scan_entries(chunk, "G.__CHUNK = ")
        assert len(got) == b - a, f"{name} 期望 {b - a} 条，实际 {len(got)}"
        new_entries += got

    # 结构自检：这些字段在文件里形态固定，用正则取值比解析 JS 对象稳妥
    def skeleton(e):
        out = {}
        for k in ("id", "dex", "region"):
            m = re.search(r"\b%s:\s*(\d+)" % k, e)
            out[k] = m.group(1) if m else None
        for k in ("name", "nature", "flavor", "dislike"):
            m = re.search(r"\b%s:\s*\"([^\"]*)\"" % k, e)
            out[k] = m.group(1) if m else None
        m = re.search(r"unlock:\s*\{([^}]*)\}", e)
        out["unlock"] = re.sub(r"\s+", "", m.group(1)) if m else None
        out["nlines"] = e.count("\"")  # 粗查引号数量
        return out

    for i, (o, n) in enumerate(zip(old_entries, new_entries)):
        if skeleton(o) != skeleton(n):
            raise SystemExit(f"第 {i + 1} 条常客的骨架被改动了：\n旧 {skeleton(o)}\n新 {skeleton(n)}")

    def dedent2(e):
        """分片文件给每条统一缩进了 2 格，合并时要还原，否则缩进会越滚越深。"""
        lines = e.split("\n")
        return "\n".join([lines[0]] + [(l[4:] if l.startswith("    ") else l) for l in lines[1:]])

    parts = []
    for idx, e in enumerate(new_entries):
        prefix = ""
        if idx % 6 == 0:
            prefix = "  // ---- R%d ----\n" % (idx // 6 + 1)
        parts.append(prefix + "  " + dedent2(e).replace("\n", "\n  "))
    # 注意：注释必须和条目拼成同一个元素，否则 join(",") 会在注释后多出一个逗号，数组里就会出现空位
    body = ",\n".join(parts)
    # 数组结束符后面可能什么都没有，也可能跟上其他内容。
    # 注意：上一次合并写出来的是"]"（没有分号），所以这里不能再写死 rindex("];")。
    i = text.rindex("]")
    j = i + 1
    while j < len(text) and text[j] in " \t\r\n;":
        j += 1
    tail = text[j:]
    open(SRC, "w", encoding="utf-8").write(head + "\n" + body + "\n" + "];" +
                                         (("\n" + tail) if tail else "\n"))
    print("合并完成：60 条，骨架全部一致")


def check():
    cur = scan_entries(open(SRC, encoding="utf-8").read(), HEADER_END)
    bak = scan_entries(open(BACKUP, encoding="utf-8").read(), HEADER_END)
    assert len(cur) == len(bak) == 60
    bad = 0
    def sk(e):
        out = {}
        for k in ("id", "dex", "region", "nature", "flavor", "dislike", "name"):
            m = re.search(r"\b%s:\s*\"([^\"]*)\"" % k, e) or re.search(r"\b%s:\s*(\d+)" % k, e)
            out[k] = m.group(1) if m else None
        m = re.search(r"unlock:\s*\{([^}]*)\}", e)
        out["unlock"] = re.sub(r"\s+", "", m.group(1)) if m else None
        return out
    for i, (a, b) in enumerate(zip(bak, cur)):
        oa, ob = sk(a), sk(b)
        for k in oa:
            if oa[k] != ob[k]:
                print(f"  ✗ 第 {i + 1} 条 {k}: {oa[k]} → {ob[k]}")
                bad += 1
        for k in ("greet", "like", "dislike", "order"):
            if a.count(k + ": [") != b.count(k + ": ["):
                print(f"  ✗ 第 {i + 1} 条 lines.{k} 结构变了")
                bad += 1
    print("结构自检：" + ("全部一致" if bad == 0 else f"{bad} 处不一致"))
    return bad


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "check"
    if cmd == "split":
        split()
    elif cmd == "merge":
        merge()
    else:
        check()
