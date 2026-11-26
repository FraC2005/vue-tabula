<script setup lang="ts" generic="T extends object">
import { computed, nextTick, onBeforeUnmount, ref, useSlots } from 'vue'
import type {
  CellSlotProps,
  ColumnDef,
  FilterSlotProps,
  FilterValue,
  HeaderSlotProps,
  RowKey,
  SelectionMode,
  TableClasses,
  TableLabels,
  TableState,
} from '../types.js'
import { getCellValue, getRowKey } from '../core/accessor.js'
import { columnFilterIndices, isFilterActive, selectOptions } from '../core/columnFilters.js'
import { createDebouncer } from '../core/debounce.js'
import { globalSearchIndices } from '../core/filter.js'
import { DEFAULT_LABELS } from '../core/labels.js'
import { clampPosition, moveGridPosition } from '../core/navigation.js'
import type { GridPosition } from '../core/navigation.js'
import { paginate } from '../core/paginate.js'
import {
  deselectKeys,
  selectKeys,
  selectRange,
  selectionState,
  toggleKey,
} from '../core/selection.js'
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
    /**
     * Ritardo in ms prima di applicare ricerca globale e filtri di testo o numerici mentre
     * si digita. 0 = subito. I filtri a selezione si applicano sempre subito.
     */
    debounce?: number
    /** Modalità di selezione delle righe (per `rowKey`, anche tra le pagine). */
    selection?: SelectionMode
    /** Con la selezione attiva, mostra la colonna con le checkbox. */
    selectionColumn?: boolean
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
    debounce: 250,
    selection: 'none',
    selectionColumn: true,
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

/** Chiavi delle righe selezionate; `v-model:selected` è facoltativo. */
const selectedModel = defineModel<RowKey[]>('selected', { default: () => [] })
const slots = useSlots()

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
  return getRowKey(row, props.rowKey)
}

// --- Debounce: ciò che l'utente digita (bozza) si applica allo stato dopo `debounce` ms ---

const debouncer = createDebouncer()
/** Testo della ricerca non ancora applicato (`null` = nessuna bozza). */
const searchDraft = ref<string | null>(null)
/** Filtri non ancora applicati, per id di colonna (chiave presente = bozza attiva). */
const filterDrafts = ref<Record<string, FilterValue | undefined>>({})

function delay(): number {
  return Math.max(0, props.debounce)
}

/** Applica subito tutte le bozze in attesa (blur, Invio, Esc, `getState`). */
function flushPending() {
  debouncer.flush()
}

function discardPending() {
  debouncer.cancel()
  searchDraft.value = null
  filterDrafts.value = {}
}

onBeforeUnmount(() => debouncer.cancel())

// --- Ordinamento, ricerca, pagina ---

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
  flushPending()
  state.value = {
    ...state.value,
    sort: toggleSort(state.value.sort, column.id, event.shiftKey),
    page: 1,
  }
  // Dopo il clic il focus torna sulla cella dell'intestazione (unico tab stop della riga).
  void focusCell({ row: 0, col: props.columns.indexOf(column) + colOffset.value })
}

function setSearch(value: string) {
  debouncer.cancel('search')
  searchDraft.value = null
  state.value = { ...state.value, globalSearch: value, page: 1 }
}

