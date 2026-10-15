# UI 图标与光标来源

## Kenney（https://kenney.nl）

- **Cursor Pixel Pack** — https://kenney.nl/assets/cursor-pixel-pack
  本目录下的 `tab-*.png`、`order.png`、`add.png`、`hourglass.png`、`door.png`、
  `settings.png`、`list.png`、`eye.png`、`block.png`、`cursor-arrow.png`、
  `cursor-hand.png`、`cursor-cross.png` 全部取自这个包，原图 16x16。
- 授权：**CC0 1.0**（公共领域，可商用，署名非必需，此处仍署名）

> 说明：Kenney 没有单独的 1-bit 图标库，Cursor Pixel Pack 里的字形正好是一套
> 16x16 单色图标，够当界面图标用。物品图标仍然用神奇宝贝百科的原作贴图，
> 两者分工：**物品=原作贴图，界面/光标=Kenney**。

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
