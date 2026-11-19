// ──────────────────────────────────────────────
// brandFonts.ts — the two typefaces from the Figma file.
// Bricolage Grotesque for everything, Geist Mono for times and codes.
// One static file per weight: weights are chosen by family name, never by
// fontWeight, so iOS doesn't synthesize a weight or fall back to SF.
// Native builds embed these through the expo-font config plugin (app.json);
// useFonts in app/_layout.tsx covers the web and Expo Go.
// ──────────────────────────────────────────────
import { BricolageGrotesque_400Regular } from '@expo-google-fonts/bricolage-grotesque/400Regular';
import { BricolageGrotesque_500Medium } from '@expo-google-fonts/bricolage-grotesque/500Medium';
import { BricolageGrotesque_600SemiBold } from '@expo-google-fonts/bricolage-grotesque/600SemiBold';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque/700Bold';
import { BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque/800ExtraBold';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { GeistMono_600SemiBold } from '@expo-google-fonts/geist-mono/600SemiBold';

export const BRAND_FONT_ASSETS = {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
};

export type BrandWeight = 400 | 500 | 600 | 700 | 800;

const SANS: Record<BrandWeight, keyof typeof BRAND_FONT_ASSETS> = {
  400: 'BricolageGrotesque_400Regular',
  500: 'BricolageGrotesque_500Medium',
  600: 'BricolageGrotesque_600SemiBold',
  700: 'BricolageGrotesque_700Bold',
  800: 'BricolageGrotesque_800ExtraBold',
};

/** 'normal' | 'bold' | '600' | 600 -> the nearest weight we ship. */
export function brandWeight(weight: unknown): BrandWeight {
  if (weight === 'bold') return 700;
  const n = typeof weight === 'number' ? weight : parseInt(String(weight ?? ''), 10);
  if (!Number.isFinite(n) || n <= 400) return 400;
  if (n <= 500) return 500;
  if (n <= 600) return 600;
  if (n <= 700) return 700;
  return 800;
}

export function sansFamily(weight: unknown): string {
  return SANS[brandWeight(weight)];
}

export function monoFamily(weight: unknown): string {
  return brandWeight(weight) >= 600 ? 'GeistMono_600SemiBold' : 'GeistMono_500Medium';
}
