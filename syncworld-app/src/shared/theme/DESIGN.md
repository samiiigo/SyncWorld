# Briefly — Design Language

Extracted from `src/theme/`. This is an iOS-first (Apple HIG) React Native design
system: SF Pro type scale, iOS system colors, an 8pt-derived spacing scale, and
platform-tuned radii/shadows. Dark is the default palette; light mirrors it with
iOS light semantic colors. Everything is consumed through hooks that resolve the
active color scheme at runtime.

## Color

Two palettes, same keys (`ColorPalette` in `colorPalettes.ts`). Dark is default.

| Token | Dark | Light | Use |
|---|---|---|---|
| `background` | `#000000` | `#F2F2F7` | Screen base |
| `surface` | `#1C1C1E` | `#F2F2F7` | Grouped list / section base |
| `surfaceElevated` | `#2C2C2E` | `#FFFFFF` | Raised surface |
| `card` | `#1C1C1E` | `#FFFFFF` | Cards, rows |
| `border` | `#38383A` | `#C6C6C8` | Separators, hairlines |
| `primary` | `#0A84FF` | `#007AFF` | Tint / interactive |
| `primaryDark` | `#0056B3` | `#0056B3` | Pressed / darker tint |
| `red` | `#FF3B30` | `#FF3B30` | Destructive |
| `green` | `#34C759` | `#34C759` | Success / on-device |
| `orange` | `#FF9F0A` | `#FF9500` | Warning |
| `purple` | `#BF5AF2` | `#AF52DE` | Accent |
| `danger` | `#FF453A` | `#FF3B30` | Delete actions |
| `textPrimary` | `#FFFFFF` | `#000000` | Primary text |
| `textSecondary` | `#8E8E93` | `#8E8E93` | Secondary text |
| `subtext` | `#98989E` | `#98989E` | Muted labels |
| `textTertiary` | `#48484A` | `#AEAEB2` | Disabled / faint |

Feature-semantic colors (same keys, both palettes): `onDeviceBadge`/`onDeviceText`
(green on-device processing badge), `cloudBadge`/`cloudText` (blue cloud badge),
`waveform`/`waveformGlow` (recording waveform), `recordButton`/`pauseButton`,
`insightCard`/`insightAccent`, `summaryMuted`/`summaryBody` (summary text),
`emojiCircleBackground`/`emojiCircleBorder`, `folderUserIcon`/`folderUserIconBackground`,
`headerButtonMuted`. Read exact values in `colorPalettes.ts` — never hardcode a hex; use the token.

## Typography

SF Pro, Apple HIG scale (`Typography` in `theme/index.ts`). **Display for ≥20pt,
Text below** — `fontFamilyForSize()` picks the variant automatically. Serif
(Georgia) is used only on summary headings via `withSerifFont()`.

| Style | Size | Weight | Family |
|---|---|---|---|
| `largeTitle` | 34 | 700 | SF Pro Display (+0.4 letter-spacing) |
| `title1` | 28 | 700 | Display |
| `title2` | 22 | 700 | Display |
| `title3` | 20 | 600 | Display |
| `headline` | 17 | 600 | Text |
| `body` | 17 | 400 | Text |
| `callout` | 16 | 400 | Text |
| `subhead` | 15 | 400 | Text |
| `footnote` | 13 | 400 | Text (secondary) |
| `caption1` | 12 | 400 | Text (secondary) |
| `caption2` | 11 | 400 | Text (secondary) |

Build ad-hoc text styles with `appFont(size, weight, color)` (auto-picks Display/Text
by size) or `withAppFont(style)`. Android falls back to Roboto, web to system.

## Spacing (`Spacing`)

`xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48`. Plus `screenHorizontal: 20`
(iOS gutter for screen edges/headers/list content) and `contentTop: 0`.

## Radius & Shadow

`BorderRadius`: `sm 8 · md 12 · lg 16 · xl 20 · cardXL 24 · full 9999`.
`CornerRadius` (platform-tuned, tighter on Android) adds a `card` step and is the
preferred set for new work: `sm 8/6 · md 12/10 · lg 16/14 · xl 20/16 · card 24/20 · full 9999` (iOS/Android).

`shadowCard` / `shadowElevated` / `shadowHigh` (`tokens.ts`): iOS uses
`shadowColor/Offset/Opacity/Radius`, Android uses `elevation` (4/8/12). `LiquidGlass.card`
is a translucent `rgba(28,28,30,0.85)` surface on iOS (wrap in BlurView for real blur),
elevated surface on Android.

## How to consume (the idiom)

**No CSS, no class names.** RN `StyleSheet` objects styled by tokens, resolved per
color scheme through hooks. Never import `Colors` directly in a component (that's the
legacy global synced by the provider) — use the hooks.

```tsx
import { useCreateStyles, Typography, Spacing, CornerRadius } from '@/shared/theme';

function Card() {
  const styles = useCreateStyles((c) => ({
    card: {
      backgroundColor: c.card,
      borderRadius: CornerRadius.card,
      padding: Spacing.md,
      borderColor: c.border,
      borderWidth: StyleSheet.hairlineWidth,
    },
    title: { ...Typography.headline, color: c.textPrimary },
  }));
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Title</Text>
    </View>
  );
}
```

- `useCreateStyles(factory)` — memoized `StyleSheet.create`, factory receives the
  active `ColorPalette`. Preferred for component styles.
- `useTheme()` — full token set (`colors`, `spacing`, `borderRadius`, `cornerRadius`,
  `fontStack`, `shadow`) for inline/dynamic styling.
- `useThemedColors()` — just the palette. `useResolvedColorScheme()` — `'light' | 'dark'`.
- Everything must be under `<ThemeProvider>` (`theme/ThemeProvider.tsx`); it reads the
  user's `themePreference` (`system`/`light`/`dark`) and drives OS chrome too.

Icons: Ionicons via `@expo/vector-icons` (font map in `iconFonts.ts`).

## Shared UI components (`components/ui/`)

- `CircularIconButton` — round icon button.
- `AnchoredOverflowMenu` / `AnchoredMenuModal` + `useAnchoredMenu()` — anchored popover
  menu; items typed as `AnchoredMenuItem`, alignment `'leading' | 'trailing' | 'center'`.
- `TextInputDialog` — modal single-field input dialog.

## Where the truth lives

`colorPalettes.ts` (colors) · `index.ts` (`Typography`, `Spacing`, `BorderRadius`,
`LiquidGlass`) · `constants.ts` (`Spacing`/`BorderRadius` values) · `tokens.ts`
(`CornerRadius`, shadows, `useTheme`) · `fonts.ts` (SF Pro helpers) ·
`ThemeProvider.tsx` (scheme resolution) · `createStyles.ts` (`useCreateStyles`).
