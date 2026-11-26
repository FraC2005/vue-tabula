/**
 * Uguaglianza strutturale tra due valori JSON (confronto per contenuto, non per riferimento).
 * L'ordine delle chiavi non conta e le chiavi con valore `undefined` valgono come assenti,
 * come in `JSON.stringify`. Funziona anche con i proxy reattivi di Vue.
 */
export function jsonEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false

  const aIsArray = Array.isArray(a)
  if (aIsArray !== Array.isArray(b)) return false
  if (aIsArray) {
    const left = a as unknown[]
    const right = b as unknown[]
    return left.length === right.length && left.every((item, i) => jsonEqual(item, right[i]))
  }

  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = (o: Record<string, unknown>) => Object.keys(o).filter((k) => o[k] !== undefined)
  const leftKeys = keys(left)
  return (
    leftKeys.length === keys(right).length &&
    leftKeys.every((k) => Object.hasOwn(right, k) && jsonEqual(left[k], right[k]))
  )
}
