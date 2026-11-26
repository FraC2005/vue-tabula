// `process` esiste in Node e viene sostituito dai bundler (Vite, webpack, Nuxt); nel browser
// senza bundler (ESM da CDN) non esiste e l'accesso lancia ReferenceError: lo intercetta il
// try/catch qui sotto, quindi la libreria non lancia mai e in quel caso resta senza avvisi.
//
// Non usare `typeof process !== 'undefined' && …`: i bundler sostituiscono il testo esatto
// `process.env.NODE_ENV` con "development" o "production", ma `typeof process` nel browser
// resta 'undefined', quindi con quel guard gli avvisi non comparirebbero mai nemmeno in
// sviluppo con Vite. Vedi test/unit/dev.test.ts.
declare const process: { env: Record<string, string | undefined> } | undefined

/** Vero in sviluppo (NODE_ENV diverso da "production"); falso in produzione o se non determinabile. */
export function isDev(): boolean {
  try {
    return process!.env.NODE_ENV !== 'production'
  } catch {
    return false
  }
}

/** Scrive un avviso in console, solo in sviluppo. */
export function devWarn(message: string): void {
  if (isDev()) console.warn(`[vue-tabula] ${message}`)
}
