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
export {
  deselectKeys,
  selectKeys,
  selectRange,
  selectionState,
  toggleKey,
} from './core/selection.js'
export type { SelectionState } from './core/selection.js'
export { createDebouncer } from './core/debounce.js'
export type { Debouncer } from './core/debounce.js'
export { clampPosition, moveGridPosition } from './core/navigation.js'
export type { GridBounds, GridPosition } from './core/navigation.js'
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
  SelectionMode,
  SortDirection,
  SortEntry,
  TableClasses,
  TableLabels,
  TableState,
} from './types.js'
