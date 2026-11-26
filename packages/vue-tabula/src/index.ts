export { default as VtTable } from './components/VtTable.vue'
export { createDefaultState, DEFAULT_PAGE_SIZE } from './core/state.js'
export { getCellValue } from './core/accessor.js'
export type {
  CellSlotProps,
  ColumnDef,
  RowKey,
  SortDirection,
  SortEntry,
  TableState,
} from './types.js'
