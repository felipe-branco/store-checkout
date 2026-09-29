/**
 * Color conversion utilities for OKLCH to RGB/hex
 * Based on the design system from the reference UI
 */

/**
 * Converts OKLCH color to RGB
 * OKLCH format: oklch(L C H) where:
 * - L: Lightness (0-1)
 * - C: Chroma (0-0.4 typically)
 * - H: Hue (0-360 degrees)
 */
export function oklchToRgb(
  l: number,
  c: number,
  h: number
): { r: number; g: number; b: number } {
  // Convert hue to radians
  const hRad = (h * Math.PI) / 180;

  // Convert OKLCH to OKLab
  const a = c * Math.cos(hRad);
  const bValue = c * Math.sin(hRad);

  // Convert OKLab to linear RGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * bValue;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * bValue;
  const s_ = l - 0.0894841775 * a - 1.291485548 * bValue;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  const r_ =
    +4.0767416621 * l3 -
    3.3077115913 * m3 +
    0.2309699292 * s3;
  const g_ =
    -1.2684380046 * l3 +
    2.6097574011 * m3 -
    0.3413193965 * s3;
  const b_ =
    -0.0041960863 * l3 -
    0.7034186147 * m3 +
    1.707614701 * s3;

  // Convert linear RGB to sRGB
  const r = r_ > 0.0031308
    ? 1.055 * Math.pow(r_, 1 / 2.4) - 0.055
    : 12.92 * r_;
  const g = g_ > 0.0031308
    ? 1.055 * Math.pow(g_, 1 / 2.4) - 0.055
    : 12.92 * g_;
  const b = b_ > 0.0031308
    ? 1.055 * Math.pow(b_, 1 / 2.4) - 0.055
    : 12.92 * b_;

  // Clamp values to 0-1
  return {
    r: Math.max(0, Math.min(1, r)),
    g: Math.max(0, Math.min(1, g)),
    b: Math.max(0, Math.min(1, b)),
  };
}

/**
 * Converts RGB (0-1) to hex string
 */
