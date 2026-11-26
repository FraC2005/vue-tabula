import type { FilterValue, TableState } from '../types.js'
import { isFilterActive } from './columnFilters.js'

/** Dimensione di pagina predefinita. */
export const DEFAULT_PAGE_SIZE = 25

/** Crea uno stato iniziale valido; i campi passati sovrascrivono i default. */
export function createDefaultState(overrides: Partial<TableState> = {}): TableState {
  return {
    version: 1,
    sort: [],
    filters: {},
    globalSearch: '',
    columnOrder: [],
    columnVisibility: {},
    columnWidths: {},
    pinnedLeft: [],
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    ...overrides,
  }
}

/**
 * Restituisce un nuovo stato con il filtro della colonna impostato; un valore non attivo
 * (vuoto o `undefined`) rimuove il filtro. Ogni cambio di filtro riporta a pagina 1.
 */
export function setColumnFilter(
  state: TableState,
  columnId: string,
  value: FilterValue | undefined,
): TableState {
  const filters = { ...state.filters }
  if (isFilterActive(value)) filters[columnId] = value
  else delete filters[columnId]
  return { ...state, filters, page: 1 }
}
