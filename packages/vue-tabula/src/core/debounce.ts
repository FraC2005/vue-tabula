/**
 * Gestore di azioni ritardate, una per chiave. Serve a ritardare l'applicazione di ciò che
 * l'utente digita (ricerca, filtri di testo e numerici) finché smette di scrivere.
 */
export interface Debouncer {
  /** Pianifica `fn` dopo `delay` ms, sostituendo l'azione già pianificata con la stessa chiave. */
  schedule(key: string, fn: () => void, delay: number): void
  /** Esegue subito le azioni pianificate (solo quella di `key`, se indicata). */
  flush(key?: string): void
  /** Annulla senza eseguire le azioni pianificate (solo quella di `key`, se indicata). */
  cancel(key?: string): void
  /** Vero se c'è almeno un'azione in attesa. */
  hasPending(): boolean
}

export function createDebouncer(): Debouncer {
  const pending = new Map<string, { timer: ReturnType<typeof setTimeout>; fn: () => void }>()

  function take(key: string) {
    const entry = pending.get(key)
    if (entry) {
      clearTimeout(entry.timer)
      pending.delete(key)
    }
    return entry
  }

  return {
    schedule(key, fn, delay) {
      take(key)
      if (!(delay > 0)) {
        fn()
        return
      }
      const timer = setTimeout(() => {
        pending.delete(key)
        fn()
      }, delay)
      pending.set(key, { timer, fn })
    },
    flush(key) {
      for (const k of key === undefined ? [...pending.keys()] : [key]) take(k)?.fn()
    },
    cancel(key) {
      for (const k of key === undefined ? [...pending.keys()] : [key]) take(k)
    },
    hasPending: () => pending.size > 0,
  }
}
