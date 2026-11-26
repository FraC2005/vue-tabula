import type {
  FilterKind,
  FilterPrimitive,
  FilterValue,
  NumberRange,
  SortEntry,
  TableState,
} from '../types.js'
import { isFilterActive } from './columnFilters.js'
import { paginate } from './paginate.js'
import { DEFAULT_PAGE_SIZE, createDefaultState } from './state.js'

/** Versione corrente del formato di `TableState`. */
export const STATE_VERSION = 1

/** Le sole proprietà di una colonna che servono a validare uno stato. */
export interface StateColumn {
  id: string
  sortable?: boolean
  filter?: FilterKind
  minWidth?: number
  maxWidth?: number
}

export interface StateValidationContext {
  /** Colonne esistenti: lo stato che le cita per id viene tenuto, il resto scartato. */
  columns: readonly StateColumn[]
  /** Dimensioni di pagina ammesse. */
  pageSizeOptions: readonly number[]
  /** Dimensione di pagina di ripiego (default: 25). È sempre ammessa. */
  defaultPageSize?: number
}

type Raw = Record<string, unknown>

/**
 * Migrazioni dal formato `n` al formato `n + 1`. Oggi esiste solo la versione 1, quindi la
 * tabella è vuota: quando il formato cambierà, qui si aggiunge il passaggio dalla versione
 * precedente (es. `1: (raw) => ({ ...raw, nuovoCampo: … })`).
 */
const MIGRATIONS: Record<number, (raw: Raw) => Raw> = {}

