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

## 改图标颜色

图标本身是白色的，前端一律用 CSS `mask-image` + `background: currentColor` 上色，
所以它会跟着所在文字的 颜色 走。换颜色改 CSS 即可，不用重新导出图片。
