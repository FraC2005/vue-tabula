import type { TableLabels } from '../types.js'

/** Testi di default (inglese). */
export const DEFAULT_LABELS: TableLabels = {
  search: 'Search',
  searchPlaceholder: 'Search…',
  empty: 'No results',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  pageSize: 'Rows per page',
  summary: ({ start, end, total }) => (total === 0 ? '0 rows' : `${start}–${end} of ${total}`),
  pageOf: (page, pageCount) => `Page ${page} of ${pageCount}`,
}
