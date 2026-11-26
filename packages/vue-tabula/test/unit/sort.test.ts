import { describe, expect, it } from 'vitest'
import { compareValues, sortIndices, toggleSort } from '../../src/core/sort'
import type { ColumnDef, SortEntry } from '../../src/types'

interface Row {
  nome: string | null
  eta: number | null
  gruppo: string
}
const columns: ColumnDef<Row>[] = [
  { id: 'nome', header: 'Nome' },
  { id: 'eta', header: 'Età' },
  { id: 'gruppo', header: 'Gruppo' },
]
const rows: Row[] = [
  { nome: 'Bruno', eta: 30, gruppo: 'b' },
  { nome: 'Anna', eta: 25, gruppo: 'a' },
  { nome: null, eta: 40, gruppo: 'a' },
  { nome: 'Carla', eta: null, gruppo: 'b' },
  { nome: 'anna', eta: 25, gruppo: 'b' },
]

describe('compareValues', () => {
  it('confronta numeri, date e booleani per valore', () => {
    expect(compareValues(2, 10)).toBeLessThan(0)
    expect(compareValues(new Date(2020, 0, 1), new Date(2021, 0, 1))).toBeLessThan(0)
    expect(compareValues(false, true)).toBeLessThan(0)
    expect(compareValues(2n, 10n)).toBeLessThan(0)
  })
  it('confronta il testo in modo naturale e senza distinguere maiuscole', () => {
    expect(compareValues('a2', 'a10')).toBeLessThan(0)
    expect(compareValues('Anna', 'anna')).toBe(0)
  })
})

describe('sortIndices', () => {
  it('senza voci restituisce l’ordine originale e non modifica le righe', () => {
    const copy = structuredClone(rows)
    expect(sortIndices(rows, columns, [])).toEqual([0, 1, 2, 3, 4])
    expect(rows).toEqual(copy)
  })

  it('ordina in modo ascendente e discendente', () => {
    expect(sortIndices(rows, columns, [{ columnId: 'eta', dir: 'asc' }])).toEqual([1, 4, 0, 2, 3])
    expect(sortIndices(rows, columns, [{ columnId: 'eta', dir: 'desc' }])).toEqual([2, 0, 1, 4, 3])
  })

  it('mette i nulli sempre in fondo, in entrambe le direzioni', () => {
    expect(sortIndices(rows, columns, [{ columnId: 'nome', dir: 'asc' }]).at(-1)).toBe(2)
    expect(sortIndices(rows, columns, [{ columnId: 'nome', dir: 'desc' }]).at(-1)).toBe(2)
  })

  it('è stabile a parità di valore', () => {
    // 1 e 4 hanno la stessa età: restano nell'ordine originale.
    const result = sortIndices(rows, columns, [{ columnId: 'eta', dir: 'asc' }])
    expect(result.indexOf(1)).toBeLessThan(result.indexOf(4))
  })

  it('ordina su più colonne secondo la priorità', () => {
    const sort: SortEntry[] = [
      { columnId: 'gruppo', dir: 'asc' },
      { columnId: 'eta', dir: 'desc' },
    ]
    expect(sortIndices(rows, columns, sort)).toEqual([2, 1, 0, 4, 3])
  })

  it('usa sortFn personalizzata e ignora colonne sconosciute', () => {
    const custom: ColumnDef<Row>[] = [
      { id: 'nome', header: 'Nome', sortFn: (a, b) => String(b).localeCompare(String(a)) },
    ]
    const result = sortIndices(rows, custom, [
      { columnId: 'nessuna', dir: 'asc' },
      { columnId: 'nome', dir: 'asc' },
    ])
    expect(rows[result[0]!]!.nome).toBe('Carla')
  })

  it('ordina solo gli indici passati', () => {
    expect(sortIndices(rows, columns, [{ columnId: 'eta', dir: 'asc' }], [0, 2, 1])).toEqual([
      1, 0, 2,
    ])
  })
})

describe('toggleSort', () => {
  it('cicla asc → desc → nessuno', () => {
    let sort = toggleSort([], 'a')
    expect(sort).toEqual([{ columnId: 'a', dir: 'asc' }])
    sort = toggleSort(sort, 'a')
    expect(sort).toEqual([{ columnId: 'a', dir: 'desc' }])
    expect(toggleSort(sort, 'a')).toEqual([])
  })
  it('senza multi sostituisce l’ordinamento', () => {
    expect(toggleSort([{ columnId: 'a', dir: 'asc' }], 'b')).toEqual([
      { columnId: 'b', dir: 'asc' },
    ])
  })
  it('con multi aggiunge, aggiorna e rimuove mantenendo l’ordine', () => {
    const base: SortEntry[] = [
      { columnId: 'a', dir: 'asc' },
      { columnId: 'b', dir: 'asc' },
    ]
    expect(toggleSort(base, 'c', true)).toHaveLength(3)
    expect(toggleSort(base, 'a', true)).toEqual([
      { columnId: 'a', dir: 'desc' },
      { columnId: 'b', dir: 'asc' },
    ])
    expect(
      toggleSort(
        [
          { columnId: 'a', dir: 'desc' },
          { columnId: 'b', dir: 'asc' },
        ],
        'a',
        true,
      ),
    ).toEqual([{ columnId: 'b', dir: 'asc' }])
  })
  it('non modifica l’array in ingresso', () => {
    const base: SortEntry[] = [{ columnId: 'a', dir: 'asc' }]
    toggleSort(base, 'a', true)
    expect(base).toEqual([{ columnId: 'a', dir: 'asc' }])
  })
})
