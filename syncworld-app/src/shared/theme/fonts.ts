import { Platform, TextStyle } from 'react-native';

import { monoFamily, sansFamily } from './brandFonts';
/** Apple HIG: Display for larger type, Text for body and smaller labels. */
export const SF_DISPLAY_MIN_SIZE = 20;
export const Fonts = {
  text: Platform.select({
    ios: 'SF Pro Text',
    android: 'Roboto',
    default: undefined,
  }),
  display: Platform.select({
    ios: 'SF Pro Display',
    android: 'Roboto',
    default: undefined,
  }),
} as const;
export function fontFamilyForSize(fontSize: number): string | undefined {
  if (Platform.OS === 'ios') {
    return fontSize >= SF_DISPLAY_MIN_SIZE ? Fonts.display : Fonts.text;
  }
  // Android and other platforms use the text family (Roboto / system default)
  return Fonts.text;
}
/**
 * Applies the brand typeface (Bricolage Grotesque, from the Figma file).
 * The weight picks the font file; fontWeight is dropped so iOS doesn't
 * synthesize a bolder version of an already-bold file.
 */
export function withAppFont(style: TextStyle): TextStyle {
  const { fontWeight, ...rest } = style;
  return { ...rest, fontFamily: sansFamily(fontWeight) };
}

/** Geist Mono for times, countdowns and room codes (tabular digits). */
export function withMonoFont(style: TextStyle): TextStyle {
  const { fontWeight, ...rest } = style;
  return { ...rest, fontFamily: monoFamily(fontWeight), fontVariant: ['tabular-nums'] };
}

export function monoFont(fontSize: number, fontWeight: TextStyle['fontWeight'], color: string): TextStyle {
  return withMonoFont({ fontSize, fontWeight, color });
}
export function appFont(
  fontSize: number,
  fontWeight: TextStyle['fontWeight'],
  color: string
): TextStyle {
  return withAppFont({ fontSize, fontWeight, color });
}
/** Serif headings on summary screens (Georgia on iOS, system serif elsewhere). */
export function withSerifFont(style: TextStyle): TextStyle {
  const fontFamily = Platform.select({
    ios: 'Georgia',
    android: 'serif',
    default: undefined,
  });
  if (!fontFamily) return style;
  return { ...style, fontFamily };
}
