import { describe, expect, it } from 'vitest'
import { jsonEqual } from '../../src/core/equal'
import { createDefaultState } from '../../src/core/state'
import {
  STATE_VERSION,
  clampStatePage,
  cloneState,
  parseState,
  validateState,
} from '../../src/core/stateValidation'
import type { StateValidationContext } from '../../src/core/stateValidation'

const ctx: StateValidationContext = {
  columns: [
    { id: 'nome', filter: 'text' },
    { id: 'citta', filter: 'select' },
    { id: 'eta', filter: 'number', minWidth: 50, maxWidth: 300 },
    { id: 'note', sortable: false },
    { id: 'libera' },
  ],
  pageSizeOptions: [10, 25, 50],
  defaultPageSize: 25,
}
const defaults = createDefaultState({ pageSize: 25 })

describe('validateState: input corrotti non lanciano mai e danno lo stato di default', () => {
  const garbage: [string, unknown][] = [
    ['undefined', undefined],
    ['null', null],
    ['numero', 42],
    ['stringa', 'ciao'],
    ['booleano', true],
    ['array', [1, 2, 3]],
    ['funzione', () => 1],
    ['simbolo', Symbol('x')],
    ['oggetto vuoto', {}],
    ['version stringa', { version: '1' }],
    ['version negativa', { version: -1 }],
    ['version frazionaria', { version: 1.5 }],
    ['version NaN', { version: Number.NaN }],
    ['version del futuro', { version: 999, page: 3, globalSearch: 'x' }],
  ]
  it.each(garbage)('%s', (_name, input) => {
    expect(() => validateState(input, ctx)).not.toThrow()
    expect(validateState(input, ctx)).toEqual(defaults)
  })

  it('un proxy che lancia a ogni accesso dà lo stato di default', () => {
    const hostile = new Proxy(
      {},
      {
        get() {
          throw new Error('boom')
        },
        has() {
          throw new Error('boom')
        },
        ownKeys() {
          throw new Error('boom')
        },
        getOwnPropertyDescriptor() {
          throw new Error('boom')
        },
      },
    )
    expect(validateState(hostile, ctx)).toEqual(defaults)
  })

  it('usa la dimensione di pagina di ripiego del contesto', () => {
    expect(validateState(null, { ...ctx, defaultPageSize: 50 }).pageSize).toBe(50)
  })

  it('restituisce sempre un oggetto nuovo e completo', () => {
    const a = validateState(null, ctx)
    const b = validateState(null, ctx)
    expect(a).not.toBe(b)
    a.sort.push({ columnId: 'nome', dir: 'asc' })
    expect(b.sort).toEqual([])
  })
})