function onSearchInput(value: string) {
  searchDraft.value = value
  debouncer.schedule(
    'search',
    () => {
      if (searchDraft.value !== null) setSearch(searchDraft.value)
    },
    delay(),
  )
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

/** Applica subito un filtro (selezioni, slot personalizzati, ripristini). */
function setFilter(column: ColumnDef<T>, value: FilterValue | undefined) {
  debouncer.cancel(`filter:${column.id}`)
  delete filterDrafts.value[column.id]
  state.value = setColumnFilter(state.value, column.id, value)
}

/** Registra una bozza di filtro e la applica dopo il debounce (testo e numeri). */
function setFilterDebounced(column: ColumnDef<T>, value: FilterValue | undefined) {
  filterDrafts.value[column.id] = value
  debouncer.schedule(
    `filter:${column.id}`,
    () => {
      if (column.id in filterDrafts.value) setFilter(column, filterDrafts.value[column.id])
    },
    delay(),
  )
}

/** Valore del filtro da mostrare: la bozza se c'è, altrimenti quello nello stato. */
function shownFilter(column: ColumnDef<T>): FilterValue | undefined {
  return column.id in filterDrafts.value
    ? filterDrafts.value[column.id]
    : state.value.filters[column.id]
}

function clearFilters() {
  discardPending()
  state.value = { ...state.value, filters: {}, globalSearch: '', page: 1 }
}

function filterSlotProps(column: ColumnDef<T>): FilterSlotProps<T> {
  return {
    column,
    value: shownFilter(column),
    setValue: (value) => setFilter(column, value),
  }
}

function textFilter(column: ColumnDef<T>): string {
  const value = shownFilter(column)
  return typeof value === 'string' ? value : ''
}

function rangeBound(column: ColumnDef<T>, bound: 'min' | 'max'): string {
  const value = shownFilter(column)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return ''
  const n = value[bound]
  return typeof n === 'number' ? String(n) : ''
}

function setRangeBound(column: ColumnDef<T>, bound: 'min' | 'max', raw: string) {
  const current = shownFilter(column)
  const range =
    typeof current === 'object' && current !== null && !Array.isArray(current) ? current : {}
  const n = raw.trim() === '' ? undefined : Number(raw)
  const next = { ...range, [bound]: n === undefined || Number.isNaN(n) ? undefined : n }
  setFilterDebounced(column, { min: next.min, max: next.max })
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

// --- Selezione delle righe (per chiave, quindi anche tra pagine, ordinamenti e filtri) ---

const selectionEnabled = computed(() => props.selection !== 'none')
const showSelectColumn = computed(() => selectionEnabled.value && props.selectionColumn)
/** Posizioni occupate dalla colonna di selezione davanti alle colonne di dati. */
const colOffset = computed(() => (showSelectColumn.value ? 1 : 0))
const selectedSet = computed(() => new Set(selectedModel.value))
const selectedCount = computed(() => selectedModel.value.length)
/** Chiavi di tutte le righe filtrate, nell'ordine mostrato (servono a intervalli e "tutte"). */
const filteredKeys = computed(() =>
  selectionEnabled.value ? sorted.value.map((i) => keyOf(props.rows[i] as T)) : [],
)
const allState = computed(() => selectionState(selectedModel.value, filteredKeys.value))
const selectionSummary = computed(() => text.value.selectedCount(selectedCount.value))
/** Senza il riepilogo della paginazione di default, l'annuncio ha una regione propria. */
const showSelectionStatus = computed(
  () => selectionEnabled.value && (!props.paginated || !!slots.pagination),
)
let anchorKey: RowKey | null = null

function isSelected(row: T): boolean {
  return selectedSet.value.has(keyOf(row))
}

/** Seleziona/deseleziona una riga; con `range` aggiunge l'intervallo dall'ultima riga toccata. */
function selectRow(row: T, range: boolean): RowKey[] {
  const key = keyOf(row)
  const next =
    range && props.selection === 'multiple'
      ? selectRange(selectedModel.value, filteredKeys.value, anchorKey, key)
      : toggleKey(selectedModel.value, key, props.selection)
  anchorKey = key
  selectedModel.value = next
  return next
}

/** Checkbox dell'intestazione: seleziona tutte le righe filtrate, o le deseleziona se già tutte. */
function toggleAll() {
  if (props.selection !== 'multiple') return
  selectedModel.value =
    allState.value === 'all'
      ? deselectKeys(selectedModel.value, filteredKeys.value)
      : selectKeys(selectedModel.value, filteredKeys.value)
}

function selectAllFiltered() {
  if (props.selection !== 'multiple') return
  selectedModel.value = selectKeys(selectedModel.value, filteredKeys.value)
}

function clearSelection() {
  anchorKey = null
  selectedModel.value = []
}

function onHeaderCheckboxClick(event: MouseEvent) {
  const willSelect = allState.value !== 'all' && filteredKeys.value.length > 0
  toggleAll()
  // La checkbox riflette l'esito calcolato, non quello nativo appena cambiato dal clic
  // (con `v-model:selected` il genitore aggiorna lo stato solo dopo).
  const input = event.target as HTMLInputElement
  input.checked = willSelect
  input.indeterminate = false
}

/** Elementi su cui un clic ha un significato proprio: non devono attivare la selezione. */
const INTERACTIVE_SELECTOR =
  'a, button, input, select, textarea, [contenteditable]:not([contenteditable="false"]), [role="button"]'

/**
 * Clic su una riga: la checkbox di selezione seleziona (con Maiusc, l'intervallo); Maiusc+clic
 * su una cella seleziona l'intervallo. I clic su elementi interattivi dentro le celle (link,
 * pulsanti, campi...) non selezionano nulla.
 */
function onRowClick(row: T, event: MouseEvent) {
  if (!selectionEnabled.value) return
  const target = event.target as HTMLElement
  const onCheckbox = target.classList.contains('vt-select-input')
  if (!onCheckbox) {
    if (!(event.shiftKey && props.selection === 'multiple')) return
    const interactive = target.closest(INTERACTIVE_SELECTOR)
    if (interactive && (event.currentTarget as HTMLElement).contains(interactive)) return
  }
  const next = selectRow(row, event.shiftKey)
  if (onCheckbox) (target as HTMLInputElement).checked = next.includes(keyOf(row))
  else window.getSelection()?.removeAllRanges()
}

// --- Navigazione da tastiera (pattern ARIA grid, un solo tab stop con roving tabindex) ---
//
// Posizione logica: riga 0 = intestazione, riga 1 = filtri (se presenti), poi le righe della
// pagina. Frecce, Home/End (con Ctrl: angoli), PageUp/PageDown spostano tra le celle; Invio o
// F2 entrano nel controllo della cella (dove i tasti funzionano normalmente); Esc torna alla cella.

const gridEl = ref<HTMLElement | null>(null)
const active = ref<GridPosition>({ row: 0, col: 0 })
const gridBounds = computed(() => ({
  rowCount: headerRowCount.value + visibleRows.value.length,
  colCount: props.columns.length + colOffset.value,
}))
const activeCell = computed(() => clampPosition(active.value, gridBounds.value))

function tab(row: number, col: number): 0 | -1 {
  return activeCell.value.row === row && activeCell.value.col === col ? 0 : -1
}

async function focusCell(position: GridPosition) {
  active.value = clampPosition(position, gridBounds.value)
  await nextTick()
  const { row, col } = active.value
  gridEl.value?.querySelector<HTMLElement>(`[data-vt-row="${row}"][data-vt-col="${col}"]`)?.focus()
}

function cellOf(target: EventTarget | null): HTMLElement | null {
  return target instanceof HTMLElement ? target.closest<HTMLElement>('[data-vt-row]') : null
}

function positionOf(cell: HTMLElement): GridPosition {
  return { row: Number(cell.dataset.vtRow), col: Number(cell.dataset.vtCol) }
}

const CONTROL_SELECTOR =
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]'

function onGridFocusin(event: FocusEvent) {
  const cell = cellOf(event.target)
  if (cell) active.value = positionOf(cell)
}

function onGridKeydown(event: KeyboardEvent) {
  const cell = cellOf(event.target)
  if (!cell) return
  const position = positionOf(cell)

  // Dentro un controllo: i tasti funzionano normalmente; Esc torna alla cella.
  if (event.target !== cell) {
    if (event.key === 'Escape') {
      event.preventDefault()
      flushPending()
      void focusCell(position)
    }
    return
  }

  const isBody = position.row >= headerRowCount.value
  const isSelectCol = showSelectColumn.value && position.col === 0
  const dataColumn = props.columns[position.col - colOffset.value]

  // Selezione: Ctrl/Cmd+A (tutte le righe filtrate), Spazio sulla cella della checkbox,
  // Maiusc+Spazio su qualunque cella di una riga.
  if (selectionEnabled.value) {
    if (event.key.toLowerCase() === 'a' && (event.ctrlKey || event.metaKey)) {
      if (props.selection === 'multiple') {
        event.preventDefault()
        selectAllFiltered()
        return
      }
    } else if (event.key === ' ') {
      if (isBody && (event.shiftKey || isSelectCol)) {
        event.preventDefault()
        const row = visibleRows.value[position.row - headerRowCount.value]
        if (row) selectRow(row, false)
        return
      }
      if (position.row === 0 && isSelectCol) {
        event.preventDefault()
        toggleAll()
        return
      }
    }
  }

  if (position.row === 0 && !isSelectCol) {
    // Cella d'intestazione: Invio o Spazio ordinano.
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (dataColumn && isSortable(dataColumn)) onSort(dataColumn, event)
      return
    }
  } else if (event.key === 'Enter' || event.key === 'F2') {
    const control = cell.querySelector<HTMLElement>(CONTROL_SELECTOR)
    if (control) {
      event.preventDefault()
      control.focus()
    }
    return
  }

  const next = moveGridPosition(
    position,
    event.key,
    event.ctrlKey || event.metaKey,
    gridBounds.value,
  )
  if (next) {
    event.preventDefault()
    void focusCell(next)
  }
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
  /** Copia dello stato corrente (serializzabile in JSON); applica prima le bozze in attesa. */
  getState: (): TableState => {
    flushPending()
    return JSON.parse(JSON.stringify(state.value)) as TableState
  },
  /** Rimuove tutti i filtri di colonna e la ricerca globale. */
  clearFilters,
  /** Deseleziona tutte le righe. */
  clearSelection,
  /** Sposta il focus su una cella: riga 0 = intestazione, 1 = filtri (se presenti), poi le righe. */
  focusCell: (row: number, col = 0) => focusCell({ row, col }),
  /** Riporta ordinamento, filtri, ricerca e pagina ai valori iniziali. */
  resetState: () => {
    discardPending()
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
          :value="searchDraft ?? state.globalSearch"
          :aria-label="text.search"
          :placeholder="text.searchPlaceholder"
          @input="onSearchInput(($event.target as HTMLInputElement).value)"
          @blur="flushPending"
          @keydown.enter="flushPending"
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
      ref="gridEl"
      class="vt-grid"
      role="grid"
      :aria-label="ariaLabel"
      :aria-rowcount="total + headerRowCount"
      :aria-colcount="columns.length + colOffset"
      :aria-multiselectable="selection === 'multiple' ? true : undefined"
      @keydown="onGridKeydown"
      @focusin="onGridFocusin"
    >
      <div :class="['vt-header', classes.header]" role="rowgroup">
        <div :class="['vt-row', classes.row]" role="row" :aria-rowindex="1">
          <div
            v-if="showSelectColumn"
            :class="['vt-header-cell', 'vt-select-cell', classes.headerCell]"
            data-vt-row="0"
            data-vt-col="0"
            :tabindex="tab(0, 0)"
            role="columnheader"
            :aria-colindex="1"
          >
            <input
              v-if="selection === 'multiple'"
              type="checkbox"
              class="vt-select-input"
              tabindex="-1"
              :checked="allState === 'all'"
              :indeterminate="allState === 'some'"
              :aria-label="text.selectAll"
              @click="onHeaderCheckboxClick"
            />
          </div>
          <div
            v-for="(column, c) in columns"
            :key="column.id"
            :class="['vt-header-cell', classes.headerCell]"
            :style="cellStyle(column)"
            :data-align="column.align"
            data-vt-row="0"
            :data-vt-col="c + colOffset"
            :tabindex="tab(0, c + colOffset)"
            role="columnheader"
            :aria-colindex="c + colOffset + 1"
            :aria-sort="ariaSort(column)"
          >
            <button
              v-if="isSortable(column)"
              type="button"
              class="vt-sort-button"
              tabindex="-1"
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
            v-if="showSelectColumn"
            :class="['vt-filter-cell', 'vt-select-cell', classes.headerCell]"
            data-vt-row="1"
            data-vt-col="0"
            :tabindex="tab(1, 0)"
            role="gridcell"
            :aria-colindex="1"
          ></div>
          <div
            v-for="(column, c) in columns"
            :key="column.id"
            :class="['vt-filter-cell', classes.headerCell]"
            :style="cellStyle(column)"
            data-vt-row="1"
            :data-vt-col="c + colOffset"
            :tabindex="tab(1, c + colOffset)"
            role="gridcell"
            :aria-colindex="c + colOffset + 1"
          >
            <slot :name="`filter-${column.id}`" v-bind="filterSlotProps(column)">
              <input
                v-if="column.filter === 'text'"
                :class="['vt-filter-input', classes.filterInput]"
                type="text"
                tabindex="-1"
                :value="textFilter(column)"
                :aria-label="text.filterColumn(column.header)"
                @input="setFilterDebounced(column, ($event.target as HTMLInputElement).value)"
                @blur="flushPending"
                @keydown.enter="flushPending"
              />
              <select
                v-else-if="column.filter === 'select'"
                :class="['vt-filter-input', classes.filterInput]"
                tabindex="-1"
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
                  tabindex="-1"
                  :value="rangeBound(column, 'min')"
                  :placeholder="text.filterMin"
                  :aria-label="`${text.filterColumn(column.header)}: ${text.filterMin}`"
                  @input="setRangeBound(column, 'min', ($event.target as HTMLInputElement).value)"
                  @blur="flushPending"
                  @keydown.enter="flushPending"
                />
                <input
                  :class="['vt-filter-input', classes.filterInput]"
                  type="number"
                  tabindex="-1"
                  :value="rangeBound(column, 'max')"
                  :placeholder="text.filterMax"
                  :aria-label="`${text.filterColumn(column.header)}: ${text.filterMax}`"
                  @input="setRangeBound(column, 'max', ($event.target as HTMLInputElement).value)"
                  @blur="flushPending"
                  @keydown.enter="flushPending"
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
          :class="['vt-row', classes.row, { 'vt-row-selected': isSelected(row) }]"
          role="row"
          :aria-rowindex="headerRowCount + pageInfo.start + r + 1"
          :aria-selected="selectionEnabled ? isSelected(row) : undefined"
          @click="onRowClick(row, $event)"
        >
          <div
            v-if="showSelectColumn"
            :class="['vt-cell', 'vt-select-cell', classes.cell]"
            :data-vt-row="headerRowCount + r"
            data-vt-col="0"
            :tabindex="tab(headerRowCount + r, 0)"
            role="gridcell"
            :aria-colindex="1"
          >
            <input
              type="checkbox"
              class="vt-select-input"
              tabindex="-1"
              :checked="isSelected(row)"
              :aria-label="text.selectRow"
            />
          </div>
          <div
            v-for="(column, c) in columns"
            :key="column.id"
            :class="['vt-cell', classes.cell]"
            :style="cellStyle(column)"
            :data-align="column.align"
            :data-vt-row="headerRowCount + r"
            :data-vt-col="c + colOffset"
            :tabindex="tab(headerRowCount + r, c + colOffset)"
            role="gridcell"
            :aria-colindex="c + colOffset + 1"
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

    <div v-if="showSelectionStatus" class="vt-selection-status" role="status" aria-live="polite">
      {{ selectionSummary }}
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
        <span class="vt-summary" role="status" aria-live="polite">
          {{ summary }}<template v-if="selectionEnabled"> · {{ selectionSummary }}</template>
        </span>
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
