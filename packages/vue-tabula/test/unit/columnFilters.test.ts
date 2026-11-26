import { describe, expect, it } from 'vitest'
import {
  columnFilterIndices,
  isFilterActive,
  normalizeOptions,
  selectOptions,
} from '../../src/core/columnFilters'
import { globalSearchIndices } from '../../src/core/filter'
import { createDefaultState, setColumnFilter } from '../../src/core/state'
import type { ColumnDef } from '../../src/types'

interface Row {
  nome: string
  citta: string
  eta: number | null
  attivo: boolean
}
const rows: Row[] = [
  { nome: 'José Álvarez', citta: 'Madrid', eta: 30, attivo: true },
  { nome: 'Anna Rossi', citta: 'Milano', eta: null, attivo: false },
  { nome: 'Luca Bianchi', citta: 'Roma', eta: 41, attivo: true },
  { nome: 'Anna Verdi', citta: 'Roma', eta: 25, attivo: false },
]
const columns: ColumnDef<Row>[] = [
  { id: 'nome', header: 'Nome', filter: 'text' },
  { id: 'citta', header: 'Città', filter: 'select' },
  { id: 'eta', header: 'Età', filter: 'number' },
  { id: 'attivo', header: 'Attivo', filter: 'select' },
]

describe('isFilterActive', () => {
  it('riconosce i filtri vuoti', () => {
    for (const empty of [undefined, null, '', '   ', [], {}, { min: null, max: undefined }]) {
      expect(isFilterActive(empty as never)).toBe(false)
    }
  })
  it('riconosce i filtri attivi', () => {
    for (const active of ['a', 0, false, ['x'], { min: 0 }, { max: 5 }]) {
      expect(isFilterActive(active)).toBe(true)
    }
  })
})

describe('columnFilterIndices', () => {
  it('senza filtri restituisce tutte le righe', () => {
    expect(columnFilterIndices(rows, columns, {})).toEqual([0, 1, 2, 3])
    expect(columnFilterIndices(rows, columns, { nome: '' })).toEqual([0, 1, 2, 3])
  })

  it('filtro text: contiene, senza maiuscole e accenti', () => {
    expect(columnFilterIndices(rows, columns, { nome: 'jose' })).toEqual([0])
    expect(columnFilterIndices(rows, columns, { nome: 'ANNA' })).toEqual([1, 3])
  })

  it('filtro select: uguaglianza, anche con valori booleani e liste', () => {
    expect(columnFilterIndices(rows, columns, { citta: 'Roma' })).toEqual([2, 3])
    expect(columnFilterIndices(rows, columns, { attivo: true })).toEqual([0, 2])
    expect(columnFilterIndices(rows, columns, { citta: ['Madrid', 'Milano'] })).toEqual([0, 1])
  })

  it('filtro select: non tratta il testo come "contiene"', () => {
    expect(columnFilterIndices(rows, columns, { citta: 'Rom' })).toEqual([])
  })

  it('filtro number: intervallo con estremi inclusi e nulli esclusi', () => {
    expect(columnFilterIndices(rows, columns, { eta: { min: 30 } })).toEqual([0, 2])
    expect(columnFilterIndices(rows, columns, { eta: { max: 30 } })).toEqual([0, 3])
    expect(columnFilterIndices(rows, columns, { eta: { min: 26, max: 40 } })).toEqual([0])
  })

  it('combina più filtri in AND', () => {
    expect(columnFilterIndices(rows, columns, { citta: 'Roma', nome: 'anna' })).toEqual([3])
  })

  it('ignora filtri su colonne sconosciute', () => {
    expect(columnFilterIndices(rows, columns, { nessuna: 'x' })).toEqual([0, 1, 2, 3])
  })

  it('deduce il tipo dalla forma del valore se la colonna non dichiara filter', () => {
    const plain: ColumnDef<Row>[] = [
      { id: 'nome', header: 'Nome' },
      { id: 'eta', header: 'Età' },
    ]
    expect(columnFilterIndices(rows, plain, { nome: 'luca' })).toEqual([2])
    expect(columnFilterIndices(rows, plain, { eta: { min: 40 } })).toEqual([2])
  })

  it('filterFn sostituisce il confronto di default', () => {
    const custom: ColumnDef<Row>[] = [
      {
        id: 'nome',
        header: 'Nome',
        filterFn: (value, filter) => String(value).startsWith(String(filter)),
      },
    ]
    expect(columnFilterIndices(rows, custom, { nome: 'Anna' })).toEqual([1, 3])
    expect(columnFilterIndices(rows, custom, { nome: 'Rossi' })).toEqual([])
  })

  it('lavora solo sugli indici passati e non modifica le righe', () => {
    const copy = structuredClone(rows)
    expect(columnFilterIndices(rows, columns, { citta: 'Roma' }, [0, 3])).toEqual([3])
    expect(rows).toEqual(copy)
  })

  it('si combina con la ricerca globale', () => {
    const byColumn = columnFilterIndices(rows, columns, { citta: 'Roma' })
    expect(globalSearchIndices(rows, columns, 'anna', byColumn)).toEqual([3])
  })
})

describe('opzioni dei filtri select', () => {
  it('ricava i valori distinti in ordine naturale', () => {
    expect(selectOptions(rows, columns[1]!).map((o) => o.value)).toEqual([
      'Madrid',
      'Milano',
      'Roma',
    ])
    expect(selectOptions(rows, columns[3]!).map((o) => o.value)).toEqual([false, true])
  })
  it('usa filterOptions se dichiarate e le normalizza', () => {
    const column: ColumnDef<Row> = {
      id: 'attivo',
      header: 'Attivo',
      filter: 'select',
      filterOptions: [{ label: 'Sì', value: true }, 'altro'],
    }
    expect(selectOptions(rows, column)).toEqual([
      { label: 'Sì', value: true },
      { label: 'altro', value: 'altro' },
    ])
    expect(normalizeOptions([1])).toEqual([{ label: '1', value: 1 }])
  })
})

describe('setColumnFilter', () => {
  it('imposta il filtro, torna a pagina 1 e non muta lo stato', () => {
    const state = createDefaultState({ page: 4 })
    const next = setColumnFilter(state, 'nome', 'ada')
    expect(next.filters).toEqual({ nome: 'ada' })
    expect(next.page).toBe(1)
    expect(state.filters).toEqual({})
  })
  it('un valore vuoto rimuove il filtro', () => {
    const state = createDefaultState({ filters: { nome: 'ada', citta: 'Roma' } })
    expect(setColumnFilter(state, 'nome', '').filters).toEqual({ citta: 'Roma' })
    expect(setColumnFilter(state, 'citta', undefined).filters).toEqual({ nome: 'ada' })
  })
})
