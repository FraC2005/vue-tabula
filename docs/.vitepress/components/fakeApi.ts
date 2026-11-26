import { columnFilterIndices, globalSearchIndices, paginate, sortIndices } from 'vue-tabula'
import type { ColumnDef, TableState } from 'vue-tabula'
import { makePeople } from './people'
import type { Person } from './people'

/**
 * Finta API per la demo: gira nel browser, senza servizi esterni.
 * Simula un server vero: 10.000 righe generate, latenza, errori e rispetto del `signal`.
 * L'ordinamento, i filtri, la ricerca e la paginazione si applicano "lato server" (qui)
 * e il componente riceve solo la pagina richiesta e il totale.
 */

export const TOTAL_ROWS = 10_000

export interface ApiOptions {
  /** Intervallo di latenza simulata, in ms. */
  latency: [min: number, max: number]
  /** Se vero, la richiesta fallisce (dopo la latenza). */
  fail: boolean
  /** Se presente, l'API lo rispetta: annullato → rifiuta con AbortError e smette di lavorare. */
  signal?: AbortSignal
}

export interface ApiResponse {
  rows: Person[]
  total: number
  /** Millisecondi impiegati dalla "rete". */
  took: number
}

let database: Person[] | undefined
/** Le righe si generano alla prima richiesta (non al caricamento della pagina). */
function db(): Person[] {
  return (database ??= makePeople(TOTAL_ROWS))
}

export function fetchPeople(
  state: TableState,
  columns: readonly ColumnDef<Person>[],
  options: ApiOptions,
): Promise<ApiResponse> {
  const [min, max] = options.latency
  const took = Math.round(min + Math.random() * (max - min))

  return new Promise((resolve, reject) => {
    const { signal } = options
    if (signal?.aborted) {
      reject(new DOMException('Richiesta annullata', 'AbortError'))
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      if (options.fail) {
        reject(new Error('500 Internal Server Error (simulato)'))
        return
      }
      const all = db()
      const matching = columnFilterIndices(all, columns, state.filters)
      const found = globalSearchIndices(all, columns, state.globalSearch, matching)
      const ordered = sortIndices(all, columns, state.sort, found)
      const { start, end } = paginate(ordered.length, state.page, state.pageSize)
      resolve({
        rows: ordered.slice(start, end).map((i) => all[i] as Person),
        total: ordered.length,
        took,
      })
    }, took)

    function onAbort() {
      clearTimeout(timer)
      reject(new DOMException('Richiesta annullata', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
