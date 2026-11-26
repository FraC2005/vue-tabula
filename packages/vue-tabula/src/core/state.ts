import type { TableState } from '../types.js'

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
