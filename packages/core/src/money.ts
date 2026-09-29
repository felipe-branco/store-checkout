/**
 * Convert major currency units to integer minor units for the event store.
 * Default `minorUnitsPerMajor` is 100 (USD cents, EUR cents, BRL centavos, etc.).
 *
 * @example BRL — reais to centavos: `majorUnitsToMinorUnits(2.3)` → `230`
 * @example USD — dollars to cents: `majorUnitsToMinorUnits(17.995)` → `1799` (rounded)
 */
export function majorUnitsToMinorUnits(
  major: number,
  minorUnitsPerMajor = 100
): number {
  return Math.round(major * minorUnitsPerMajor);
}

/** Convert event-store minor units back to major units for display. */
export function minorUnitsToMajorUnits(
  minor: number,
  minorUnitsPerMajor = 100
): number {
  return minor / minorUnitsPerMajor;
}
