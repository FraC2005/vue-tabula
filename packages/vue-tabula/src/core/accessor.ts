import type { ColumnDef, RowKey } from '../types.js'

/** Restituisce il valore di una cella secondo l'accessor della colonna (o l'id come ripiego). */
export function getCellValue<T>(row: T, column: ColumnDef<T>): unknown {
  const accessor = column.accessor
  if (typeof accessor === 'function') return accessor(row)
  const key = accessor ?? column.id
  return (row as Record<PropertyKey, unknown>)[key as PropertyKey]
}

/** Chiave di una riga: la proprietà indicata da `rowKey`, oppure il risultato della funzione. */
export function getRowKey<T>(row: T, rowKey: keyof T | ((row: T) => RowKey)): RowKey {
  return typeof rowKey === 'function' ? rowKey(row) : (row[rowKey] as RowKey)
}
