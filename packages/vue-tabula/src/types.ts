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
