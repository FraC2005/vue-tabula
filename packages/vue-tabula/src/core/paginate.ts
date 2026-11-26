/** Descrizione di una pagina calcolata da `paginate`. */
export interface PageInfo {
  /** Pagina effettiva (a partire da 1), già riportata nei limiti validi. */
  page: number
  pageCount: number
  /** Indice del primo elemento della pagina (incluso). */
  start: number
  /** Indice dell'ultimo elemento della pagina (escluso). */
  end: number
}

/**
 * Calcola i limiti di una pagina. La pagina richiesta viene riportata in [1, pageCount];
 * con zero elementi c'è comunque una pagina (vuota). `pageSize` è portata ad almeno 1.
 */
export function paginate(total: number, page: number, pageSize: number): PageInfo {
  const size = Math.max(1, Math.floor(pageSize) || 1)
  const pageCount = Math.max(1, Math.ceil(total / size))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount)
  const start = (current - 1) * size
  return { page: current, pageCount, start, end: Math.min(start + size, total) }
}
