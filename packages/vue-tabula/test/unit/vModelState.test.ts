import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Component } from 'vue'
import { VtTable } from '../../src'
import type { ColumnDef, TableState } from '../../src'

interface Row {
  id: number
  nome: string
  citta: string
  eta: number
}
const rows: Row[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  nome: `P${i + 1}`,
  citta: i % 2 ? 'Roma' : 'Milano',
  eta: 20 + i,
}))
const columns: ColumnDef<Row>[] = [
  { id: 'nome', header: 'Nome', filter: 'text' },
  { id: 'citta', header: 'Città', filter: 'select' },
  { id: 'eta', header: 'Età', filter: 'number' },
]

let wrapper: ReturnType<typeof mountTable>
afterEach(() => wrapper?.unmount())

/** Monta la tabella come farebbe un genitore con `v-model:state` (aggiornamento sincrono). */
function mountTable(props: Record<string, unknown> = {}, controlled = true) {
  // Come un genitore con `v-model:state`: lo stato emesso (anche durante il montaggio) viene
  // ripassato subito come prop.
  let pending: TableState | undefined
  const holder: { w?: ReturnType<typeof mount> } = {}
  const w = mount(VtTable as unknown as Component, {
    attachTo: document.body,
    props: {
      rows,
      columns,
      rowKey: 'id',
      pageSize: 10,
      debounce: 0,
      ...(controlled
        ? {
            'onUpdate:state': (s: TableState) => {
              if (holder.w) void holder.w.setProps({ state: s })
              else pending = s
            },
          }
        : {}),
      ...props,
    },
  })
  holder.w = w
  if (pending) void w.setProps({ state: pending })
  return w
}
const emits = () => (wrapper.emitted('update:state') ?? []) as TableState[][]
const names = () =>
  wrapper.findAll('.vt-body [role="gridcell"][aria-colindex="1"]').map((c) => c.text())
const get = () => (wrapper.vm as unknown as { getState(): TableState }).getState()

describe('v-model:state: uscita', () => {
  it('emette update:state con un oggetto JSON semplice a ogni cambio', async () => {
    wrapper = mountTable()
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P2')
    expect(emits()).toHaveLength(1)
    const state = emits()[0]![0]!
    expect(state).toMatchObject({ version: 1, filters: { nome: 'P2' }, page: 1 })
    expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    expect(state).toEqual(get())
  })

  it('un clic di ordinamento, un cambio di pagina e una ricerca emettono lo stato', async () => {
    wrapper = mountTable()
    await wrapper.findAll('[role="columnheader"] button')[0]!.trigger('click')
    expect(emits().at(-1)![0]!.sort).toEqual([{ columnId: 'nome', dir: 'asc' }])
    await wrapper.get('[aria-label="Next page"]').trigger('click')
    expect(emits().at(-1)![0]!.page).toBe(2)
    await wrapper.get('input[type="search"]').setValue('x')
    expect(emits().at(-1)![0]!.globalSearch).toBe('x')
  })

  it('funziona anche senza v-model', async () => {
    wrapper = mountTable({}, false)
    await wrapper.get('[aria-label="Next page"]').trigger('click')
    expect(names()[0]).toBe('P11')
  })
})

