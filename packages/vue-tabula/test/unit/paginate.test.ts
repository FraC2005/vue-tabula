import { describe, expect, it } from 'vitest'
import { paginate } from '../../src/core/paginate'

describe('paginate', () => {
  it('calcola i limiti di una pagina intermedia', () => {
    expect(paginate(95, 2, 10)).toEqual({ page: 2, pageCount: 10, start: 10, end: 20 })
  })
  it('gestisce l’ultima pagina parziale', () => {
    expect(paginate(95, 10, 10)).toEqual({ page: 10, pageCount: 10, start: 90, end: 95 })
  })
  it('riporta la pagina nei limiti', () => {
    expect(paginate(95, 99, 10).page).toBe(10)
    expect(paginate(95, 0, 10).page).toBe(1)
    expect(paginate(95, Number.NaN, 10).page).toBe(1)
  })
  it('con zero elementi ha una pagina vuota', () => {
    expect(paginate(0, 3, 10)).toEqual({ page: 1, pageCount: 1, start: 0, end: 0 })
  })
  it('porta pageSize ad almeno 1', () => {
    expect(paginate(3, 1, 0).pageCount).toBe(3)
  })
})
