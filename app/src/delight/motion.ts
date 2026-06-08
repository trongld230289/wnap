/** Token thời lượng/easing cho Delight Layer (dùng bởi <Count> và timeout celebration). */
export const COUNT_MS = 850;
export const SWEEP_MS = 900;
export const HEAL_MS = 1000;
export const SPARKLE_MS = 900;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
