<script setup lang="ts" generic="T extends object">
import { computed, ref } from 'vue'
import type {
  CellSlotProps,
  ColumnDef,
  FilterSlotProps,
  FilterValue,
  HeaderSlotProps,
  RowKey,
  TableClasses,
  TableLabels,
  TableState,
} from '../types.js'
import { getCellValue } from '../core/accessor.js'
import { columnFilterIndices, isFilterActive, selectOptions } from '../core/columnFilters.js'
import { globalSearchIndices } from '../core/filter.js'
import { DEFAULT_LABELS } from '../core/labels.js'
import { paginate } from '../core/paginate.js'
import { sortIndices, toggleSort } from '../core/sort.js'
import { DEFAULT_PAGE_SIZE, createDefaultState, setColumnFilter } from '../core/state.js'

const props = withDefaults(
  defineProps<{
    rows: T[]
    columns: ColumnDef<T>[]
    /** Chiave della riga oppure funzione che la calcola. */
    rowKey: keyof T | ((row: T) => RowKey)
    ariaLabel?: string
    /** Righe per pagina iniziali. */
    pageSize?: number
    /** Valori proposti nel selettore delle righe per pagina. */
    pageSizeOptions?: number[]
    /** Mostra la barra con la ricerca globale. */
    searchable?: boolean
    /** Abilita la paginazione lato client. */
    paginated?: boolean
    /** Classi aggiuntive per le parti principali. */
    classes?: TableClasses
    /** Testi dell'interfaccia (parziali: gli altri restano di default). */
    labels?: Partial<TableLabels>
  }>(),
  {
    ariaLabel: undefined,
    pageSize: DEFAULT_PAGE_SIZE,
    pageSizeOptions: () => [10, 25, 50, 100],
    searchable: true,
    paginated: true,
    classes: () => ({}),
    labels: () => ({}),
  },
)

defineSlots<{
  /** Slot di fallback per qualsiasi cella. */
  cell?(props: CellSlotProps<T>): unknown
  /** Slot per le celle di una colonna specifica: `cell-<columnId>`. */
  [name: `cell-${string}`]: ((props: CellSlotProps<T>) => unknown) | undefined
  /** Slot per l'intestazione di una colonna: `header-<columnId>`. */
  [name: `header-${string}`]: ((props: HeaderSlotProps<T>) => unknown) | undefined
  /** Controllo di filtro di una colonna: `filter-<columnId>`. */
  [name: `filter-${string}`]: ((props: FilterSlotProps<T>) => unknown) | undefined
  /** Contenuto mostrato quando non ci sono righe da visualizzare. */
  empty?(): unknown
  /** Sostituisce la barra di ricerca di default. */
  toolbar?(props: { search: string; setSearch: (value: string) => void }): unknown
  /** Sostituisce i controlli di paginazione di default. */
  pagination?(props: {
    page: number
    pageCount: number
    pageSize: number
    total: number
    setPage: (page: number) => void
  }): unknown
}>()

const state = ref<TableState>(createDefaultState({ pageSize: props.pageSize }))

const text = computed<TableLabels>(() => ({ ...DEFAULT_LABELS, ...props.labels }))

// Pipeline: filtri di colonna → ricerca globale → ordinamento → pagina. Ogni passo lavora
// su indici e si ricalcola solo quando cambiano i propri input (computed memoizza).
const columnFiltered = computed(() =>
  columnFilterIndices(props.rows, props.columns, state.value.filters),
)
const filtered = computed(() =>
  globalSearchIndices(props.rows, props.columns, state.value.globalSearch, columnFiltered.value),
)
const sorted = computed(() =>
  sortIndices(props.rows, props.columns, state.value.sort, filtered.value),
)
const pageInfo = computed(() =>
  props.paginated
    ? paginate(sorted.value.length, state.value.page, state.value.pageSize)
    : paginate(sorted.value.length, 1, Math.max(1, sorted.value.length)),
)
const visibleRows = computed(() =>
  sorted.value.slice(pageInfo.value.start, pageInfo.value.end).map((i) => props.rows[i] as T),
)
const total = computed(() => sorted.value.length)