describe('v-model:state: niente cicli', () => {
  it('quando il genitore ripassa lo stato ricevuto non riemette', async () => {
    wrapper = mountTable()
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P1')
    await flushPromises()
    expect(emits()).toHaveLength(1)
  })

  it('il confronto è strutturale: una copia profonda con chiavi in altro ordine non fa nulla', async () => {
    wrapper = mountTable()
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P1')
    const current = get()
    const reordered = Object.fromEntries(Object.entries(current).reverse()) as unknown as TableState
    await wrapper.setProps({ state: reordered })
    await wrapper.setProps({ state: structuredClone(reordered) })
    await flushPromises()
    expect(emits()).toHaveLength(1)
    expect(get()).toEqual(current)
  })

  it('un genitore che ripassa sempre un oggetto nuovo e uguale non innesca cicli', async () => {
    let received = 0
    wrapper = mountTable({
      'onUpdate:state': (s: TableState) => {
        received++
        void wrapper.setProps({ state: JSON.parse(JSON.stringify(s)) })
      },
    })
    await wrapper.get('[aria-label="Next page"]').trigger('click')
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P')
    await flushPromises()
    expect(received).toBe(2)
  })

  it('uno stato valido e uguale a quello interno non emette al montaggio', async () => {
    wrapper = mountTable({ state: { ...get_defaults() } })
    await flushPromises()
    expect(emits()).toHaveLength(0)
  })
})

function get_defaults(): TableState {
  return {
    version: 1,
    sort: [],
    filters: {},
    globalSearch: '',
    columnOrder: [],
    columnVisibility: {},
    columnWidths: {},
    pinnedLeft: [],
    page: 1,
    pageSize: 10,
  }
}

