import './styles/vue-tabula.css'

export { default as VtTable } from './components/VtTable.vue'
export { createDefaultState, DEFAULT_PAGE_SIZE } from './core/state'
export { getCellValue } from './core/accessor'
export type {
  CellSlotProps,
  ColumnDef,
  RowKey,
  SortDirection,
  SortEntry,
  TableState,
} from './types'
