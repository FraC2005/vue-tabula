import { onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { TableState } from '../types.js'

export interface PersistentTableStateOptions {
  /**
   * Dove salvare: `'local'` (localStorage, default), `'session'` (sessionStorage) oppure un
   * oggetto compatibile con `Storage` (utile nei test o per storage personalizzati).
   */
  storage?: 'local' | 'session' | Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
}

export interface PersistentTableState {
  /**
   * Stato da collegare a `v-model:state`. All'inizio è `undefined` (la tabella parte dai
   * default); dopo il montaggio, se c'è uno stato salvato, lo riceve. Ogni cambio si salva.
   */
  state: Ref<TableState | undefined>
  /** Dimentica lo stato salvato e riporta la tabella ai valori iniziali. */
  reset: () => void
  /** Ultimo errore di lettura/scrittura dello storage (pieno, disabilitato…), o `null`. */
  error: Ref<unknown>
}

type StorageLike = NonNullable<Exclude<PersistentTableStateOptions['storage'], string>>

/** Risolve lo storage solo nel browser; restituisce `null` se manca o è bloccato. */
function resolveStorage(option: PersistentTableStateOptions['storage']): StorageLike | null {
  if (option !== undefined && option !== 'local' && option !== 'session') return option
  if (typeof window === 'undefined') return null
  try {
    // Anche solo leggere `window.localStorage` può lanciare (cookie bloccati, modalità privata).
    return option === 'session' ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

/**
 * Salva lo stato della tabella in `localStorage` o `sessionStorage` e lo ripristina al
 * ricaricamento. Da usare in `<script setup>` con `v-model:state`:
 *
 * ```vue
 * const { state, reset } = usePersistentTableState('persone')
 * <VtTable v-model:state="state" … />
 * ```
 *
 * - **SSR:** durante il rendering sul server non tocca `window`. La lettura avviene dopo il
 *   montaggio (così anche l'HTML idratato coincide), quindi la tabella parte dai default e
 *   poi riceve lo stato salvato.
 * - **Storage pieno o disabilitato:** nessuna eccezione; l'errore finisce in `error` e la
 *   tabella continua a funzionare senza persistenza.
 * - **Dati corrotti:** un valore salvato che non è JSON valido viene ignorato. La tabella
 *   valida comunque lo stato che riceve.
 */
export function usePersistentTableState(
  key: string,
  options: PersistentTableStateOptions = {},
): PersistentTableState {
  const state = ref<TableState | undefined>(undefined)
  const error = ref<unknown>(null)

  function read() {
    const storage = resolveStorage(options.storage)
    if (!storage) return
    try {
      const stored = storage.getItem(key)
      if (stored === null) return
      const parsed: unknown = JSON.parse(stored)
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        state.value = parsed as TableState
      }
    } catch (e) {
      error.value = e
    }
  }

  function write(value: TableState | undefined) {
    const storage = resolveStorage(options.storage)
    if (!storage) return
    try {
      if (value === undefined) storage.removeItem(key)
      else storage.setItem(key, JSON.stringify(value))
      error.value = null
    } catch (e) {
      error.value = e
    }
  }

  onMounted(read)
  watch(state, write)

  return {
    state,
    error,
    reset() {
      state.value = undefined
      write(undefined)
    },
  }
}