describe('v-model:state: ingresso e ripristino validato', () => {
  it('ripristina ordinamento, filtri, ricerca, pagina e pageSize', async () => {
    wrapper = mountTable({
      state: {
        ...get_defaults(),
        sort: [{ columnId: 'eta', dir: 'desc' }],
        filters: { citta: 'Roma' },
        globalSearch: 'p',
        page: 2,
        pageSize: 10,
      },
    })
    await flushPromises()
    // Roma: righe pari (indice dispari): P2, P4, … P24 → 12 righe, ordinate per età decrescente.
    expect(names()).toEqual(['P4', 'P2'])
    expect(wrapper.get('[role="status"]').text()).toBe('11–12 of 12')
    expect(
      (wrapper.get('select[aria-label="Filter Città"]').element as HTMLSelectElement).value,
    ).toBe('1')
    expect(wrapper.findAll('[role="columnheader"]')[2]!.attributes('aria-sort')).toBe('descending')
    expect(emits()).toHaveLength(0)
  })

  it('aggiorna la tabella quando il genitore cambia lo stato dopo il montaggio', async () => {
    wrapper = mountTable()
    await wrapper.setProps({ state: { ...get_defaults(), filters: { nome: 'P24' } } })
    expect(names()).toEqual(['P24'])
  })

  const garbage: [string, unknown][] = [
    ['una stringa', 'non sono uno stato'],
    ['un numero', 42],
    ['un array', [1, 2]],
    ['null', null],
    ['un oggetto vuoto', {}],
    ['una versione futura', { version: 99, page: 3, globalSearch: 'zzz' }],
  ]
  it.each(garbage)('con %s come stato usa i default senza lanciare', async (_n, bad) => {
    expect(() => {
      wrapper = mountTable({ state: bad })
    }).not.toThrow()
    await flushPromises()
    expect(names()).toHaveLength(10)
    expect(get()).toMatchObject({ page: 1, globalSearch: '', filters: {}, sort: [] })
  })

  it('JSON corrotto passato come stato in corsa non rompe la tabella', async () => {
    wrapper = mountTable()
    for (const bad of ['{', undefined, null, 5, { sort: 'x', filters: 7, page: 'a' }]) {
      await expect(wrapper.setProps({ state: bad as never })).resolves.not.toThrow()
    }
    expect(names()).toHaveLength(10)
  })

  it('ignora chiavi sconosciute e colonne inesistenti, e scarta i valori di tipo sbagliato', async () => {
    wrapper = mountTable({
      state: {
        ...get_defaults(),
        estranea: true,
        sort: [
          { columnId: 'zzz', dir: 'asc' },
          { columnId: 'nome', dir: 'su' },
        ],
        filters: { zzz: 'x', nome: 5, eta: 'molto' },
        columnOrder: ['zzz'],
        globalSearch: 42,
      },
    })
    await flushPromises()
    expect(get()).toMatchObject({ sort: [], filters: {}, columnOrder: [], globalSearch: '' })
    expect(names()).toHaveLength(10)
    // Lo stato corretto viene comunicato al genitore.
    expect(emits()).toHaveLength(1)
    expect(emits()[0]![0]).not.toHaveProperty('estranea')
  })

  it('porta page nell’intervallo valido', async () => {
    wrapper = mountTable({ state: { ...get_defaults(), page: 99 } })
    await flushPromises()
    expect(get().page).toBe(3)
    expect(names()).toHaveLength(5)
    expect(emits().at(-1)![0]!.page).toBe(3)

    wrapper.unmount()
    wrapper = mountTable({ state: { ...get_defaults(), page: -4 } })
    await flushPromises()
    expect(get().page).toBe(1)
  })

  it('porta page nei limiti dopo aver applicato i filtri ripristinati', async () => {
    wrapper = mountTable({ state: { ...get_defaults(), filters: { nome: 'P2' }, page: 5 } })
    await flushPromises()
    // P2, P20..P25 = 7 righe → una sola pagina.
    expect(get().page).toBe(1)
    expect(names()).toHaveLength(7)
  })

  it('pageSize non ammesso torna al valore della prop', async () => {
    wrapper = mountTable({ state: { ...get_defaults(), pageSize: 7 } })
    await flushPromises()
    expect(get().pageSize).toBe(10)
    wrapper.unmount()
    wrapper = mountTable({ state: { ...get_defaults(), pageSize: 50 } })
    await flushPromises()
    expect(names()).toHaveLength(25)
  })

  it('con i dati ancora in caricamento non perde la pagina ripristinata', async () => {
    wrapper = mountTable({ rows: [], state: { ...get_defaults(), page: 3 } })
    await flushPromises()
    expect(get().page).toBe(3)
    await wrapper.setProps({ rows })
    await flushPromises()
    expect(get().page).toBe(3)
    expect(names()).toHaveLength(5)
  })

  it('se i dati diminuiscono e la pagina non esiste più, lo stato scende all’ultima valida', async () => {
    wrapper = mountTable({ state: { ...get_defaults(), page: 3 } })
    await flushPromises()
    await wrapper.setProps({ rows: rows.slice(0, 12) })
    await flushPromises()
    expect(get().page).toBe(2)
    expect(emits().at(-1)![0]!.page).toBe(2)
  })

  it('passare undefined dopo uno stato riporta la tabella ai valori iniziali', async () => {
    wrapper = mountTable()
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P24')
    expect(names()).toEqual(['P24'])
    await wrapper.setProps({ state: undefined })
    await flushPromises()
    expect(names()).toHaveLength(10)
    expect(get().filters).toEqual({})
  })

  it('un nuovo stato dal genitore scarta le bozze di digitazione in attesa', async () => {
    vi.useFakeTimers()
    try {
      wrapper = mountTable({ debounce: 250 })
      await wrapper.get('input[aria-label="Filter Nome"]').setValue('P24')
      await wrapper.setProps({ state: { ...get_defaults(), filters: { citta: 'Roma' } } })
      vi.advanceTimersByTime(500)
      await flushPromises()
      expect(get().filters).toEqual({ citta: 'Roma' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('restore → modifica → resetState: lo stato round-trip attraverso JSON', async () => {
    wrapper = mountTable()
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P1')
    await wrapper.get('[aria-label="Next page"]').trigger('click')
    const saved = JSON.stringify(get())

    wrapper.unmount()
    wrapper = mountTable({ state: JSON.parse(saved) })
    await flushPromises()
    expect(JSON.stringify(get())).toBe(saved)
    ;(wrapper.vm as unknown as { resetState(): void }).resetState()
    await flushPromises()
    expect(get()).toMatchObject({ filters: {}, page: 1 })
    expect(emits().at(-1)![0]).toMatchObject({ filters: {}, page: 1 })
  })
})
