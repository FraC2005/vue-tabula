// `process` esiste in Node e viene sostituito dai bundler (Vite, webpack, Nuxt); nel browser
// senza sostituzione non esiste e l'accesso lancia: in quel caso niente avvisi.
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
