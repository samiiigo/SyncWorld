# SyncWorld — Design Language

Source of truth: the HTML prototype (`syncworld-prototype/Sync Room App.dc.html`) and
the Apple design-system tokens beside it (`syncworld-prototype/_ds/*/tokens/`), plus
spec §7 (`SyncWorld-Master-Spec.md`). Figma is the final reference once connected.

Principles from the design system: one accent (Action Blue), parchment/black
surfaces, hairline borders, a single soft shadow, pill buttons that scale to 0.95
when pressed, and no decorative gradients (the scrubber's period bands are the
only exception: they carry meaning). **Dark is the default theme** (spec §7.4);
users can pick light or system in Settings.

Supported targets: iOS and Android phones and tablets, plus Windows and Mac via the
web build (PWA). Layouts adapt by width class; see `useDeviceClass()` in
`src/layouts/layout/`.

## Color

Two palettes, same keys (`ColorPalette` in `colorPalettes.ts`).

| Token | Dark | Light | Use |
|---|---|---|---|
| `background` | `#000000` | `#F5F5F7` | Screen base |
| `surface` | `#000000` | `#F5F5F7` | Grouped list base |
| `card` | `#1C1C1E` | `#FFFFFF` | Cards, sheets, modals |
| `surfaceElevated` | `#2C2C2E` | `#FAFAFC` | Inputs, chips, nested rows |
| `border` | `rgba(255,255,255,.16)` | `#E0E0E0` | Hairlines |
| `primary` | `#2997FF` | `#0066CC` | The only interactive accent |
| `onPrimary` | `#FFFFFF` | `#FFFFFF` | Text on accent |
| `danger` / `red` | `#FF453A` | `#FF3B30` | Destructive, veto, disconnected |
| `green` | `#30D158` | `#34C759` | Success, armed, online |
| `successSoft` | green 16% | green 14% | Success badge background |
| `textPrimary` | `#FFFFFF` | `#1D1D1F` | Primary text |
| `textStrong` | `#CCCCCC` | `#333333` | Strong secondary copy |
| `textSecondary` / `subtext` | `#8E8E93` | `#7A7A7A` | Metadata, labels |
| `textTertiary` | `#636366` | `#A1A1A6` | Placeholder, disabled |

Time-of-day periods (scrubber track bands and member local-time chips):
sleep 22:00–06:00 (`sleepBg`/`sleepFg`), business 06:00–18:00
(`businessBg`/`businessFg`), evening 18:00–22:00 (`eveningBg`/`eveningFg`).

Presence: `statusOnline`, `statusIdle`, `statusOffline`. Overlays: `scrim` (behind
sheets and modals), `inverseSurface`/`inverseText` (toasts, scrubber UTC badge).

Never hardcode a hex in a component; add a token instead.

## Typography

SF Pro, Apple HIG scale (`Typography` in `theme/index.ts`). **Display for ≥20pt,
Text below** — `fontFamilyForSize()` picks the variant automatically. Inter is the web fallback when SF Pro is unavailable.

| Style | Size | Weight | Family |
|---|---|---|---|
| `largeTitle` | 34 | 600 | SF Pro Display (-0.374 letter-spacing; design-system display-md) |
| `title1` | 28 | 700 | Display |
| `title2` | 22 | 700 | Display |
| `title3` | 20 | 600 | Display |
| `headline` | 17 | 600 | Text |
| `body` | 17 | 400 | Text (line-height 25 ≈ 1.47) |
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

`BorderRadius`: `sm 8 · input 11 · md 12 · lg 16 · group 18 · xl 20 · cardXL 24 · full 9999`.
Use `input` for text fields and code boxes, `group` for inset grouped cards, `xl` for
sheet top corners and `cardXL` for centered dialogs (vote modal).
`CornerRadius` (platform-tuned, tighter on Android) adds a `card` step and is the
preferred set for new work: `sm 8/6 · md 12/10 · lg 16/14 · xl 20/16 · card 24/20 · full 9999` (iOS/Android).

`shadowCard` / `shadowElevated` / `shadowHigh` (`tokens.ts`): iOS uses
`shadowColor/Offset/Opacity/Radius`, Android uses `elevation` (4/8/12). `LiquidGlass.card`
is the `card` surface on iOS (wrap in BlurView for real blur) and an elevated surface
on Android. Blur is iOS-only; Android and web use solid tonal surfaces.

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
  user's `themePreference` (`dark` default, or `light`/`system`) and drives OS chrome too.

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
