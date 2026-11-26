import { describe, expect, it } from 'vitest'
import {
  deselectKeys,
  pruneSelection,
  selectKeys,
  selectRange,
  selectionState,
  toggleKey,
} from '../../src/core/selection'

describe('toggleKey', () => {
  it('in multiple aggiunge e toglie, senza mutare l’array', () => {
    const base = [1, 2]
    expect(toggleKey(base, 3, 'multiple')).toEqual([1, 2, 3])
    expect(toggleKey(base, 2, 'multiple')).toEqual([1])
    expect(base).toEqual([1, 2])
  })
  it('in single tiene al massimo una riga e permette di deselezionarla', () => {
    expect(toggleKey([1], 2, 'single')).toEqual([2])
    expect(toggleKey([2], 2, 'single')).toEqual([])
  })
  it('con none non cambia nulla', () => {
    expect(toggleKey([1], 2, 'none')).toEqual([1])
  })
  it('distingue chiavi numeriche e testuali', () => {
    expect(toggleKey([1], '1', 'multiple')).toEqual([1, '1'])
  })
})

describe('selectRange', () => {
  const keys = ['a', 'b', 'c', 'd', 'e']
  it('seleziona l’intervallo con estremi inclusi, in entrambi i versi', () => {
    expect(selectRange([], keys, 'b', 'd')).toEqual(['b', 'c', 'd'])
    expect(selectRange([], keys, 'd', 'b')).toEqual(['b', 'c', 'd'])
  })
  it('aggiunge alla selezione esistente senza duplicati', () => {
    expect(selectRange(['c', 'z'], keys, 'a', 'c')).toEqual(['c', 'z', 'a', 'b'])
  })
  it('senza ancora (o ancora sconosciuta) seleziona solo la riga bersaglio', () => {
    expect(selectRange([], keys, null, 'c')).toEqual(['c'])
    expect(selectRange([], keys, 'zzz', 'c')).toEqual(['c'])
  })
  it('con bersaglio fuori elenco non cambia nulla', () => {
    expect(selectRange(['a'], keys, 'a', 'zzz')).toEqual(['a'])
  })
})

describe('selectKeys / deselectKeys', () => {
  it('aggiungono senza duplicati e tolgono solo le chiavi indicate', () => {
    expect(selectKeys([1, 2], [2, 3, 4])).toEqual([1, 2, 3, 4])
    expect(deselectKeys([1, 2, 3, 9], [2, 3, 4])).toEqual([1, 9])
  })
})

describe('selectionState', () => {
  it('distingue nessuna, alcune e tutte', () => {
    expect(selectionState([], [1, 2, 3])).toBe('none')
    expect(selectionState([2], [1, 2, 3])).toBe('some')
    expect(selectionState([1, 2, 3, 9], [1, 2, 3])).toBe('all')
  })
  it('conta solo le chiavi considerate e con insieme vuoto dà none', () => {
    expect(selectionState([9], [1, 2])).toBe('none')
    expect(selectionState([1], [])).toBe('none')
  })
})

describe('pruneSelection', () => {
  const rows = [
    { id: 1, k: 'a' },
    { id: 2, k: 'b' },
    { id: 3, k: 'c' },
  ]
  it('toglie le chiavi senza riga, mantenendo l’ordine', () => {
    expect(pruneSelection([3, 99, 1, 100], rows, 'id')).toEqual([3, 1])
  })
  it('accetta rowKey come funzione e chiavi testuali', () => {
    expect(pruneSelection(['b', 'zzz'], rows, (r) => r.k)).toEqual(['b'])
  })
  it('distingue chiavi numeriche e testuali', () => {
    expect(pruneSelection(['1', 1], rows, 'id')).toEqual([1])
  })
  it('non modifica l’array in ingresso e gestisce gli insiemi vuoti', () => {
    const selected = [1, 99]
    pruneSelection(selected, rows, 'id')
    expect(selected).toEqual([1, 99])
    expect(pruneSelection([], rows, 'id')).toEqual([])
    expect(pruneSelection([1], [], 'id')).toEqual([])
  })
})
