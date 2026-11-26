import { describe, expect, it } from 'vitest'
import {
  deselectKeys,
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
