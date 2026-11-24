
import { Platform } from 'react-native';

/** Kolory marki z wersji WWW (jestprzetarg.pl) i ich odpowiedniki dla trybu ciemnego. */
export const Colors = {
  light: {
    text: '#1c2321',
    textSecondary: '#5f6b66',
    background: '#f6f5f1',
    backgroundElement: '#ecebe5',
    backgroundSelected: '#dcd9d0',
    card: '#ffffff',
    border: '#dcd9d0',
    brand: '#0f5c4a',
    brandSoft: '#e3f0ea',
    onBrand: '#ffffff',
    warn: '#9a5b00',
    warnSoft: '#fbefd6',
    danger: '#a3312b',
    dangerSoft: '#f9e3e0',
  },
  dark: {
    text: '#e8ece9',
    textSecondary: '#9aa6a0',
    background: '#121614',
    backgroundElement: '#1b211e',
    backgroundSelected: '#2b3430',
    card: '#1b211e',
    border: '#2b3430',
    brand: '#4fb596',
    brandSoft: '#17332b',
    onBrand: '#0b1512',
    warn: '#e0a84a',
    warnSoft: '#3a2c10',
    danger: '#e5766f',
    dangerSoft: '#3d1b18',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type Theme = Record<ThemeColor, string>;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  default: { sans: 'normal', mono: 'monospace' },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { card: 14, pill: 999, field: 10 } as const;
