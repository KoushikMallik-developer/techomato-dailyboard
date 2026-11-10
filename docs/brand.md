# DailyBoard brand

**Mark:** four rounded tiles in a masonry layout (a board of widgets). Source: `assets/brand/logo.svg`; in-app: `src/components/Logo.tsx`. Regenerate raster icons with `python scripts/make-icons.py`.

| Token | Value | Use |
|-------|-------|-----|
| Brand | `#C8381F` | Mark background, launcher icon |
| Deep | `#8E2413` | The one accent tile |
| White | `#FFFFFF` | The other three tiles |

**Rules**
- The deep tile is always top-right; never recolour or reorder the tiles.
- In the app the mark follows the active palette (`brand`, `brandInk`, `brandDeep`).
- Minimum size 24px. Below ~32px use `assets/favicon.png` (larger tiles, wider relative gaps).
- Keep clear space of at least one tile gap (about 3 units of 24) around the mark.
- Android adaptive icon: glyph stays inside the central 66%.
- Wordmark: "DailyBoard", Inter Bold, tight tracking, one word, capital D and B.

## In-app palettes

Set in `src/theme/palettes.ts` (22 tokens each, light and dark). Components use semantic classes (`bg-card`, `text-muted`, `border-line`, ...), never raw hex. Text/background pairs were checked for 4.5:1 contrast.

| Palette | id | brand | brandDeep (light) | panel (light) |
|---|---|---|---|---|
| Orange | `orange` | `#c8381f` | `#8e2413` | `#17181c` |
| Blue | `blue` | `#315bea` | `#2748c4` | `#152237` |
| Forest | `green` | `#0e7a5f` | `#0a6049` | `#11271e` |
| Violet | `violet` | `#6d4aff` | `#5334d6` | `#1d1740` |
| Graphite | `graphite` | `#1f2937` | `#111827` | `#111827` |

Notes: the `orange` id is the DailyBoard red-orange (kept so saved settings still match). Graphite dark inverts `brand` to light grey; the logo then draws its accent tile in `brandInk`.

## Scales

Font sizes `xs 12 / md 13 / base 15 / lg 17 / xl 20 / 2xl 26 / 3xl 32 / display 56` (`sm` is an alias of `xs`). Radius `xs 6 / sm 8 / md 12 / lg 16 / sheet 20`. Touch target `hit` 44px. Spacing uses Tailwind steps 1, 2, 3, 4, 6.
