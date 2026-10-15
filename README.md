# 菲洛若亚大陆 · 树果物语

一个**只存在宝可梦**的世界里的网页增量游戏。主角是沙漠蜻蜓 **欧亚西莉亚**，
她要在菲洛若亚大陆上种遍 65 种树果，把果子加工成商品卖给常客宝可梦赚宝可元；
道具全部由她的伴侣、铁匠暴飞龙 **阿特拉斯** 出门买材料亲手做。
每片区域的常客全部解锁后就能移民到下一个区域（转世），拿天赋点，点局外加成。

## 在线玩

**https://arcarlight.github.io/Oasilia-s-Berries-Planting/**

（由 GitHub Pages 托管，仓库：[Arcarlight/Oasilia-s-Berries-Planting](https://github.com/Arcarlight/Oasilia-s-Berries-Planting)）

## 怎么玩

也可以直接双击 **`index.html`** 离线玩（纯静态，不需要服务器、不需要联网、不需要安装任何东西）。
进度存在浏览器的 `localStorage` 里，关掉页面也在跑（离线上限默认 4 小时，天赋和道具能延长）。
想换设备就打开右上角「设置 → 导出存档」，把字符串拷走。

前十件事：

1. 手上开局有 3 颗樱子果种子。点左下种子旁的「全种」。
2. 点田里的作物浇水，或者按底部「浇水（全部田）」。浇水推进生长，很划算。
3. 熟了会亮金边，点一下收获，或者按「收获全部」。
4. 去「商店 → 种子」买更多种子，把空地填满；「买地」能扩到两倍数量。
5. 去「加工」学配方。同一批树果做成商品能多卖好几倍；投入越贵的树果，商品越值钱。
6. 「市场」里可以直接卖，但**交给喜欢那个口味的常客能多卖 50%**，还会涨好感。
7. 「常客」页看谁喜欢什么味道（由性格决定）、谁有订单。好感 5 级后收益更高。
8. 「阿特拉斯」页：勾材料让他出门买（比杂货铺便宜，要等），材料齐了他亲手做道具。
9. 道具分农具 / 商铺 / 工坊 / 帮手四类。阿特拉斯页面每件都写清了「现在 / 再做一级 / 升满」的效果，
   在制的那件有独立进度条。自动化从区域 1 就能开：藤编手推车（自动出货）＋帮手铃（第一个帮手）。
10. 一片区域的 6 位常客全部解锁后，「天赋」页就能付移民费搬到下一个区域，拿天赋点。

## 玩法要点

| 系统 | 说明 |
|------|------|
| 生长 | 每种树果的生长时间取自百科（第八世代小时数）折算成秒，区域加成/道具/天赋都能加速 |
| 加工 | 6 类商品（果酱 / 果汁 / 宝可方块 / 宝芬 / 树果派 / 陈酿果酒）× 5 种口味 + 10 款区域招牌 = 40 个配方 |
| 口味 | 辣 / 涩 / 甜 / 苦 / 酸。常客的口味偏好由**官方性格对照表**决定，不是编的 |
| 常客 | 60 位，10 个区域各 6 位，各有解锁条件、好感度、随机订单与专属台词 |
| 道具 | 24 件 × 5 级，12 种材料。材料可代购或让阿特拉斯出门买，出行有 18 种随机事件 |
| 自动化 | 区域 1 就能开：藤编手推车=摊位自动出货（可一键关掉，并有「每品种保留 N 个不卖」的阀门，免得抢走做果酱的原料），帮手铃=第一个帮手槽；<br>区域 2：木质招牌=自动交付给常客，石磨=工位+1 并解锁自动加工（指定配方断料会自动换能做的）；<br>加工台工位 = 2 + 工坊道具等级和 ÷ 2，上限 12 |
| 转世 | 移民清空宝可元与库存，保留天赋 / 配方 / 道具 / 图鉴 / 常客好感；天赋 12 个节点永久生效 |
| 区域 | 繁盛之森 → 繁盛村 → 瀑布之森 → 盐风镇 → 沃雷奥斯岛 → 天顶山 → 三元山 → 水晶洞穴 → 赤沙绿洲 → 菲洛若亚天穹园 |

节奏（用 `tools/simtest.html` 的机器人实测，真人会更快）：
区域 1 约 40 分钟，2 约 1.5 小时，3–4 约 2–3 小时，5 约 5 小时，6–8 约 10–12 小时，
跑完一轮大约几十小时。天赋点可以滚雪球，反复轮回越来越快。

## 目录

```
index.html            入口（双击即玩）
css/style.css         像素风样式
src/core/             引擎：状态、存档、收益计算、时间推进
src/data/             内容：树果 / 区域 / 配方 / 天赋 / 常客 / 阿特拉斯
src/ui/ui.js          所有渲染与交互
src/main.js           启动、主循环、离线结算
assets/berry/         65 种树果图标（神奇宝贝百科）
assets/pmd/           69 只宝可梦的立绘 / 待机 / 行走图（PMD Sprite Repository）
data_raw/             抓取到的原始数据
tools/                素材抓取、数据生成、平衡表、无头测试
DESIGN.md             设计文档（世界观、数值、系统）
```

## 开发工具

```bash
# 重新抓树果数据与图标（会覆盖 src/data/berries.js 的来源数据）
python3 tools/fetch_berry_data.py
python3 tools/gen_game_data.py

# 重新抓宝可梦素材（走本机代理直连 GitHub；没有代理时退回 jsDelivr 镜像）
python3 tools/fetch_pmd_sprites.py

# 重新抓树果树阶段图与商品图标
python3 tools/fetch_item_assets.py

# 调整常客解锁阶梯（主要的节奏阀门），然后跑无头模拟看曲线
python3 tools/apply_unlock_ladder.py

# 文案打磨流程：60 位常客切成 5 个分片并行改写，改完合并并做结构自检
python3 tools/copy_chunks.py split     # 切分片到 data_raw/copy/
python3 tools/copy_chunks.py merge     # 合并回 src/data/regulars.js（会校验 id/性格/口味/解锁条件没被改动）
python3 tools/copy_chunks.py check     # 与 data_raw/copy_backup/ 对拍结构

# 生成用于截图的开发页（根目录 dev.html，可随时删）
python3 tools/make_dev.py
```

### 页面自检（改完 UI 一定要跑）

某个页签的渲染函数抛异常时，界面会**卡在上一个页签的内容上**，看起来像"点不动"，
但控制台之外很难发现。所以有一个逐页签渲染自检：

```bash
python3 tools/make_dev.py
"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  --headless=new --disable-gpu --virtual-time-budget=40000 \
  --dump-dom "file://$PWD/dev.html#hours=8&check=tabs" | grep -o "TABCHECK.*"
```

输出 `TABCHECK OK` 才算过；任何一页报错会列出页签名与错误信息。
建议至少在早期（`hours=0.5`）、中期（`hours=8`）、后期（`hours=40`）各跑一次。

文案打磨全程用 `deepseek-v4-pro` 并行跑，改的只有字符串。如果以后还要再润色一遍，
记得保留 `data_raw/copy_backup/`（里面是润色前的快照），否则 `check` 子命令没有对照物。

无头验证（需要 Chromium 内核浏览器，比如 Edge）：

```bash
"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  --headless=new --disable-gpu --virtual-time-budget=240000 \
  --dump-dom "file://$PWD/tools/simtest.html"
```

`tools/simtest.html` 会跑单元测试（种收卖、加工、存档往返、离线结算、数据一致性）
再用一个机器人把整局玩一遍，打印每个区域的停留时间。改动数值后请务必重跑。

## 部署

仓库是纯静态站，直接推到 GitHub，Pages 从 `main` 分支根目录发布即可。

**注意 `.nojekyll` 不能删**：`assets/tree/` 里有 `_1.png` / `_2.png`（种子与发芽阶段的共用贴图），
Jekyll 默认会忽略下划线开头的文件，删了 `.nojekyll` 这两个阶段会变成断图。

```bash
git add -A && git commit -m "..." && git push
```

## 素材与授权

- 树果图标、树果树的生长阶段图、商品图标：神奇宝贝百科（wiki.52poke.com）。
  版权归 The Pokémon Company / GAME FREAK / Creatures Inc.。
  - 田里的作物用的是百科的「树果树」贴图：种子 / 发芽（全树果共用）+ 长高 / 开花 / 结果（按树果单独出图）。
  - 商品图标 = 原作道具贴图打底 + 右下角叠一颗投入的树果：
    果酱=甜甜蜜，果汁=树果汁，宝可方块=各色宝可方块，宝芬=各口味宝芬，树果派=心形甜点，陈酿果酒=果汁牛奶（瓶子当酒器）。
- 宝可梦立绘与行走图：PMD Sprite Repository（github.com/PMDCollab/SpriteCollab），CC BY-NC-SA 4.0。
- 界面图标与鼠标光标：**Kenney**（kenney.nl），**CC0 1.0**（可商用，署名非必需）。
  - 光标：Cursor Pixel Pack — https://kenney.nl/assets/cursor-pixel-pack
  - 页签与界面小图标也取自同一个包（它其实是一套 16×16 单色字形）。
  - 物品图标仍然用神奇宝贝百科的原作贴图；**物品=原作贴图，界面/光标=Kenney**。
  - 图标是白色 PNG，前端用 `<img>` + `opacity` 控制强弱。
    （试过用 `mask-image` + `currentColor` 上色更优雅，但 `mask-image` 在 `file://` 下不生效，
    本地双击打开会变成实心方块，所以放弃。）
- 字体：**融合像素字体 / Fusion Pixel Font**（github.com/TakWolf/fusion-pixel-font），SIL OFL 1.1。
  取的是 12px 比例版，只用拉丁 + 简体中文两个子集（约 1.3 MB，本地自托管，不联网）。
  这款字是按 12px 点阵设计的，**只有在 12 的整数倍字号下才是整像素**，所以全站字号统一为 12 / 24，
  并且 `font-synthesis: none` 关掉了合成粗体（它只有一个字重，假粗体会把点阵糊掉）。
- 本作品是**非商业同人作品**，请勿用于商业用途。

## 快捷键

`W` 全部浇水　`H` 全部收获　`空格` 叫卖