export function rgbToHex(r: number, g: number, blue: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(blue)}`;
}

/**
 * Converts OKLCH string to hex color
 * @param oklchString - String in format "oklch(L C H)" or just "L C H"
 */
export function oklchToHex(oklchString: string): string {
  // Extract numbers from string
  const matches = oklchString.match(/[\d.]+/g);
  if (!matches || matches.length < 3) {
    throw new Error(`Invalid OKLCH string: ${oklchString}`);
  }

  const l = parseFloat(matches[0]!);
  const c = parseFloat(matches[1]!);
  const h = parseFloat(matches[2]!);

  const rgb = oklchToRgb(l, c, h);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/**
 * Color palette extracted from the reference design system
 */
const darkCanvas = 'oklch(0.145 0.015 250)';

export const designColors = {
  light: {
    background: oklchToHex('oklch(0.985 0.002 240)'),
    foreground: oklchToHex('oklch(0.17 0.02 250)'),
    card: oklchToHex('oklch(1 0 0)'),
    cardForeground: oklchToHex('oklch(0.17 0.02 250)'),
    popover: oklchToHex('oklch(1 0 0)'),
    popoverForeground: oklchToHex('oklch(0.17 0.02 250)'),
    primary: oklchToHex('oklch(0.52 0.105 195)'),
    primaryForeground: oklchToHex('oklch(0.99 0 0)'),
    secondary: oklchToHex('oklch(0.96 0.008 240)'),
    secondaryForeground: oklchToHex('oklch(0.30 0.03 250)'),
    muted: oklchToHex('oklch(0.96 0.008 240)'),
    mutedForeground: oklchToHex('oklch(0.50 0.02 250)'),
    accent: oklchToHex('oklch(0.96 0.008 240)'),
    accentForeground: oklchToHex('oklch(0.30 0.03 250)'),
    destructive: oklchToHex('oklch(0.577 0.245 27.325)'),
    destructiveForeground: oklchToHex('oklch(0.99 0 0)'),
    border: oklchToHex('oklch(0.91 0.008 240)'),
    input: oklchToHex('oklch(0.91 0.008 240)'),
    ring: oklchToHex('oklch(0.52 0.105 195)'),
    success: oklchToHex('oklch(0.55 0.15 155)'),
    successForeground: oklchToHex('oklch(0.99 0 0)'),
    warning: oklchToHex('oklch(0.72 0.15 70)'),
    warningForeground: oklchToHex('oklch(0.25 0.05 60)'),
    info: oklchToHex('oklch(0.60 0.12 240)'),
    infoForeground: oklchToHex('oklch(0.99 0 0)'),
    sidebar: oklchToHex('oklch(0.20 0.03 250)'),
    sidebarForeground: oklchToHex('oklch(0.92 0.01 240)'),
    sidebarPrimary: oklchToHex('oklch(0.60 0.12 195)'),
    sidebarPrimaryForeground: oklchToHex('oklch(0.99 0 0)'),
    sidebarAccent: oklchToHex('oklch(0.26 0.03 250)'),
    sidebarAccentForeground: oklchToHex('oklch(0.92 0.01 240)'),
    sidebarBorder: oklchToHex('oklch(0.30 0.03 250)'),
    sidebarRing: oklchToHex('oklch(0.52 0.105 195)'),
  },
  dark: {
    background: oklchToHex(darkCanvas),
    foreground: oklchToHex('oklch(0.95 0.005 240)'),
    card: oklchToHex('oklch(0.19 0.02 250)'),
    cardForeground: oklchToHex('oklch(0.95 0.005 240)'),
    popover: oklchToHex('oklch(0.19 0.02 250)'),
    popoverForeground: oklchToHex('oklch(0.95 0.005 240)'),
    primary: oklchToHex('oklch(0.60 0.12 195)'),
    primaryForeground: oklchToHex('oklch(0.99 0 0)'),
    secondary: oklchToHex('oklch(0.25 0.02 250)'),
    secondaryForeground: oklchToHex('oklch(0.92 0.01 240)'),
    muted: oklchToHex('oklch(0.25 0.02 250)'),
    mutedForeground: oklchToHex('oklch(0.65 0.01 240)'),
    accent: oklchToHex('oklch(0.25 0.02 250)'),
    accentForeground: oklchToHex('oklch(0.92 0.01 240)'),
    destructive: oklchToHex('oklch(0.396 0.141 25.723)'),
    destructiveForeground: oklchToHex('oklch(0.637 0.237 25.331)'),
    border: oklchToHex('oklch(0.30 0.02 250)'),
    input: oklchToHex('oklch(0.30 0.02 250)'),
    ring: oklchToHex('oklch(0.60 0.12 195)'),
    success: oklchToHex('oklch(0.60 0.15 155)'),
    successForeground: oklchToHex('oklch(0.99 0 0)'),
    warning: oklchToHex('oklch(0.72 0.15 70)'),
    warningForeground: oklchToHex('oklch(0.20 0.04 60)'),
    info: oklchToHex('oklch(0.65 0.12 240)'),
    infoForeground: oklchToHex('oklch(0.99 0 0)'),
    sidebar: oklchToHex(darkCanvas),
    sidebarForeground: oklchToHex('oklch(0.92 0.01 240)'),
    sidebarPrimary: oklchToHex('oklch(0.60 0.12 195)'),
    sidebarPrimaryForeground: oklchToHex('oklch(0.99 0 0)'),
    sidebarAccent: oklchToHex('oklch(0.22 0.02 250)'),
    sidebarAccentForeground: oklchToHex('oklch(0.92 0.01 240)'),
    sidebarBorder: oklchToHex('oklch(0.26 0.02 250)'),
    sidebarRing: oklchToHex('oklch(0.60 0.12 195)'),
  },
};

