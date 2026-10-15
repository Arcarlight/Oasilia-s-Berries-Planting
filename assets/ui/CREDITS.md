# UI 图标与光标来源

## 界面图标：化け猫缶 素材屋（作者：猫屋）

- 站点：http://neko.moo.jp/BS/ （图标页 https://neko.moo.jp/BS/main/3/5823.htm）
- 授权：加工自由，**加工后再配布也自由**（2010.11.9 起），署名不强制、商用可，
  仅禁止直链引用。本站做法：24×24 原图 **GIF → PNG**，并出 2x/3x（最近邻放大）。

| 文件 | 图号 | 用在哪 |
|------|------|--------|
| `tab-market` | 0386 | 页签「市场」（一篮收成） |
| `tab-kitchen` | 0199 | 页签「加工」（平底锅） |
| `tab-regulars` | 0237 | 页签「常客」（兜帽客人） |
| `tab-shop` | 0162 | 页签「商店」（钱袋） |
| `tab-atlas` | 0022 | 页签「阿特拉斯」（大槌，他是铁匠） |
| `tab-store` | 0127 | 页签「仓库」（木箱） |
| `tab-lab` | 0154 | 页签「研发」（药水瓶） |
| `tab-talents` | 0116 | 页签「天赋」（水晶） |
| `tab-dex` | 0175 | 页签「图鉴」（书） |
| `tab-help` | 0172 | 页签「说明」（卷轴） |
| `stat-money` | 0148 | 顶栏「宝可元」（金锭） |
| `stat-rate` | 0149 | 顶栏「自动 ₽/秒」（沙漏） |
| `stat-tp` | 0116 | 顶栏「天赋点」（水晶） |
| `hourglass` | 0149 | 离线回归弹窗 |
| `settings` | 0191 | 「设置」按钮（齿轮） |

> 挑图标时踩过的坑，记下来免得下次再犯：
> `0026` 是斧头不是锤子（铁匠不该拿斧头）、`0190` 是白花不是齿轮（齿轮是 `0191`）、
> `0150` 是首饰不是钱币（`0184` 那张也**不是地图，是卡牌**）。24×24 缩到 3x 预览时很容易看错，
> 定稿前一律放大 6~8 倍逐个确认。

> 注意：这套图标是**彩色像素画**，不是白色剪影，所以 `.ico-tab` / `.ico-stat` 的
> 不透明度要比原来的 `.ico` 高一档，否则会被深色底吃掉。

## 顶栏「当前区域」：Whitecat

- 站点：moyasi.whitecafe.jp（站点已失效，经 Internet Archive 取得）
- 授权：游戏内使用、且随游戏一起分发 → 明示许可；**只允许改色**，禁止二次配布/加工/商用；需标「Whitecat」。
- `stat-region.png` = `move_01.png`（一栋小房子，24×24 原图，青绿底已抠）
- 同一来源的还有 `assets/mat/` 里的树脂 / 月光水晶 / 天穹石，以及 `assets/item/candy.png`。

## 光标与界面框：Kenney（https://kenney.nl）

- **Cursor Pixel Pack** — https://kenney.nl/assets/cursor-pixel-pack
  `cursor-arrow.png`、`cursor-hand.png`、`cursor-point.png`、`cursor-water.png`，原图 16x16。
- 授权：**CC0 1.0**（公共领域，可商用，署名非必需，此处仍署名）

> 早先页签图标也取自这个包，现已整体换成 化け猫缶 的彩色像素图标 —— 单色剪影
> 跟树果/商品那些彩色贴图放在一起不搭。

## 界面贴图（按钮 / 面板框 / 进度条）

- **UI Pack - Pixel Adventure** — https://kenney.nl/assets/ui-pack-pixel-adventure
  取自 `Tiles/Large tiles/Thick outline/`（原图 32x32）：
   `btn.png`=0030、`btn-main.png`=0031、`btn-danger.png`=0020、`btn-press.png`=0019、
   `panel.png`=0032、`bar-mid.png`=0044、`bar-cap.png`=0043
- 授权：**CC0 1.0**

用法：
- 按钮用 `border-image` 做九宫格拉伸（`slice 10` 配 `border-width 6px`），
  普通/悬停/按下分别是 棕 / 奶白 / 深棕凹陷 三张图。
- 面板框用 `panel.png`，**注意不能加 `fill`** —— 那张图中心是黑的，
  加了 `fill` 会把面板底色盖成黑色。
- 进度条用 `bar-mid.png` 平铺（`repeat-x` + `background-size: auto 100%`）。

## 鼠标光标

同一套 Cursor Pixel Pack 里取的三个字形，各出 1x（16×16）/2x（32×32）/3x（48×48）：

| 文件 | 图号 | 用在哪 |
|------|------|--------|
| `cursor-hand` | 0176 | 平时（整页默认） |
| `cursor-point` | 0175 | 可点击：按钮、链接、下拉、田地、图鉴格 |
| `cursor-water` | 0129 | 浇水：「浇水（全部田）」按钮，以及正在生长的田 |
| `cursor-arrow` | 0168 | 备用（当前没用到） |

**为什么要出三档**：在 2 倍屏（Retina）上，16×16 的光标图会被浏览器平滑放大成 32 个物理像素，
结果就是发糊。CSS 的 `cursor` **不吃 `image-rendering: pixelated`**，所以只能靠喂更高分辨率解决。
2x/3x 是用最近邻放大的——像素图放大用最近邻不会产生插值毛边，效果等同于矢量。

**为什么用 `image-set` 而不是 `@supports` 裸判断**：
`@supports (cursor: image-set(...))` 这种写法**不成立**，因为单独一个 `image-set(...)`
不是合法的 cursor 值（cursor 必须是 `<image> <x> <y>?, <keyword>` 的形式）。
条件里必须带上热点和关键字，例如 `@supports (cursor: image-set(url("a.png") 1x) 0 0, auto)`。
两套写法都保留了：先写 1x 的 `url()` 兜底，再用 `@supports` 覆盖；不支持 image-set 的浏览器会整条丢弃。

热点（hotspot）坐标是按 1x 图给的：hand `6 1`、point `3 0`、water `8 2`。

## 改图标颜色

图标本身是白色的，前端一律用 CSS `mask-image` + `background: currentColor` 上色，
所以它会跟着所在文字的 颜色 走。换颜色改 CSS 即可，不用重新导出图片。
