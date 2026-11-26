import { describe, expect, it } from 'vitest'
import { globalSearchIndices, normalizeText } from '../../src/core/filter'
import type { ColumnDef } from '../../src/types'

interface Row {
  nome: string
  citta: string
  eta: number | null
}
const columns: ColumnDef<Row>[] = [
  { id: 'nome', header: 'Nome' },
  { id: 'citta', header: 'Città' },
  { id: 'eta', header: 'Età' },
]
const rows: Row[] = [
  { nome: 'José Álvarez', citta: 'Madrid', eta: 30 },
  { nome: 'Anna Rossi', citta: 'Milano', eta: null },
  { nome: 'Luca Bianchi', citta: 'Roma', eta: 41 },
]

describe('normalizeText', () => {
  it('toglie accenti e maiuscole', () => {
    expect(normalizeText('José ÁLVAREZ')).toBe('jose alvarez')
  })
})

describe('globalSearchIndices', () => {
  it('con query vuota restituisce tutte le righe', () => {
    expect(globalSearchIndices(rows, columns, '')).toEqual([0, 1, 2])
    expect(globalSearchIndices(rows, columns, '   ')).toEqual([0, 1, 2])
  })
  it('ignora maiuscole e accenti', () => {
    expect(globalSearchIndices(rows, columns, 'jose')).toEqual([0])
    expect(globalSearchIndices(rows, columns, 'MILANO')).toEqual([1])
  })
  it('cerca in tutte le colonne, anche numeriche', () => {
    expect(globalSearchIndices(rows, columns, '41')).toEqual([2])
  })
  it('combina le parole in AND, anche su colonne diverse', () => {
    expect(globalSearchIndices(rows, columns, 'anna milano')).toEqual([1])
    expect(globalSearchIndices(rows, columns, 'anna roma')).toEqual([])
  })
  it('non fa corrispondere i valori nulli', () => {
    expect(globalSearchIndices(rows, columns, 'null')).toEqual([])
  })
  it('usa l’accessor della colonna', () => {
    const cols: ColumnDef<Row>[] = [{ id: 'x', header: 'X', accessor: (r) => r.nome.toUpperCase() }]
    expect(globalSearchIndices(rows, cols, 'luca')).toEqual([2])
  })
})