describe('validateState: campi', () => {
  const valid = {
    version: 1,
    sort: [{ columnId: 'nome', dir: 'desc' }],
    filters: { nome: 'ada', citta: ['Roma', 'Milano'], eta: { min: 18, max: 65 } },
    globalSearch: 'x',
    columnOrder: ['eta', 'nome'],
    columnVisibility: { note: false },
    columnWidths: { nome: 120 },
    pinnedLeft: ['nome'],
    page: 3,
    pageSize: 50,
  }

  it('lascia intatto uno stato valido (idempotente)', () => {
    const once = validateState(valid, ctx)
    expect(once).toEqual(valid)
    expect(validateState(once, ctx)).toEqual(once)
  })

  it('non modifica l’input', () => {
    const input = structuredClone(valid)
    validateState({ ...input, extra: 1, sort: [{ columnId: 'zzz', dir: 'asc' }] }, ctx)
    expect(input).toEqual(valid)
  })

  it('ignora chiavi sconosciute', () => {
    const result = validateState({ ...valid, estranea: 1, __extra: {} }, ctx)
    expect(result).toEqual(valid)
    expect('estranea' in result).toBe(false)
  })

  it('accetta uno stato senza version (formato 1)', () => {
    const rest: Partial<typeof valid> = { ...valid }
    delete rest.version
    expect(validateState(rest, ctx)).toEqual(valid)
  })

  describe('sort', () => {
    it('scarta colonne inesistenti, non ordinabili, direzioni e voci malformate', () => {
      const result = validateState(
        {
          sort: [
            { columnId: 'nome', dir: 'asc' },
            { columnId: 'zzz', dir: 'asc' },
            { columnId: 'note', dir: 'asc' },
            { columnId: 'eta', dir: 'su' },
            { columnId: 5, dir: 'asc' },
            'nome',
            null,
            { dir: 'asc' },
            { columnId: 'libera', dir: 'desc' },
            { columnId: 'nome', dir: 'desc' },
          ],
        },
        ctx,
      )
      expect(result.sort).toEqual([
        { columnId: 'nome', dir: 'asc' },
        { columnId: 'libera', dir: 'desc' },
      ])
    })
    it('un sort non array vale come vuoto', () => {
      expect(validateState({ sort: 'nome' }, ctx).sort).toEqual([])
      expect(validateState({ sort: { columnId: 'nome', dir: 'asc' } }, ctx).sort).toEqual([])
    })
  })

  describe('filters', () => {
    const filtersOf = (filters: unknown) => validateState({ filters }, ctx).filters

    it('ignora colonne inesistenti e un contenitore che non è un oggetto', () => {
      expect(filtersOf({ zzz: 'x', nome: 'ada' })).toEqual({ nome: 'ada' })
      for (const bad of ['x', 1, null, [], [['nome', 'ada']]]) expect(filtersOf(bad)).toEqual({})
    })
    it('scarta i valori incompatibili con il tipo di filtro della colonna', () => {
      expect(filtersOf({ nome: 5 })).toEqual({})
      expect(filtersOf({ nome: { min: 1 } })).toEqual({})
      expect(filtersOf({ nome: ['a'] })).toEqual({})
      expect(filtersOf({ eta: 'x' })).toEqual({})
      expect(filtersOf({ eta: ['a'] })).toEqual({})
      expect(filtersOf({ citta: { min: 1 } })).toEqual({})
    })
    it('scarta i filtri vuoti o non attivi', () => {
      expect(filtersOf({ nome: '', citta: [], eta: {} })).toEqual({})
      expect(filtersOf({ nome: '   ' })).toEqual({})
      expect(filtersOf({ eta: { min: null, max: null } })).toEqual({})
    })
    it('negli intervalli tiene solo gli estremi numerici finiti', () => {
      expect(filtersOf({ eta: { min: '5', max: 10 } })).toEqual({ eta: { max: 10 } })
      expect(filtersOf({ eta: { min: Number.NaN, max: Number.POSITIVE_INFINITY } })).toEqual({})
      expect(filtersOf({ eta: { min: 1, max: 2, extra: 3 } })).toEqual({ eta: { min: 1, max: 2 } })
    })
    it('negli elenchi tiene solo i primitivi validi', () => {
      expect(filtersOf({ citta: ['Roma', 3, true, null, {}, [], Number.NaN, 'x'] })).toEqual({
        citta: ['Roma', 3, true, 'x'],
      })
    })
    it('accetta un primitivo per i filtri a selezione (anche booleano o numero)', () => {
      expect(filtersOf({ citta: 'Roma' })).toEqual({ citta: 'Roma' })
      expect(filtersOf({ citta: false })).toEqual({ citta: false })
      expect(filtersOf({ citta: 0 })).toEqual({ citta: 0 })
    })
    it('per colonne senza tipo dichiarato deduce dalla forma, ma scarta oggetti strani', () => {
      expect(filtersOf({ libera: 'x' })).toEqual({ libera: 'x' })
      expect(filtersOf({ libera: { min: 1 } })).toEqual({ libera: { min: 1 } })
      expect(filtersOf({ libera: Number.NaN })).toEqual({})
    })
  })

  describe('globalSearch, page, pageSize', () => {
    it('globalSearch deve essere una stringa', () => {
      expect(validateState({ globalSearch: 5 }, ctx).globalSearch).toBe('')
      expect(validateState({ globalSearch: ['a'] }, ctx).globalSearch).toBe('')
      expect(validateState({ globalSearch: 'ok' }, ctx).globalSearch).toBe('ok')
    })
    it('page deve essere un intero ≥ 1', () => {
      for (const bad of [0, -3, 1.5, Number.NaN, Number.POSITIVE_INFINITY, '2', null, {}, []]) {
        expect(validateState({ page: bad }, ctx).page).toBe(1)
      }
      expect(validateState({ page: 7 }, ctx).page).toBe(7)
    })
    it('pageSize deve essere tra quelli ammessi, altrimenti il ripiego', () => {
      expect(validateState({ pageSize: 50 }, ctx).pageSize).toBe(50)
      for (const bad of [0, 7, -10, 1000, 25.5, '50', null, Number.NaN]) {
        expect(validateState({ pageSize: bad }, ctx).pageSize).toBe(25)
      }
    })
    it('il ripiego è ammesso anche se non è tra le opzioni', () => {
      const c = { ...ctx, pageSizeOptions: [10, 50], defaultPageSize: 25 }
      expect(validateState({ pageSize: 25 }, c).pageSize).toBe(25)
    })
  })

  describe('colonne: ordine, visibilità, larghezze, fisse', () => {
    it('columnOrder e pinnedLeft tengono solo id noti, senza duplicati', () => {
      const result = validateState(
        {
          columnOrder: ['eta', 'zzz', 5, 'eta', null, 'nome', {}],
          pinnedLeft: ['nome', 'nome', 'xxx'],
        },
        ctx,
      )
      expect(result.columnOrder).toEqual(['eta', 'nome'])
      expect(result.pinnedLeft).toEqual(['nome'])
      expect(validateState({ columnOrder: 'nome', pinnedLeft: { 0: 'nome' } }, ctx)).toMatchObject({
        columnOrder: [],
        pinnedLeft: [],
      })
    })
    it('columnVisibility tiene solo booleani di colonne note', () => {
      const result = validateState(
        { columnVisibility: { nome: false, eta: 'no', zzz: true, note: true, libera: 0 } },
        ctx,
      )
      expect(result.columnVisibility).toEqual({ nome: false, note: true })
      expect(validateState({ columnVisibility: [true] }, ctx).columnVisibility).toEqual({})
    })
    it('columnWidths tiene solo numeri positivi finiti e rispetta min/max', () => {
      const result = validateState(
        {
          columnWidths: { nome: 120, eta: 9999, libera: -5, note: 'x', zzz: 10, citta: Number.NaN },
        },
        ctx,
      )
      expect(result.columnWidths).toEqual({ nome: 120, eta: 300 })
      expect(validateState({ columnWidths: { eta: 1 } }, ctx).columnWidths).toEqual({ eta: 50 })
      expect(validateState({ columnWidths: { nome: 0 } }, ctx).columnWidths).toEqual({})
    })
  })

  describe('sicurezza', () => {
    it('non inquina i prototipi con chiavi come __proto__', () => {
      const hostile = JSON.parse(
        '{"__proto__":{"polluted":true},"filters":{"__proto__":{"polluted":true},"nome":"ada"},"columnVisibility":{"__proto__":false},"constructor":{"prototype":{"polluted":true}}}',
      ) as unknown
      const result = validateState(hostile, ctx)
      expect(({} as Record<string, unknown>).polluted).toBeUndefined()
      expect(Object.getPrototypeOf(result.filters)).toBe(Object.prototype)
      expect(result.filters).toEqual({ nome: 'ada' })
    })
    it('limita la lunghezza degli elenchi', () => {
      const big = Array.from({ length: 100_000 }, (_, i) => i)
      const result = validateState({ filters: { citta: big } }, ctx)
      expect((result.filters.citta as unknown[]).length).toBeLessThanOrEqual(1000)
    })
  })

  describe('version', () => {
    it('imposta sempre la versione corrente nell’output', () => {
      expect(validateState({ version: 1 }, ctx).version).toBe(STATE_VERSION)
    })
  })
})

