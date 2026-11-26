export { default as VtTable } from './components/VtTable.vue'
export { createDefaultState, DEFAULT_PAGE_SIZE, setColumnFilter } from './core/state.js'
export { getCellValue } from './core/accessor.js'
export { compareValues, sortIndices, toggleSort } from './core/sort.js'
export { globalSearchIndices, normalizeText } from './core/filter.js'
export {
  columnFilterIndices,
  isFilterActive,
  normalizeOptions,
  selectOptions,
} from './core/columnFilters.js'
export type { NormalizedOption } from './core/columnFilters.js'
export { paginate } from './core/paginate.js'
export type { PageInfo } from './core/paginate.js'
export type {
  CellSlotProps,
  ColumnDef,
  FilterKind,
  FilterOption,
  FilterPrimitive,
  FilterSlotProps,
  FilterValue,
  NumberRange,
  HeaderSlotProps,
  RowKey,
  SortDirection,
  SortEntry,
  TableClasses,
  TableLabels,
  TableState,
} from './types.js'