const MAX_LIST = 1000

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPrimitive(value: unknown): value is FilterPrimitive {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

function bound(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Valida il valore di un filtro; restituisce `undefined` se è del tipo sbagliato o non attivo. */
function validateFilter(value: unknown, kind: FilterKind | undefined): FilterValue | undefined {
  let result: FilterValue | undefined
  if (typeof value === 'string') {
    if (kind === undefined || kind === 'text' || kind === 'select') result = value
  } else if (isPrimitive(value)) {
    if (kind === undefined || kind === 'select') result = value
  } else if (Array.isArray(value)) {
    if (kind === undefined || kind === 'select') {
      result = value.slice(0, MAX_LIST).filter(isPrimitive)
    }
  } else if (isRecord(value)) {
    if (kind === undefined || kind === 'number') {
      const range: NumberRange = {}
      const min = bound(value.min)
      const max = bound(value.max)
      if (min !== undefined) range.min = min
      if (max !== undefined) range.max = max
      result = range
    }
  }
  return isFilterActive(result) ? result : undefined
}

function validateSort(value: unknown, columns: readonly StateColumn[]): SortEntry[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const result: SortEntry[] = []
  for (const entry of value.slice(0, MAX_LIST)) {
    if (!isRecord(entry)) continue
    const { columnId, dir } = entry
    if (typeof columnId !== 'string' || (dir !== 'asc' && dir !== 'desc')) continue
    const column = columns.find((c) => c.id === columnId)
    if (!column || column.sortable === false || seen.has(columnId)) continue
    seen.add(columnId)
    result.push({ columnId, dir })
  }
  return result
}

/** Elenco di id di colonna: solo stringhe note, senza duplicati, nell'ordine dato. */
function validateIds(value: unknown, columns: readonly StateColumn[]): string[] {
  if (!Array.isArray(value)) return []
  const known = new Set(columns.map((c) => c.id))
  const result: string[] = []
  for (const id of value.slice(0, MAX_LIST)) {
    if (typeof id === 'string' && known.has(id) && !result.includes(id)) result.push(id)
  }
  return result
}

function validateFields(raw: Raw, ctx: StateValidationContext): TableState {
  const defaultPageSize = ctx.defaultPageSize ?? DEFAULT_PAGE_SIZE
  const fallback = createDefaultState({ pageSize: defaultPageSize })
  const own = (key: string): unknown => (Object.hasOwn(raw, key) ? raw[key] : undefined)

  const filters: Record<string, FilterValue> = {}
  const visibility: Record<string, boolean> = {}
  const widths: Record<string, number> = {}
  const rawFilters = own('filters')
  const rawVisibility = own('columnVisibility')
  const rawWidths = own('columnWidths')

  for (const column of ctx.columns) {
    if (isRecord(rawFilters) && Object.hasOwn(rawFilters, column.id)) {
      const filter = validateFilter(rawFilters[column.id], column.filter)
      if (filter !== undefined) filters[column.id] = filter
    }
    if (isRecord(rawVisibility) && typeof rawVisibility[column.id] === 'boolean') {
      visibility[column.id] = rawVisibility[column.id] as boolean
    }
    if (isRecord(rawWidths) && Object.hasOwn(rawWidths, column.id)) {
      const width = bound(rawWidths[column.id])
      if (width !== undefined && width > 0) {
        widths[column.id] = Math.min(
          Math.max(width, column.minWidth ?? 0),
          column.maxWidth ?? Number.POSITIVE_INFINITY,
        )
      }
    }
  }

  const page = own('page')
  const pageSize = own('pageSize')
  const allowedSizes = new Set([...ctx.pageSizeOptions, defaultPageSize])

  return {
    version: STATE_VERSION,
    sort: validateSort(own('sort'), ctx.columns),
    filters,
    globalSearch: typeof own('globalSearch') === 'string' ? (own('globalSearch') as string) : '',
    columnOrder: validateIds(own('columnOrder'), ctx.columns),
    columnVisibility: visibility,
    columnWidths: widths,
    pinnedLeft: validateIds(own('pinnedLeft'), ctx.columns),
    page: typeof page === 'number' && Number.isInteger(page) && page >= 1 ? page : fallback.page,
    pageSize:
      typeof pageSize === 'number' && allowedSizes.has(pageSize) ? pageSize : fallback.pageSize,
  }
}

/**
 * Valida (e normalizza) uno stato proveniente da fuori: JSON salvato, `v-model:state` del
 * genitore, storage del browser. **Non lancia mai**: con un input corrotto o inatteso
 * restituisce lo stato di default. Restituisce sempre un oggetto nuovo e completo.
 *
 * - Chiavi sconosciute e colonne inesistenti vengono ignorate.
 * - I valori di tipo sbagliato vengono scartati e sostituiti dal default del campo
 *   (ordinamenti su colonne non ordinabili, filtri incompatibili con `column.filter`, ecc.).
 * - `pageSize` deve essere tra quelli ammessi; `page` un intero ≥ 1 (per portarla nei limiti
 *   delle pagine disponibili usa `clampStatePage`).
 * - `version`: gli stati più vecchi passano dalle migrazioni; uno di versione **più recente**
 *   di quella che questa libreria conosce non è interpretabile e dà lo stato di default.
 */
export function validateState(input: unknown, ctx: StateValidationContext): TableState {
  const fallback = () => createDefaultState({ pageSize: ctx.defaultPageSize ?? DEFAULT_PAGE_SIZE })
  try {
    if (!isRecord(input)) return fallback()
    let raw: Raw = input
    const version = Object.hasOwn(raw, 'version') ? raw.version : undefined
    if (version !== undefined) {
      if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
        return fallback()
      }
      if (version > STATE_VERSION) return fallback()
      for (let v = version; v < STATE_VERSION; v++) raw = MIGRATIONS[v]?.(raw) ?? raw
    }
    return validateFields(raw, ctx)
  } catch {
    return fallback()
  }
}

/**
 * Come `validateState`, ma accetta anche una stringa JSON. Una stringa che non è JSON valido
 * (o che non contiene un oggetto) dà lo stato di default; non lancia mai.
 */
export function parseState(input: unknown, ctx: StateValidationContext): TableState {
  if (typeof input !== 'string') return validateState(input, ctx)
  try {
    return validateState(JSON.parse(input) as unknown, ctx)
  } catch {
    return validateState(undefined, ctx)
  }
}

/** Porta `page` nei limiti validi per `total` elementi (con `pageSize` dello stato). */
export function clampStatePage(state: TableState, total: number): TableState {
  const { page } = paginate(total, state.page, state.pageSize)
  return page === state.page ? state : { ...state, page }
}

/** Copia profonda di uno stato, come JSON semplice (senza proxy reattivi né `undefined`). */
export function cloneState(state: TableState): TableState {
  return JSON.parse(JSON.stringify(state)) as TableState
}
