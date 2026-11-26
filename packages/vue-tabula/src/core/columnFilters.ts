import type {
  ColumnDef,
  FilterKind,
  FilterOption,
  FilterPrimitive,
  FilterValue,
  NumberRange,
} from '../types.js'
import { getCellValue } from './accessor.js'
import { normalizeText } from './filter.js'
import { compareValues } from './sort.js'

function isRange(value: FilterValue): value is NumberRange {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isBound(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * Dice se un filtro limita davvero le righe: stringhe vuote (o di soli spazi), array vuoti,
 * intervalli senza estremi e valori assenti non contano come filtri.
 */
export function isFilterActive(value: FilterValue | null | undefined): value is FilterValue {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (Array.isArray(value)) return value.length > 0
  if (isRange(value)) return isBound(value.min) || isBound(value.max)
  return true
}

function inferKind(value: FilterValue): FilterKind {
  if (typeof value === 'string') return 'text'
  if (isRange(value)) return 'number'
  return 'select'
}

function sameValue(a: unknown, b: FilterPrimitive): boolean {
  if (a === null || a === undefined) return false
  return a === b || String(a) === String(b)
}

/** Confronto di default di una cella con il valore di un filtro. */
function matchesBuiltin(kind: FilterKind, value: unknown, filter: FilterValue): boolean {
  if (kind === 'text') {
    if (value === null || value === undefined) return false
    const text = value instanceof Date ? value.toISOString() : String(value)
    return normalizeText(text).includes(normalizeText(String(filter).trim()))
  }
  if (kind === 'number') {
    if (!isRange(filter)) return false
    if (value === null || value === undefined || value === '') return false
    const n = Number(value)
    if (Number.isNaN(n)) return false
    if (isBound(filter.min) && n < filter.min) return false
    if (isBound(filter.max) && n > filter.max) return false
    return true
  }
  const wanted = Array.isArray(filter) ? filter : isRange(filter) ? [] : [filter]
  return wanted.some((w) => sameValue(value, w))
}

/**
 * Applica i filtri di colonna: una riga resta se soddisfa **tutti** i filtri attivi (AND).
 * Il tipo di confronto viene da `column.filter`; se manca si deduce dalla forma del valore
 * (testo → `text`, intervallo → `number`, altro → `select`). `column.filterFn` sostituisce
 * il confronto di default. Filtri su colonne sconosciute e filtri non attivi vengono ignorati.
 * Non modifica `rows`.
 *
 * @param indices indici da considerare; se omesso, tutte le righe.
 */
export function columnFilterIndices<T>(
  rows: readonly T[],
  columns: readonly ColumnDef<T>[],
  filters: Readonly<Record<string, FilterValue>>,
  indices?: readonly number[],
): number[] {
  const candidates = indices ?? Array.from({ length: rows.length }, (_, i) => i)

  const active = columns.flatMap((column) => {
    const filter = filters[column.id]
    return isFilterActive(filter) ? [{ column, filter }] : []
  })
  if (active.length === 0) return [...candidates]

  return candidates.filter((index) => {
    const row = rows[index] as T
    return active.every(({ column, filter }) => {
      const value = getCellValue(row, column)
      return column.filterFn
        ? column.filterFn(value, filter, row)
        : matchesBuiltin(column.filter ?? inferKind(filter), value, filter)
    })
  })
}

/** Opzione normalizzata di un filtro `select`. */
export interface NormalizedOption {
  label: string
  value: FilterPrimitive
}

/** Porta le opzioni di `filterOptions` nella forma `{ label, value }`. */
export function normalizeOptions(options: readonly FilterOption[]): NormalizedOption[] {
  return options.map((option) =>
    typeof option === 'object' ? option : { label: String(option), value: option },
  )
}

/**
 * Opzioni di un filtro `select`: quelle dichiarate in `column.filterOptions`, altrimenti
 * i valori distinti (non nulli) presenti nelle righe, in ordine naturale.
 */
export function selectOptions<T>(rows: readonly T[], column: ColumnDef<T>): NormalizedOption[] {
  if (column.filterOptions) return normalizeOptions(column.filterOptions)
  const seen = new Set<FilterPrimitive>()
  for (const row of rows) {
    const value = getCellValue(row, column)
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      seen.add(value)
    }
  }
  return [...seen].sort(compareValues).map((value) => ({ label: String(value), value }))
}
