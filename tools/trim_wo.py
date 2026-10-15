# -*- coding: utf-8 -*-
"""收紧人物台词里多余的「我」。

规则
  1. 一条（一个字符串）里，1–2 句最多留 1 个「我」，3 句以上最多留 2 个。
  2. 同一个句子里出现多个「我」时，只留第一个。
  3. 宾语位置的「我」绝不动：我前面是 给/跟/陪/替/帮/叫/让/对/向/和/与/是/被/同… 时，
     删掉会变成"跟说"这种病句，所以一律跳过。
  4. 每条至少保留 1 个「我」——不能退回成完全无人称的说明书口吻。
  5. 优先删靠后句子里的「我」（中文里后句主语本就可以承前省略）。

用法: python3 tools/trim_wo.py check   # 只统计与抽样，不写文件
      python3 tools/trim_wo.py apply   # 写回文件
"""
import re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SENT_END = "。！？…；"
# 「我」前面是这些字 → 我是宾语（给我 / 跟我说 / 替我），不能删
OBJ_PREV = set("给跟陪替帮叫让对向和与是被同冲朝带找见等问教请留递交拿借还送拉扶顶拦惹逗夸疼想爱算看听等")

def split_sents(s):
    out, cur = [], ""
    for ch in s:
        cur += ch
        if ch in SENT_END:
            out.append(cur); cur = ""
    if cur:
        out.append(cur)
    return out

def subj_idx(sent):
    """句内处于主语位置的「我」下标（前面是句首或标点/引号）"""
    res = []
    for i, ch in enumerate(sent):
        if ch != "我":
            continue
        if i == 0:
            res.append(i); continue
        p = sent[i - 1]
        if p in SENT_END or p in "，、：\"“「『（(—-…" or p == "…":
            res.append(i)
        elif p in OBJ_PREV:
            pass          # 宾语位置，跳过
        else:
            res.append(i)  # 其他情况（如"水我都挑好了"）也算主语，可删
    return res

def delete_at(s, idxs):
    for i in sorted(idxs, reverse=True):
        s = s[:i] + s[i + 1:]
    return s

def trim_line(s):
    if "我" not in s:
        return s, 0
    orig = s.count("我")

    # —— 第一步：句内只留第一个「我」 ——
    sents = split_sents(s)
    newsents = []
    for sent in sents:
        pos = subj_idx(sent)
        # 宾语位置的「我」不参与删除
        deletable = [i for i in pos if i > 0 and sent[i - 1] in SENT_END + "，、：\"“「『（(—-…"]
        if len(pos) > 1 and deletable:
            # 保留第一个 pos，其余可删的删掉
            drop = [i for i in deletable if i != pos[0]]
            sent = delete_at(sent, drop)
        newsents.append(sent)
    s = "".join(newsents)

    # —— 第二步：按条数上限削 —— ——
    def keep_cap(n):
        return 1 if n <= 2 else 2

    # 每条的第一个「我」是这一条的人称锚点，绝不删
    first_pos = s.index("我")

    while True:
        sents = split_sents(s)
        cap = keep_cap(len(sents))
        if s.count("我") <= cap:
            break
        # 重新定位锚点（前面的删除会让下标变化）
        anchor = s.index("我")
        dropped = False
        # 从最后一句往前找可删的「我」
        for si in range(len(sents) - 1, -1, -1):
            sent = sents[si]
            base = sum(len(x) for x in sents[:si])
            cand = []
            for i in range(len(sent)):
                if sent[i] != "我":
                    continue
                gi = base + i
                if gi <= anchor:            # 锚点，跳过
                    continue
                if i == 0 or sent[i - 1] not in SENT_END + "，、：\"“「『（(—-…":
                    continue                # 宾语位置或非标点前，跳过
                nxt = sent[i + 1:i + 4]
                if nxt.startswith(("保证", "担保", "发誓", "一个人", "独自")):
                    continue                # 删了会读成别人，跳过
                cand.append(i)
            if cand:
                pick = cand[-1]
                sents[si] = sent[:pick] + sent[pick + 1:]
                dropped = True
                break
        if not dropped:
            break
        s = "".join(sents)

    if "我" not in s:
        return None, 0        # 兜底：整条被删空了，调用方回退
    return s, orig - s.count("我")


# ── 各文件里该处理的字符串位置 ──────────────────────────────────────────────
STR = r'"(?:[^"\\]|\\.)*"'

def targets(path):
    """返回 [(分组名, 正则)]，正则第 1 组是要处理的字符串（含引号）"""
    if path.endswith("atlas.js"):
        return [("台词", None), ("道具 flavor", r'flavor:\s*(' + STR + r')'),
                ("道具 desc", r'desc:\s*(' + STR + r')'), ("出行事件", r'text:\s*(' + STR + r')')]
    if path.endswith("regulars.js"):
        return [("常客台词", None)]
    if path.endswith("regions.js"):
        return [("区域 desc", r'desc:\s*(' + STR + r')'), ("区域 tip", r'tip:\s*(' + STR + r')'),
                ("祠堂", r'text:\s*(' + STR + r')')]
    return [("全部", None)]


# ── 应用 ────────────────────────────────────────────────────────────────────
def apply_to(text, pattern, report):
    """pattern 第 1 组是含引号的字符串；按顺序处理"""
    def repl(m):
        raw = m.group(1)
        inner = raw[1:-1]
        new, n = trim_line(inner)
        whole = m.group(0)
        if new is None or n == 0:
            return whole
        report.append((inner, new, n))
        # 只替换第 1 组的内容，保留 desc: / tip: / flavor: 这些前缀
        cs, ce = m.span(1)
        rs, re_ = cs - m.start(0), ce - m.start(0)
        return whole[:rs] + '"' + new + '"' + whole[re_:]
    return re.sub(pattern, repl, text)


def process(path, mode="check"):
    full = os.path.join(ROOT, path)
    text = open(full, encoding="utf-8").read()
    report = []
    if path.endswith("atlas.js"):
        text = apply_to(text, r'desc:\s*(' + STR + r')', report)
        text = apply_to(text, r'flavor:\s*(' + STR + r')', report)
        e = text.index("G.ATLAS_EVENTS = [")
        l = text.index("G.ATLAS_LINES = {")
        head, ev, tail = text[:e], text[e:l], text[l:]
        ev = apply_to(ev, r'text:\s*(' + STR + r')', report)
        tail = apply_to(tail, r'(' + STR + r')', report)
        text = head + ev + tail
    elif path.endswith("regulars.js"):
        text = apply_to(text, r'(' + STR + r')', report)
    elif path.endswith("regions.js"):
        text = apply_to(text, r'desc:\s*(' + STR + r')', report)
        text = apply_to(text, r'tip:\s*(' + STR + r')', report)
        s = text.index("G.SHRINES = [")
        text = text[:s] + apply_to(text[s:], r'text:\s*(' + STR + r')', report) + ""
    n_before = sum(x[0].count("我") for x in report)
    n_after = sum(x[1].count("我") for x in report)
    if mode == "apply":
        open(full, "w", encoding="utf-8").write(text)
    return report, n_before, n_after
