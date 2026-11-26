import { describe, expect, it } from 'vitest'
import { createDefaultState, DEFAULT_PAGE_SIZE } from '../../src/core/state'

describe('createDefaultState', () => {
  it('restituisce uno stato iniziale valido', () => {
    const state = createDefaultState()
    expect(state.version).toBe(1)
    expect(state.sort).toEqual([])
    expect(state.page).toBe(1)
    expect(state.pageSize).toBe(DEFAULT_PAGE_SIZE)
  })

  it('applica i campi sovrascritti', () => {
    const state = createDefaultState({ page: 3, globalSearch: 'ciao' })
    expect(state.page).toBe(3)
    expect(state.globalSearch).toBe('ciao')
  })

  it('è serializzabile in JSON senza perdite', () => {
    const state = createDefaultState({ sort: [{ columnId: 'nome', dir: 'desc' }] })
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
  })

  it('non condivide riferimenti tra istanze', () => {
    const a = createDefaultState()
    const b = createDefaultState()
    a.sort.push({ columnId: 'x', dir: 'asc' })
    expect(b.sort).toEqual([])
  })
})
