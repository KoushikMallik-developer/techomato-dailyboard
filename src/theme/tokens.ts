// Design tokens shared by every screen. Colours live in palettes.ts (they change with theme and palette).
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24 } as const;
export const radius = { xs: 6, sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const font = { xs: 12, sm: 12, md: 13, base: 15, lg: 17, xl: 20, xxl: 26, xxxl: 32 } as const;
/** Minimum touch target on iOS and Android. */
export const HIT = 44;
