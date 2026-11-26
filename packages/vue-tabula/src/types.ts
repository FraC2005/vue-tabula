/** Direzione di ordinamento. */
export type SortDirection = 'asc' | 'desc'

/** Una voce di ordinamento: l'ordine nell'array stabilisce la priorità. */
export interface SortEntry {
  columnId: string
  dir: SortDirection
}

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
}

/**
 * Stato della tabella, serializzabile in JSON.
 * Salvarlo e ripristinarlo permette di riprendere ordinamento, colonne e pagina.
 */
export interface TableState {
  version: 1
  sort: SortEntry[]
  filters: Record<string, unknown>
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
  body?: string
  row?: string
  cell?: string
  empty?: string
  pagination?: string
}

/** Testi dell'interfaccia, sostituibili per la traduzione. */
export interface TableLabels {
  search: string
  searchPlaceholder: string
  empty: string
  previousPage: string
  nextPage: string
  pageSize: string
  /** Riepilogo letto dagli screen reader, es. "1–25 di 100". */
  summary: (range: { start: number; end: number; total: number }) => string
  /** Descrizione della pagina corrente, es. "Pagina 2 di 4". */
  pageOf: (page: number, pageCount: number) => string
}
