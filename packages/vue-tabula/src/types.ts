/** Direzione di ordinamento. */
export type SortDirection = 'asc' | 'desc'

/** Una voce di ordinamento: l'ordine nell'array stabilisce la priorità. */
export interface SortEntry {
  columnId: string
  dir: SortDirection
}

/** Valore primitivo confrontabile in un filtro a selezione. */
export type FilterPrimitive = string | number | boolean

/** Intervallo numerico di un filtro `number`; un estremo assente non limita. */
export interface NumberRange {
  min?: number | null
  max?: number | null
}

/**
 * Valore di un filtro di colonna, sempre serializzabile in JSON:
 * - `string`: contiene il testo (filtro `text`);
 * - `FilterPrimitive` o array di essi: uguale a (uno di) (filtro `select`);
 * - `NumberRange`: compreso tra `min` e `max` (filtro `number`).
 */
export type FilterValue = FilterPrimitive | FilterPrimitive[] | NumberRange

/** Modalità di selezione delle righe. */
export type SelectionMode = 'none' | 'single' | 'multiple'

/** Tipo di controllo mostrato per filtrare una colonna. */
export type FilterKind = 'text' | 'select' | 'number'

/** Opzione di un filtro `select`: un valore, oppure valore con etichetta. */
export type FilterOption = FilterPrimitive | { label: string; value: FilterPrimitive }

/** Definizione di una colonna, generica sul tipo di riga. */
export interface ColumnDef<T> {
  /** Identificatore univoco della colonna. */
  id: string
  /** Testo dell'intestazione. */
  header: string
  /** Chiave della riga oppure funzione che estrae il valore della cella. */
  accessor?: keyof T | ((row: T) => unknown)
  /** Larghezza iniziale in pixel. */
  width?: number
  minWidth?: number
  maxWidth?: number
  sortable?: boolean
  /** Funzione di confronto personalizzata per l'ordinamento. */
  sortFn?: (a: unknown, b: unknown) => number
  align?: 'left' | 'center' | 'right'
  /** Mostra un controllo di filtro per questa colonna. */
  filter?: FilterKind
  /** Opzioni del filtro `select`; se omesse si ricavano dai valori presenti nelle righe. */
  filterOptions?: FilterOption[]
  /**
   * Confronto personalizzato: sostituisce quello di default per questa colonna.
   * Riceve il valore della cella, il valore del filtro e la riga.
   */
  filterFn?: (value: unknown, filterValue: FilterValue, row: T) => boolean
}

/**
 * Stato della tabella, serializzabile in JSON.
 * Salvarlo e ripristinarlo permette di riprendere ordinamento, colonne e pagina.
 */
export interface TableState {
  version: 1
  sort: SortEntry[]
  /** Filtri attivi per id di colonna. */
  filters: Record<string, FilterValue>
  globalSearch: string
  columnOrder: string[]
  columnVisibility: Record<string, boolean>
  columnWidths: Record<string, number>
  pinnedLeft: string[]
  /** Pagina corrente, a partire da 1. */
  page: number
  pageSize: number
}

/** Identificatore stabile di una riga. */
export type RowKey = string | number

/** Props passate agli slot delle celle. */
export interface CellSlotProps<T> {
  row: T
  column: ColumnDef<T>
  value: unknown
}

/** Props passate allo slot `header-<columnId>`. */
export interface HeaderSlotProps<T> {
  column: ColumnDef<T>
}

/** Classi CSS aggiuntive per le parti principali della tabella (si sommano a quelle di default). */
export interface TableClasses {
  root?: string
  toolbar?: string
  search?: string
  header?: string
  headerCell?: string
  filterRow?: string
  filterInput?: string
  body?: string
  row?: string
  cell?: string
  empty?: string
  pagination?: string
}

/** Props passate allo slot `filter-<columnId>`. */
export interface FilterSlotProps<T> {
  column: ColumnDef<T>
  /** Valore corrente del filtro (`undefined` se non attivo). */
  value: FilterValue | undefined
  /** Imposta il filtro; `undefined` (o un valore vuoto) lo rimuove. */
  setValue: (value: FilterValue | undefined) => void
}

/** Testi dell'interfaccia, sostituibili per la traduzione. */
export interface TableLabels {
  search: string
  searchPlaceholder: string
  empty: string
  previousPage: string
  nextPage: string
  pageSize: string
  /** Etichetta accessibile del filtro di una colonna, es. "Filtra Nome". */
  filterColumn: (header: string) => string
  /** Voce "nessun filtro" dei filtri a selezione. */
  filterAll: string
  filterMin: string
  filterMax: string
  clearFilters: string
  /** Etichetta accessibile della checkbox che seleziona tutte le righe. */
  selectAll: string
  /** Etichetta accessibile della checkbox di una riga. */
  selectRow: string
  /** Annuncio del numero di righe selezionate, es. "3 selected". */
  selectedCount: (count: number) => string
  /** Riepilogo letto dagli screen reader, es. "1–25 di 100". */
  summary: (range: { start: number; end: number; total: number }) => string
  /** Descrizione della pagina corrente, es. "Pagina 2 di 4". */
  pageOf: (page: number, pageCount: number) => string
}
