import type { ColumnDef, SortEntry } from '../types.js'
import { getCellValue } from './accessor.js'

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))
}

/**
 * Confronto di default tra due valori non nulli.
 * Numeri, bigint, date e booleani si confrontano per valore; il resto come testo
 * (senza distinguere maiuscole/accenti e con ordine numerico: "a2" < "a10").
 */
export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'bigint' && typeof b === 'bigint') return a < b ? -1 : a > b ? 1 : 0
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return collator.compare(String(a), String(b))
}

/**
 * Ordina gli indici delle righe secondo le voci di `sort` (la prima ha priorità).
 * Non modifica `rows`. L'ordinamento è stabile: a parità di valori resta l'ordine
 * degli indici in ingresso. I valori nulli vanno sempre in fondo, in entrambe le direzioni.
 *
 * @param indices indici da ordinare (es. quelli già filtrati); se omesso, tutte le righe.
 */
export function sortIndices<T>(
  rows: readonly T[],
  columns: readonly ColumnDef<T>[],
  sort: readonly SortEntry[],
  indices?: readonly number[],
): number[] {
  const result = indices ? [...indices] : Array.from({ length: rows.length }, (_, i) => i)

  const keys = sort.flatMap((entry) => {
    const column = columns.find((c) => c.id === entry.columnId)
    if (!column) return []
    // Valori calcolati una volta sola: l'accessor non viene chiamato a ogni confronto.
    const values = rows.map((row) => getCellValue(row, column))
    return [
      { values, compare: column.sortFn ?? compareValues, sign: entry.dir === 'desc' ? -1 : 1 },
    ]
  })
  if (keys.length === 0) return result

  return result.sort((i, j) => {
    for (const { values, compare, sign } of keys) {
      const a = values[i]
      const b = values[j]
      const aNull = isNullish(a)
      const bNull = isNullish(b)
      if (aNull || bNull) {
        if (aNull && bNull) continue
        return aNull ? 1 : -1
      }
      const diff = compare(a, b)
      if (diff !== 0) return diff * sign
    }
    return i - j
  })
}

/**
 * Calcola il nuovo ordinamento dopo un clic sull'intestazione di `columnId`.
 * Il ciclo è asc → desc → nessuno. Con `multi` (tasto Maiusc) la colonna si aggiunge
 * alle altre mantenendone l'ordine; senza, sostituisce l'ordinamento corrente.
 */
export function toggleSort(
  sort: readonly SortEntry[],
  columnId: string,
  multi = false,
): SortEntry[] {
  const current = sort.find((s) => s.columnId === columnId)
  const next: SortEntry | null =
    current === undefined
      ? { columnId, dir: 'asc' }
      : current.dir === 'asc'
        ? { columnId, dir: 'desc' }
        : null

  if (!multi) return next ? [next] : []
  if (!current) return [...sort, next as SortEntry]
  return sort.flatMap((s) => (s.columnId === columnId ? (next ? [next] : []) : [s]))
}
