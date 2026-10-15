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

### UI 渲染的一条铁律：不要整块替换 DOM

标签页/地块/日志/标签栏的内容更新一律走 `UI.morph()`，**不要用 `innerHTML = ...`**。

原因：`innerHTML` 会把所有节点销毁重造，于是

- 鼠标正悬停的按钮被换掉 → `:hover` 状态丢失 → **按钮一闪一闪**
- 手机上打开的原生 `<select>` 被销毁 → 选择器瞬间关闭，**根本选不中**
- 输入框里打到一半的字会没

`morph()` 只改变化的文字、就地同步属性，列表变长变短也只增删尾部节点，
所以鼠标下的按钮和打开的下拉都不会被换掉。表单一类控件在交互期间还会额外锁住重建
（`formBusy()`），双保险。

### 动效

曲线和时长统一在 `:root` 的 `--ease-out` / `--ease-in-out` / `--dur-*`，
不要在别处写魔法数字。**永远不用 `transition: all`**，属性逐条列。

加动效前先过两道判定（频率 + 目的），过不了就别加：

| 位置 | 频率 | 结论 |
|------|------|------|
| 叫卖 / 收获 / 浇水 | 每天上百次，还有快捷键 | **不做** |
| 按钮按下 | 高频 | 只做 1px 下沉，80ms |
| 吐司 | 偶发，但会连点 | 用 transition（关键帧会被连点重播），进出来回同一条路 |
| 弹层（开场/设置/离线结算） | 偶发 | opacity + 位移缩放，200ms 强 ease-out |
| 标签页切换 | 每天几十次 | 只做 200ms 淡入 |
| 转世 / 搬家 | 全局最稀有 | 唯一花"惊喜预算"的地方：整屏淡金一闪，520ms |
| 日志新条目、进度条 | 更新极快 | **不做**（进度条本来就每帧在动） |

减弱动效（`prefers-reduced-motion`）是**跟动效一起写的，不是补丁**：
去掉所有位移和全屏闪光，只留淡化，因为淡化本身在帮助理解状态变化。

动效自检：

```bash
python3 tools/lint_css.py     # 静态查 never-ship 清单（transition: all / scale(0) / ease-in / 缺减弱动效分支）
--dump-dom "file://$PWD/dev.html#hours=2&check=motion"   # 浏览器端确认动画真的挂上了
```

> 为什么分两处查：本地双击打开是 `file://`，浏览器不允许 JS 读本地样式表，
> 在页内做 `transition: all` 这类检查会"看起来全过"，其实是空跑（踩过一次）。

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
它还会顺带报光标是否三种都挂上、有没有真的吃到 2 倍图。

另外两个自检：

```bash
# 就地合入机制的单元自检（按钮/下拉节点是否会被销毁重造）
--dump-dom "file://$PWD/dev.html#hours=1&check=morph"

# 标签页 DOM 重建频率（正常应该接近 0 次/秒）
--dump-dom "file://$PWD/dev.html#hours=6&tab=market&check=churn"
```

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
- 界面图标、鼠标光标、按钮/面板框/进度条贴图：**Kenney**（kenney.nl），**CC0 1.0**（可商用，署名非必需）。
  - 光标与页签图标：Cursor Pixel Pack — https://kenney.nl/assets/cursor-pixel-pack
    （它其实是一套 16×16 单色字形，正好当图标库用）
  - 按钮 / 面板框 / 进度条：UI Pack - Pixel Adventure — https://kenney.nl/assets/ui-pack-pixel-adventure
    （用 border-image 九宫格拉伸，普通/悬停/按下三态）
  - 物品图标仍然用神奇宝贝百科的原作贴图；**物品=原作贴图，界面/光标=Kenney**。
  - 鼠标光标用了三个字形（平时 / 可点击 / 浇水），各出 1x·2x·3x 三档，
    用 `image-set` 按屏幕密度选图——否则 Retina 上 16×16 会被平滑放大成糊的。
    `cursor` 属性不支持 `image-rendering: pixelated`，只能靠喂高分辨率解决。
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
