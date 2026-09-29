/**
 * Typed token keys mirroring tokens.css. Use when reading CSS variables in TS.
 */
export const tokenNames = {
  background: '--background',
  foreground: '--foreground',
  primary: '--primary',
  border: '--border',
  mutedForeground: '--muted-foreground',
  sidebar: '--sidebar',
  radius: '--radius',
} as const;

export type TokenName = keyof typeof tokenNames;