function keyOf(row: T): RowKey {
  const key = props.rowKey
  return typeof key === 'function' ? key(row) : (row[key] as RowKey)
}

function isSortable(column: ColumnDef<T>): boolean {
  return column.sortable !== false
}

function sortOf(column: ColumnDef<T>) {
  const index = state.value.sort.findIndex((s) => s.columnId === column.id)
  return index === -1 ? undefined : { entry: state.value.sort[index]!, index }
}

function ariaSort(column: ColumnDef<T>): 'ascending' | 'descending' | 'none' | undefined {
  if (!isSortable(column)) return undefined
  const dir = sortOf(column)?.entry.dir
  return dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'
}

function onSort(column: ColumnDef<T>, event: MouseEvent | KeyboardEvent) {
  state.value = {
    ...state.value,
    sort: toggleSort(state.value.sort, column.id, event.shiftKey),
    page: 1,
  }
}

function setSearch(value: string) {
  state.value = { ...state.value, globalSearch: value, page: 1 }
}

function setPage(page: number) {
  state.value = { ...state.value, page: paginate(total.value, page, state.value.pageSize).page }
}

function setPageSize(size: number) {
  state.value = { ...state.value, pageSize: size, page: 1 }
}

// --- Filtri di colonna ---

const filterColumns = computed(() => props.columns.filter((c) => c.filter))
const hasFilterRow = computed(() => filterColumns.value.length > 0)
/** Righe occupate dall'intestazione (etichette + eventuale riga dei filtri). */
const headerRowCount = computed(() => (hasFilterRow.value ? 2 : 1))
const hasActiveFilters = computed(() =>
  Object.values(state.value.filters).some((f) => isFilterActive(f)),
)

function setFilter(column: ColumnDef<T>, value: FilterValue | undefined) {
  state.value = setColumnFilter(state.value, column.id, value)
}

function clearFilters() {
  state.value = { ...state.value, filters: {}, globalSearch: '', page: 1 }
}

function filterSlotProps(column: ColumnDef<T>): FilterSlotProps<T> {
  return {
    column,
    value: state.value.filters[column.id],
    setValue: (value) => setFilter(column, value),
  }
}

function textFilter(column: ColumnDef<T>): string {
  const value = state.value.filters[column.id]
  return typeof value === 'string' ? value : ''
}

function rangeBound(column: ColumnDef<T>, bound: 'min' | 'max'): string {
  const value = state.value.filters[column.id]
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return ''
  const n = value[bound]
  return typeof n === 'number' ? String(n) : ''
}

function setRangeBound(column: ColumnDef<T>, bound: 'min' | 'max', raw: string) {
  const current = state.value.filters[column.id]
  const range =
    typeof current === 'object' && current !== null && !Array.isArray(current) ? current : {}
  const n = raw.trim() === '' ? undefined : Number(raw)
  const next = { ...range, [bound]: n === undefined || Number.isNaN(n) ? undefined : n }
  setFilter(column, { min: next.min, max: next.max })
}

// Opzioni dei filtri `select`, ricalcolate solo quando cambiano righe o colonne.
const optionsByColumn = computed(() => {
  const map = new Map<string, ReturnType<typeof selectOptions>>()
  for (const column of filterColumns.value) {
    if (column.filter === 'select') map.set(column.id, selectOptions(props.rows, column))
  }
  return map
})

/** Indice (come stringa) dell'opzione selezionata; '' = nessun filtro. */
function selectedOption(column: ColumnDef<T>): string {
  const value = state.value.filters[column.id]
  const current = Array.isArray(value) ? value[0] : value
  const options = optionsByColumn.value.get(column.id) ?? []
  const index = options.findIndex((o) => o.value === current)
  return index === -1 ? '' : String(index)
}