describe('parseState', () => {
  it('accetta una stringa JSON valida', () => {
    const json = JSON.stringify({ ...defaults, page: 4, globalSearch: 'ada' })
    expect(parseState(json, ctx)).toMatchObject({ page: 4, globalSearch: 'ada' })
  })
  it('una stringa non JSON, vuota o troncata dà lo stato di default', () => {
    for (const bad of ['', '{', '{"page":', 'undefined', 'ciao', '{page: 1}', '\u0000', '[1']) {
      expect(() => parseState(bad, ctx)).not.toThrow()
      expect(parseState(bad, ctx)).toEqual(defaults)
    }
  })
  it('JSON valido ma non un oggetto dà lo stato di default', () => {
    for (const bad of ['null', '42', '"x"', '[1,2]', 'true']) {
      expect(parseState(bad, ctx)).toEqual(defaults)
    }
  })
  it('un oggetto (non stringa) viene validato come validateState', () => {
    expect(parseState({ page: 2 }, ctx).page).toBe(2)
    expect(parseState(null, ctx)).toEqual(defaults)
  })
  it('regge un JSON molto annidato', () => {
    const deep = `${'['.repeat(5000)}${']'.repeat(5000)}`
    expect(() => parseState(deep, ctx)).not.toThrow()
    expect(parseState(deep, ctx)).toEqual(defaults)
  })
})

describe('clampStatePage', () => {
  it('porta la pagina nei limiti validi', () => {
    const state = createDefaultState({ page: 99, pageSize: 10 })
    expect(clampStatePage(state, 25).page).toBe(3)
    expect(clampStatePage(state, 0).page).toBe(1)
    expect(clampStatePage(createDefaultState({ page: 2, pageSize: 10 }), 25).page).toBe(2)
  })
  it('restituisce lo stesso oggetto se non c’è nulla da correggere', () => {
    const state = createDefaultState({ page: 2, pageSize: 10 })
    expect(clampStatePage(state, 25)).toBe(state)
  })
})

describe('cloneState', () => {
  it('copia in profondità come JSON semplice', () => {
    const state = createDefaultState({ filters: { eta: { min: 1, max: undefined } } })
    const copy = cloneState(state)
    expect(copy).toEqual({ ...state, filters: { eta: { min: 1 } } })
    expect(copy.filters).not.toBe(state.filters)
  })
})

describe('jsonEqual', () => {
  it('confronta per contenuto, non per riferimento', () => {
    expect(jsonEqual(createDefaultState(), createDefaultState())).toBe(true)
    expect(jsonEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true)
  })
  it('ignora l’ordine delle chiavi e le chiavi undefined', () => {
    expect(jsonEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
    expect(jsonEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true)
  })
  it('distingue valori, lunghezze, tipi e null', () => {
    expect(jsonEqual({ a: 1 }, { a: 2 })).toBe(false)
    expect(jsonEqual([1, 2], [1, 2, 3])).toBe(false)
    expect(jsonEqual([], {})).toBe(false)
    expect(jsonEqual(null, {})).toBe(false)
    expect(jsonEqual({ a: 1 }, { b: 1 })).toBe(false)
    expect(jsonEqual({ a: undefined }, { b: undefined, c: 1 })).toBe(false)
    expect(jsonEqual('1', 1)).toBe(false)
    expect(jsonEqual(undefined, undefined)).toBe(true)
  })
})
