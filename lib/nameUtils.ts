/**
 * Format a name for display. Only applies title case to names that are
 * entirely lowercase (e.g. "jackson shea" → "Jackson Shea").
 * Names with existing capitals are left unchanged (e.g. "McAlear" stays "McAlear").
 */
export function displayName(name: string): string {
  if (!name) return name

  const trimmed = name.trim()

  // Check if the name is entirely lowercase (no uppercase letters at all)
  if (trimmed === trimmed.toLowerCase()) {
    // Apply title case: capitalize first letter of each word
    return trimmed
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Name already has capitals, return as-is
  return trimmed
}

/**
 * Format a handicap for display. Shows "—" for unset handicaps (0 with no rounds).
 */
export function displayHandicap(handicap: number, hasRounds: boolean): string | number {
  if (handicap === 0 && !hasRounds) {
    return '—'
  }
  return handicap
}