function setSelectedOption(column: ColumnDef<T>, raw: string) {
  const option = raw === '' ? undefined : optionsByColumn.value.get(column.id)?.[Number(raw)]
  setFilter(column, option?.value)
}

function cellStyle(column: ColumnDef<T>) {
  return {
    flex: column.width ? `0 0 ${column.width}px` : '1 1 0',
    minWidth: column.minWidth ? `${column.minWidth}px` : undefined,
    maxWidth: column.maxWidth ? `${column.maxWidth}px` : undefined,
  }
}

const summary = computed(() =>
  text.value.summary({
    start: total.value === 0 ? 0 : pageInfo.value.start + 1,
    end: pageInfo.value.end,
    total: total.value,
  }),
)

defineExpose({
  /** Copia dello stato corrente (serializzabile in JSON). */
  getState: (): TableState => JSON.parse(JSON.stringify(state.value)) as TableState,
  /** Rimuove tutti i filtri di colonna e la ricerca globale. */
  clearFilters,
  /** Riporta ordinamento, filtri, ricerca e pagina ai valori iniziali. */
  resetState: () => {
    state.value = createDefaultState({ pageSize: props.pageSize })
  },
})
</script>

<template>
  <div :class="['vt-root', classes.root]">
    <slot name="toolbar" :search="state.globalSearch" :set-search="setSearch">
      <div v-if="searchable || hasFilterRow" :class="['vt-toolbar', classes.toolbar]">
        <input
          v-if="searchable"
          :class="['vt-search', classes.search]"
          type="search"
          :value="state.globalSearch"
          :aria-label="text.search"
          :placeholder="text.searchPlaceholder"
          @input="setSearch(($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="hasActiveFilters || state.globalSearch"
          type="button"
          class="vt-clear-filters"
          @click="clearFilters"
        >
          {{ text.clearFilters }}
        </button>
      </div>
    </slot>

    <div
      class="vt-grid"
      role="grid"
      :aria-label="ariaLabel"
      :aria-rowcount="total + headerRowCount"
      :aria-colcount="columns.length"
    >
      <div :class="['vt-header', classes.header]" role="rowgroup">
        <div :class="['vt-row', classes.row]" role="row" :aria-rowindex="1">
          <div
            v-for="(column, c) in columns"
            :key="column.id"
            :class="['vt-header-cell', classes.headerCell]"
            :style="cellStyle(column)"
            :data-align="column.align"
            role="columnheader"
            :aria-colindex="c + 1"
            :aria-sort="ariaSort(column)"
          >
            <button
              v-if="isSortable(column)"
              type="button"
              class="vt-sort-button"
              @click="onSort(column, $event)"
            >
              <slot :name="`header-${column.id}`" :column="column">{{ column.header }}</slot>
              <span class="vt-sort-indicator" aria-hidden="true">
                <template v-if="sortOf(column)">
                  {{ sortOf(column)!.entry.dir === 'asc' ? '▲' : '▼' }}
                  <sup v-if="state.sort.length > 1">{{ sortOf(column)!.index + 1 }}</sup>
                </template>
              </span>
            </button>
            <slot v-else :name="`header-${column.id}`" :column="column">{{ column.header }}</slot>
          </div>
        </div>
        <div
          v-if="hasFilterRow"
          :class="['vt-row', 'vt-filter-row', classes.row, classes.filterRow]"
          role="row"
          :aria-rowindex="2"
        >
          <div
            v-for="(column, c) in columns"
            :key="column.id"
            :class="['vt-filter-cell', classes.headerCell]"
            :style="cellStyle(column)"
            role="gridcell"
            :aria-colindex="c + 1"
          >
            <slot :name="`filter-${column.id}`" v-bind="filterSlotProps(column)">
              <input
                v-if="column.filter === 'text'"
                :class="['vt-filter-input', classes.filterInput]"
                type="text"
                :value="textFilter(column)"
                :aria-label="text.filterColumn(column.header)"
                @input="setFilter(column, ($event.target as HTMLInputElement).value)"
              />
              <select
                v-else-if="column.filter === 'select'"
                :class="['vt-filter-input', classes.filterInput]"
                :value="selectedOption(column)"
                :aria-label="text.filterColumn(column.header)"
                @change="setSelectedOption(column, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">{{ text.filterAll }}</option>
                <option
                  v-for="(option, i) in optionsByColumn.get(column.id)"
                  :key="i"
                  :value="String(i)"
                >
                  {{ option.label }}
                </option>
              </select>
              <span v-else-if="column.filter === 'number'" class="vt-filter-range">
                <input
                  :class="['vt-filter-input', classes.filterInput]"
                  type="number"
                  :value="rangeBound(column, 'min')"
                  :placeholder="text.filterMin"
                  :aria-label="`${text.filterColumn(column.header)}: ${text.filterMin}`"
                  @input="setRangeBound(column, 'min', ($event.target as HTMLInputElement).value)"
                />
                <input
                  :class="['vt-filter-input', classes.filterInput]"
                  type="number"
                  :value="rangeBound(column, 'max')"
                  :placeholder="text.filterMax"
                  :aria-label="`${text.filterColumn(column.header)}: ${text.filterMax}`"
                  @input="setRangeBound(column, 'max', ($event.target as HTMLInputElement).value)"
                />
              </span>
            </slot>
          </div>
        </div>
      </div>

      <div :class="['vt-body', classes.body]" role="rowgroup">
        <div
          v-for="(row, r) in visibleRows"
          :key="keyOf(row)"
          :class="['vt-row', classes.row]"
          role="row"
          :aria-rowindex="headerRowCount + pageInfo.start + r + 1"
        >
          <div
            v-for="(column, c) in columns"
            :key="column.id"
            :class="['vt-cell', classes.cell]"
            :style="cellStyle(column)"
            :data-align="column.align"
            role="gridcell"
            :aria-colindex="c + 1"
          >
            <slot
              :name="`cell-${column.id}`"
              :row="row"
              :column="column"
              :value="getCellValue(row, column)"
            >
              <slot name="cell" :row="row" :column="column" :value="getCellValue(row, column)">
                {{ getCellValue(row, column) }}
              </slot>
            </slot>
          </div>
        </div>
        <div
          v-if="visibleRows.length === 0"
          class="vt-row"
          role="row"
          :aria-rowindex="headerRowCount + 1"
        >
          <div :class="['vt-empty', classes.empty]" role="gridcell" :aria-colspan="columns.length">
            <slot name="empty">{{ text.empty }}</slot>
          </div>
        </div>
      </div>
    </div>

    <slot
      v-if="paginated"
      name="pagination"
      :page="pageInfo.page"
      :page-count="pageInfo.pageCount"
      :page-size="state.pageSize"
      :total="total"
      :set-page="setPage"
    >
      <div :class="['vt-pagination', classes.pagination]">
        <span class="vt-summary" role="status" aria-live="polite">{{ summary }}</span>
        <label class="vt-page-size">
          {{ text.pageSize }}
          <select
            :value="state.pageSize"
            @change="setPageSize(Number(($event.target as HTMLSelectElement).value))"
          >
            <option v-for="option in pageSizeOptions" :key="option" :value="option">
              {{ option }}
            </option>
          </select>
        </label>
        <button
          type="button"
          class="vt-page-button"
          :aria-label="text.previousPage"
          :disabled="pageInfo.page <= 1"
          @click="setPage(pageInfo.page - 1)"
        >
          ‹
        </button>
        <span class="vt-page-label">{{ text.pageOf(pageInfo.page, pageInfo.pageCount) }}</span>
        <button
          type="button"
          class="vt-page-button"
          :aria-label="text.nextPage"
          :disabled="pageInfo.page >= pageInfo.pageCount"
          @click="setPage(pageInfo.page + 1)"
        >
          ›
        </button>
      </div>
    </slot>
  </div>
</template>

<style src="../styles/vue-tabula.css"></style>
