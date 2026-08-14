/**
 * Easing function for count-up animation (ease-out cubic).
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/**
 * Check if the user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Format a number for display in the count-up animation.
 * Integers are shown without decimals, floats with one decimal place.
 */
export function formatCountUp(value: number): string {
  const decimals = Number.isInteger(value) ? 0 : 1
  return value.toFixed(decimals)
}
