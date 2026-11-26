import type { RowKey, SelectionMode } from '../types.js'

/** Quante delle chiavi considerate risultano selezionate. */
export type SelectionState = 'none' | 'some' | 'all'

/**
 * Seleziona o deseleziona una riga. In modalità `single` la selezione è al massimo una riga;
 * in `multiple` si aggiunge o si toglie; con `none` non cambia nulla. Restituisce un nuovo array.
 */
export function toggleKey(selected: readonly RowKey[], key: RowKey, mode: SelectionMode): RowKey[] {
  if (mode === 'none') return [...selected]
  const isSelected = selected.includes(key)
  if (mode === 'single') return isSelected ? [] : [key]
  return isSelected ? selected.filter((k) => k !== key) : [...selected, key]
}

/**
 * Aggiunge alla selezione tutte le righe comprese tra `anchor` e `target` (estremi inclusi),
 * secondo `orderedKeys` (l'ordine in cui le righe sono mostrate). Il verso non conta.
 * Se `target` non è in `orderedKeys` non cambia nulla; se manca `anchor` si seleziona solo `target`.
 */
export function selectRange(
  selected: readonly RowKey[],
  orderedKeys: readonly RowKey[],
  anchor: RowKey | null,
  target: RowKey,
): RowKey[] {
  const to = orderedKeys.indexOf(target)
  if (to === -1) return [...selected]
  const from = anchor === null ? -1 : orderedKeys.indexOf(anchor)
  const range =
    from === -1 ? [target] : orderedKeys.slice(Math.min(from, to), Math.max(from, to) + 1)
  return selectKeys(selected, range)
}

/** Aggiunge `keys` alla selezione (senza duplicati, mantenendo l'ordine esistente). */
export function selectKeys(selected: readonly RowKey[], keys: readonly RowKey[]): RowKey[] {
  const present = new Set(selected)
  return [...selected, ...keys.filter((k) => !present.has(k))]
}

/** Toglie `keys` dalla selezione; le altre righe selezionate restano. */
export function deselectKeys(selected: readonly RowKey[], keys: readonly RowKey[]): RowKey[] {
  const remove = new Set(keys)
  return selected.filter((k) => !remove.has(k))
}

/** Stato di selezione di un insieme di chiavi: nessuna, alcune o tutte (vuoto = `none`). */
export function selectionState(
  selected: readonly RowKey[],
  keys: readonly RowKey[],
): SelectionState {
  if (keys.length === 0) return 'none'
  const set = new Set(selected)
  let count = 0
  for (const key of keys) if (set.has(key)) count++
  return count === 0 ? 'none' : count === keys.length ? 'all' : 'some'
}
