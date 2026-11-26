import type { ColumnDef } from '../types.js'
import { getCellValue } from './accessor.js'

/** Normalizza un testo per il confronto: minuscolo e senza accenti. */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

/**
 * Ricerca globale: restituisce gli indici delle righe in cui ogni parola della
 * query compare (senza distinguere maiuscole e accenti) in almeno una delle colonne.
 * Le parole sono separate da spazi e vanno in AND. Con query vuota non filtra.
 * Non modifica `rows`.
 *
 * @param indices indici da considerare (es. già filtrati per colonna); se omesso, tutte le righe.
 */
export function globalSearchIndices<T>(
  rows: readonly T[],
  columns: readonly ColumnDef<T>[],
  query: string,
  indices?: readonly number[],
): number[] {
  const candidates = indices ?? Array.from({ length: rows.length }, (_, i) => i)
  const terms = normalizeText(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return [...candidates]

  const result: number[] = []
  for (const index of candidates) {
    const row = rows[index] as T
    const haystack = columns.map((c) => normalizeText(cellText(getCellValue(row, c)))).join('\n')
    if (terms.every((term) => haystack.includes(term))) result.push(index)
  }
  return result
}
