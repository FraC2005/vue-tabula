import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { Component } from 'vue'
import { VtTable } from '../../src'
import type { ColumnDef, RowKey } from '../../src'

interface Persona {
  id: number
  nome: string
}
const columns: ColumnDef<Persona>[] = [
  { id: 'id', header: 'ID' },
  { id: 'nome', header: 'Nome' },
]
interface TableProps {
  rows: Persona[]
  columns: ColumnDef<Persona>[]
  rowKey: keyof Persona | ((row: Persona) => RowKey)
  ariaLabel?: string
  pageSize?: number
  debounce?: number
  searchable?: boolean
  paginated?: boolean
  labels?: Record<string, unknown>
  classes?: Record<string, string>
}

// mount() di test-utils non conserva i generici dei componenti: li fissiamo qui.
function mountTable(props: TableProps, slots: Record<string, string> = {}) {
  return mount(VtTable as unknown as Component, { props: { debounce: 0, ...props }, slots })
}

const rows: Persona[] = [
  { id: 1, nome: 'Ada' },
  { id: 2, nome: 'Linus' },
]

describe('VtTable', () => {
  it('espone la struttura ARIA grid', () => {
    const wrapper = mountTable({ rows, columns, rowKey: 'id', ariaLabel: 'Persone' })
    const grid = wrapper.get('[role="grid"]')
    expect(grid.attributes('aria-label')).toBe('Persone')
    expect(grid.attributes('aria-rowcount')).toBe('3')
    expect(grid.attributes('aria-colcount')).toBe('2')
    expect(wrapper.findAll('[role="columnheader"]')).toHaveLength(2)
    expect(wrapper.findAll('[role="gridcell"]')).toHaveLength(4)
  })

  it('mostra i valori delle celle', () => {
    const wrapper = mountTable({ rows, columns, rowKey: 'id' })
    expect(wrapper.text()).toContain('Linus')
  })

  it('usa lo slot generico cell come ripiego', () => {
    const wrapper = mountTable(
      { rows, columns, rowKey: 'id' },
      { cell: '<template #cell="{ value }">[{{ value }}]</template>' },
    )
    expect(wrapper.text()).toContain('[Ada]')
  })

  it('dà la precedenza allo slot cell-<columnId>', () => {
    const wrapper = mountTable(
      { rows, columns, rowKey: 'id' },
      {
        cell: '<template #cell="{ value }">[{{ value }}]</template>',
        'cell-nome': '<template #cell-nome="{ value }">{{ value }}!</template>',
      },
    )
    expect(wrapper.text()).toContain('Ada!')
    expect(wrapper.text()).not.toContain('[Ada]')
    expect(wrapper.text()).toContain('[1]')
  })

  it('accetta rowKey come funzione', () => {
    const wrapper = mountTable({ rows, columns, rowKey: (r) => `p-${r.id}` })
    expect(wrapper.findAll('[role="row"]')).toHaveLength(3)
  })

  describe('ordinamento', () => {
    const people: Persona[] = [
      { id: 1, nome: 'Carla' },
      { id: 2, nome: 'Ada' },
      { id: 3, nome: 'Bruno' },
    ]
    const names = (w: ReturnType<typeof mountTable>) =>
      w.findAll('.vt-body [role="gridcell"][aria-colindex="2"]').map((c) => c.text())

    it('ordina al clic sull’intestazione e aggiorna aria-sort', async () => {
      const wrapper = mountTable({ rows: people, columns, rowKey: 'id' })
      const header = wrapper.findAll('[role="columnheader"]')[1]!
      expect(header.attributes('aria-sort')).toBe('none')

      await header.get('button').trigger('click')
      expect(names(wrapper)).toEqual(['Ada', 'Bruno', 'Carla'])
      expect(header.attributes('aria-sort')).toBe('ascending')

      await header.get('button').trigger('click')
      expect(names(wrapper)).toEqual(['Carla', 'Bruno', 'Ada'])
      expect(header.attributes('aria-sort')).toBe('descending')

      await header.get('button').trigger('click')
      expect(names(wrapper)).toEqual(['Carla', 'Ada', 'Bruno'])
      expect(header.attributes('aria-sort')).toBe('none')
    })

    it('con Maiusc ordina su più colonne', async () => {
      const wrapper = mountTable({ rows: people, columns, rowKey: 'id' })
      const [h1, h2] = wrapper.findAll('[role="columnheader"] button')
      await h2!.trigger('click')
      await h1!.trigger('click', { shiftKey: true })
      expect(wrapper.findAll('.vt-sort-indicator sup').map((s) => s.text())).toEqual(['2', '1'])
    })

    it('non rende cliccabili le colonne con sortable: false', () => {
      const wrapper = mountTable({
        rows: people,
        columns: [{ id: 'id', header: 'ID', sortable: false }, columns[1]!],
        rowKey: 'id',
      })
      const header = wrapper.findAll('[role="columnheader"]')[0]!
      expect(header.find('button').exists()).toBe(false)
      expect(header.attributes('aria-sort')).toBeUndefined()
    })
  })

  describe('ricerca globale', () => {
    it('filtra le righe e aggiorna aria-rowcount', async () => {
      const wrapper = mountTable({ rows, columns, rowKey: 'id' })
      await wrapper.get('input[type="search"]').setValue('lin')
      expect(wrapper.findAll('[role="gridcell"]').map((c) => c.text())).toEqual(['2', 'Linus'])
      expect(wrapper.get('[role="grid"]').attributes('aria-rowcount')).toBe('2')
    })

    it('mostra lo stato vuoto senza risultati', async () => {
      const wrapper = mountTable({ rows, columns, rowKey: 'id' })
      await wrapper.get('input[type="search"]').setValue('zzz')
      expect(wrapper.text()).toContain('No results')
    })

    it('si può nascondere con searchable: false', () => {
      const wrapper = mountTable({ rows, columns, rowKey: 'id', searchable: false })
      expect(wrapper.find('input[type="search"]').exists()).toBe(false)
    })
  })

  describe('paginazione', () => {
    const many: Persona[] = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, nome: `P${i + 1}` }))
    const ids = (w: ReturnType<typeof mountTable>) =>
      w.findAll('[aria-colindex="1"][role="gridcell"]').map((c) => c.text())

    it('mostra solo la pagina corrente con aria-rowindex assoluto', async () => {
      const wrapper = mountTable({ rows: many, columns, rowKey: 'id', pageSize: 10 })
      expect(ids(wrapper)).toHaveLength(10)
      await wrapper.get('[aria-label="Next page"]').trigger('click')
      expect(ids(wrapper)[0]).toBe('11')
      expect(wrapper.findAll('[role="row"]')[1]!.attributes('aria-rowindex')).toBe('12')
      expect(wrapper.get('[role="grid"]').attributes('aria-rowcount')).toBe('26')
      expect(wrapper.get('[role="status"]').text()).toBe('11–20 of 25')
    })

    it('disabilita i pulsanti ai limiti', async () => {
      const wrapper = mountTable({ rows: many, columns, rowKey: 'id', pageSize: 10 })
      expect(wrapper.get('[aria-label="Previous page"]').attributes('disabled')).toBeDefined()
      await wrapper.get('[aria-label="Next page"]').trigger('click')
      await wrapper.get('[aria-label="Next page"]').trigger('click')
      expect(ids(wrapper)).toHaveLength(5)
      expect(wrapper.get('[aria-label="Next page"]').attributes('disabled')).toBeDefined()
    })

    it('cambia le righe per pagina e torna a pagina 1', async () => {
      const wrapper = mountTable({ rows: many, columns, rowKey: 'id', pageSize: 10 })
      await wrapper.get('[aria-label="Next page"]').trigger('click')
      await wrapper.get('select').setValue('50')
      expect(ids(wrapper)).toHaveLength(25)
    })

    it('torna a pagina 1 quando cambia la ricerca', async () => {
      const wrapper = mountTable({ rows: many, columns, rowKey: 'id', pageSize: 10 })
      await wrapper.get('[aria-label="Next page"]').trigger('click')
      await wrapper.get('input[type="search"]').setValue('P1')
      expect(ids(wrapper)[0]).toBe('1')
    })

    it('con paginated: false mostra tutte le righe e nessun controllo', () => {
      const wrapper = mountTable({ rows: many, columns, rowKey: 'id', paginated: false })
      expect(ids(wrapper)).toHaveLength(25)
      expect(wrapper.find('.vt-pagination').exists()).toBe(false)
    })
  })

  describe('personalizzazione', () => {
    it('applica le classi passate tramite prop', () => {
      const wrapper = mountTable({
        rows,
        columns,
        rowKey: 'id',
        classes: { root: 'mia-root', cell: 'mia-cella' },
      })
      expect(wrapper.classes()).toContain('mia-root')
      expect(wrapper.get('[role="gridcell"]').classes()).toContain('mia-cella')
    })

    it('sostituisce i testi tramite labels', async () => {
      const wrapper = mountTable({ rows, columns, rowKey: 'id', labels: { empty: 'Niente' } })
      await wrapper.get('input[type="search"]').setValue('zzz')
      expect(wrapper.text()).toContain('Niente')
    })

    it('usa gli slot header-<columnId> e empty', async () => {
      const wrapper = mountTable(
        { rows, columns, rowKey: 'id' },
        {
          'header-nome': '<template #header-nome="{ column }">**{{ column.header }}**</template>',
          empty: '<template #empty>Vuoto!</template>',
        },
      )
      expect(wrapper.text()).toContain('**Nome**')
      await wrapper.get('input[type="search"]').setValue('zzz')
      expect(wrapper.text()).toContain('Vuoto!')
    })

    it('espone getState e resetState', async () => {
      const wrapper = mountTable({ rows, columns, rowKey: 'id' })
      await wrapper.get('input[type="search"]').setValue('ada')
      const vm = wrapper.vm as unknown as {
        getState(): { globalSearch: string }
        resetState(): void
      }
      expect(vm.getState().globalSearch).toBe('ada')
      vm.resetState()
      expect(vm.getState().globalSearch).toBe('')
    })
  })

  describe('filtri per colonna', () => {
    interface P2 {
      id: number
      nome: string
      citta: string
      eta: number
    }
    const people: P2[] = [
      { id: 1, nome: 'Ada', citta: 'Londra', eta: 36 },
      { id: 2, nome: 'Linus', citta: 'Helsinki', eta: 54 },
      { id: 3, nome: 'Grace', citta: 'Londra', eta: 85 },
    ]
    const cols: ColumnDef<P2>[] = [
      { id: 'nome', header: 'Nome', filter: 'text' },
      { id: 'citta', header: 'Città', filter: 'select' },
      { id: 'eta', header: 'Età', filter: 'number' },
    ]
    const mountFilters = () =>
      mount(VtTable as unknown as Component, {
        props: { rows: people, columns: cols, rowKey: 'id', debounce: 0 },
      })
    const bodyNames = (w: ReturnType<typeof mountFilters>) =>
      w.findAll('.vt-body [role="gridcell"][aria-colindex="1"]').map((c) => c.text())

    it('mostra la riga dei filtri solo se una colonna dichiara filter', () => {
      expect(mountFilters().find('.vt-filter-row').exists()).toBe(true)
      expect(mountTable({ rows, columns, rowKey: 'id' }).find('.vt-filter-row').exists()).toBe(
        false,
      )
    })

    it('tiene coerenti aria-rowindex e aria-rowcount con la riga dei filtri', () => {
      const wrapper = mountFilters()
      expect(wrapper.get('[role="grid"]').attributes('aria-rowcount')).toBe('5')
      expect(wrapper.get('.vt-filter-row').attributes('aria-rowindex')).toBe('2')
      expect(wrapper.get('.vt-body [role="row"]').attributes('aria-rowindex')).toBe('3')
    })

    it('filtra con il campo di testo e dà un nome accessibile ai controlli', async () => {
      const wrapper = mountFilters()
      const input = wrapper.get('input[aria-label="Filter Nome"]')
      await input.setValue('gra')
      expect(bodyNames(wrapper)).toEqual(['Grace'])
    })

    it('filtra con la selezione, con opzioni ricavate dalle righe', async () => {
      const wrapper = mountFilters()
      const select = wrapper.get('select[aria-label="Filter Città"]')
      expect(select.findAll('option').map((o) => o.text())).toEqual(['All', 'Helsinki', 'Londra'])
      await select.setValue('1')
      expect(bodyNames(wrapper)).toEqual(['Ada', 'Grace'])
      await select.setValue('')
      expect(bodyNames(wrapper)).toHaveLength(3)
    })

    it('filtra con l’intervallo numerico', async () => {
      const wrapper = mountFilters()
      await wrapper.get('input[aria-label="Filter Età: Min"]').setValue('50')
      expect(bodyNames(wrapper)).toEqual(['Linus', 'Grace'])
      await wrapper.get('input[aria-label="Filter Età: Max"]').setValue('60')
      expect(bodyNames(wrapper)).toEqual(['Linus'])
    })

    it('combina filtri e ricerca globale e riporta a pagina 1', async () => {
      const wrapper = mountFilters()
      await wrapper.get('select[aria-label="Filter Città"]').setValue('1')
      await wrapper.get('input[type="search"]').setValue('grace')
      expect(bodyNames(wrapper)).toEqual(['Grace'])
    })

    it('"Clear filters" azzera filtri e ricerca', async () => {
      const wrapper = mountFilters()
      await wrapper.get('input[aria-label="Filter Nome"]').setValue('gra')
      await wrapper.get('.vt-clear-filters').trigger('click')
      expect(bodyNames(wrapper)).toHaveLength(3)
      expect(wrapper.find('.vt-clear-filters').exists()).toBe(false)
    })

    it('mostra lo stato vuoto con la riga dei filtri nell’indice corretto', async () => {
      const wrapper = mountFilters()
      await wrapper.get('input[aria-label="Filter Nome"]').setValue('zzz')
      expect(wrapper.get('.vt-body [role="row"]').attributes('aria-rowindex')).toBe('3')
      expect(wrapper.text()).toContain('No results')
    })

    it('espone filter-<columnId> per sostituire il controllo', async () => {
      const wrapper = mount(VtTable as unknown as Component, {
        props: { rows: people, columns: cols, rowKey: 'id', debounce: 0 },
        slots: {
          'filter-nome': `<template #filter-nome="{ setValue }"><button class="mio" @click="setValue('linus')">x</button></template>`,
        },
      })
      await wrapper.get('.mio').trigger('click')
      expect(bodyNames(wrapper)).toEqual(['Linus'])
    })

    it('getState include i filtri attivi', async () => {
      const wrapper = mountFilters()
      await wrapper.get('input[aria-label="Filter Nome"]').setValue('ada')
      const vm = wrapper.vm as unknown as { getState(): { filters: unknown } }
      expect(vm.getState().filters).toEqual({ nome: 'ada' })
    })
  })

  describe('debounce', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    interface P3 {
      id: number
      nome: string
      eta: number
      citta: string
    }
    const people: P3[] = [
      { id: 1, nome: 'Ada', eta: 36, citta: 'Londra' },
      { id: 2, nome: 'Linus', eta: 54, citta: 'Helsinki' },
      { id: 3, nome: 'Grace', eta: 85, citta: 'Londra' },
    ]
    const cols: ColumnDef<P3>[] = [
      { id: 'nome', header: 'Nome', filter: 'text' },
      { id: 'eta', header: 'Età', filter: 'number' },
      { id: 'citta', header: 'Città', filter: 'select' },
    ]
    const mountDebounced = (extra: Record<string, unknown> = {}) =>
      mount(VtTable as unknown as Component, {
        props: { rows: people, columns: cols, rowKey: 'id', ...extra },
      })
    const names = (w: ReturnType<typeof mountDebounced>) =>
      w.findAll('.vt-body [role="gridcell"][aria-colindex="1"]').map((c) => c.text())

    it('ritarda ricerca globale e filtri di testo di 250 ms di default', async () => {
      const wrapper = mountDebounced()
      await wrapper.get('input[type="search"]').setValue('grace')
      await wrapper.get('input[aria-label="Filter Nome"]').setValue('li')
      expect(names(wrapper)).toHaveLength(3)
      vi.advanceTimersByTime(249)
      await flushPromises()
      expect(names(wrapper)).toHaveLength(3)
      vi.advanceTimersByTime(1)
      await flushPromises()
      expect(names(wrapper)).toEqual([])
    })

    it('mostra subito ciò che si digita, anche prima dell’applicazione', async () => {
      const wrapper = mountDebounced()
      const input = wrapper.get('input[aria-label="Filter Nome"]')
      await input.setValue('gra')
      expect((input.element as HTMLInputElement).value).toBe('gra')
      expect(names(wrapper)).toHaveLength(3)
    })

    it('ricomincia il conto a ogni carattere', async () => {
      const wrapper = mountDebounced()
      const input = wrapper.get('input[aria-label="Filter Nome"]')
      await input.setValue('g')
      vi.advanceTimersByTime(200)
      await input.setValue('gr')
      vi.advanceTimersByTime(200)
      await flushPromises()
      expect(names(wrapper)).toHaveLength(3)
      vi.advanceTimersByTime(50)
      await flushPromises()
      expect(names(wrapper)).toEqual(['Grace'])
    })

    it('ritarda anche i filtri numerici', async () => {
      const wrapper = mountDebounced()
      await wrapper.get('input[aria-label="Filter Età: Min"]').setValue('50')
      expect(names(wrapper)).toHaveLength(3)
      vi.advanceTimersByTime(250)
      await flushPromises()
      expect(names(wrapper)).toEqual(['Linus', 'Grace'])
    })

    it('il filtro a selezione si applica subito', async () => {
      const wrapper = mountDebounced()
      await wrapper.get('select[aria-label="Filter Città"]').setValue('1')
      expect(names(wrapper)).toEqual(['Ada', 'Grace'])
    })

    it('il ritardo è configurabile; 0 applica subito', async () => {
      const slow = mountDebounced({ debounce: 600 })
      await slow.get('input[aria-label="Filter Nome"]').setValue('gra')
      vi.advanceTimersByTime(599)
      await flushPromises()
      expect(names(slow)).toHaveLength(3)
      vi.advanceTimersByTime(1)
      await flushPromises()
      expect(names(slow)).toEqual(['Grace'])

      const instant = mountDebounced({ debounce: 0 })
      await instant.get('input[aria-label="Filter Nome"]').setValue('gra')
      expect(names(instant)).toEqual(['Grace'])
    })

    it('blur e Invio applicano subito la bozza', async () => {
      const wrapper = mountDebounced()
      const input = wrapper.get('input[aria-label="Filter Nome"]')
      await input.setValue('gra')
      await input.trigger('blur')
      expect(names(wrapper)).toEqual(['Grace'])

      await input.setValue('lin')
      await input.trigger('keydown', { key: 'Enter' })
      expect(names(wrapper)).toEqual(['Linus'])
    })

    it('getState include le bozze in attesa', async () => {
      const wrapper = mountDebounced()
      await wrapper.get('input[aria-label="Filter Nome"]').setValue('ada')
      const vm = wrapper.vm as unknown as { getState(): { filters: unknown } }
      expect(vm.getState().filters).toEqual({ nome: 'ada' })
    })

    it('"Clear filters" e resetState scartano le bozze in attesa', async () => {
      const wrapper = mountDebounced()
      await wrapper.get('input[aria-label="Filter Nome"]').setValue('ada')
      ;(wrapper.vm as unknown as { resetState(): void }).resetState()
      vi.advanceTimersByTime(500)
      await flushPromises()
      expect(names(wrapper)).toHaveLength(3)
      expect(
        (wrapper.get('input[aria-label="Filter Nome"]').element as HTMLInputElement).value,
      ).toBe('')
    })

    it('non applica nulla dopo lo smontaggio', async () => {
      const wrapper = mountDebounced()
      await wrapper.get('input[type="search"]').setValue('x')
      wrapper.unmount()
      expect(() => vi.advanceTimersByTime(500)).not.toThrow()
    })
  })

  describe('navigazione da tastiera', () => {
    interface P4 {
      id: number
      nome: string
      citta: string
    }
    const people: P4[] = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      nome: `P${i + 1}`,
      citta: i % 2 ? 'Roma' : 'Milano',
    }))
    const cols: ColumnDef<P4>[] = [
      { id: 'id', header: 'ID', filter: 'text' },
      { id: 'nome', header: 'Nome', filter: 'text' },
      { id: 'citta', header: 'Città', filter: 'select' },
    ]
    let wrapper: ReturnType<typeof mountGrid>
    function mountGrid(slots: Record<string, string> = {}, props: Record<string, unknown> = {}) {
      return mount(VtTable as unknown as Component, {
        attachTo: document.body,
        props: { rows: people, columns: cols, rowKey: 'id', debounce: 0, pageSize: 25, ...props },
        slots,
      })
    }
    afterEach(() => wrapper?.unmount())

    const cell = (row: number, col: number) =>
      wrapper.get(`[data-vt-row="${row}"][data-vt-col="${col}"]`)
    const focused = () => {
      const el = document.activeElement as HTMLElement | null
      return el?.dataset?.vtRow === undefined ? el : `${el.dataset.vtRow},${el.dataset.vtCol}`
    }
    async function press(row: number, col: number, key: string, init: object = {}) {
      await cell(row, col).trigger('keydown', { key, ...init })
      await flushPromises()
    }

    it('ha un solo tab stop: la cella attiva; i controlli interni non sono tabbabili', () => {
      wrapper = mountGrid()
      const stops = wrapper.findAll('[tabindex="0"]')
      expect(stops).toHaveLength(1)
      expect(stops[0]!.attributes('data-vt-row')).toBe('0')
      for (const control of wrapper.findAll('.vt-filter-cell input, .vt-filter-cell select')) {
        expect(control.attributes('tabindex')).toBe('-1')
      }
      expect(wrapper.get('.vt-sort-button').attributes('tabindex')).toBe('-1')
    })

    it('le frecce destra e sinistra si muovono tra le celle della riga dei filtri', async () => {
      wrapper = mountGrid()
      await press(1, 0, 'ArrowRight')
      expect(focused()).toBe('1,1')
      await press(1, 1, 'ArrowRight')
      expect(focused()).toBe('1,2')
      await press(1, 2, 'ArrowRight')
      expect(focused()).toBe('1,2')
      await press(1, 2, 'ArrowLeft')
      expect(focused()).toBe('1,1')
    })

    it('sposta il tab stop sulla cella raggiunta (roving tabindex)', async () => {
      wrapper = mountGrid()
      await press(1, 0, 'ArrowRight')
      expect(cell(1, 1).attributes('tabindex')).toBe('0')
      expect(cell(0, 0).attributes('tabindex')).toBe('-1')
      expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
    })

    it('le frecce su e giù attraversano intestazione, filtri e righe', async () => {
      wrapper = mountGrid()
      await press(0, 1, 'ArrowDown')
      expect(focused()).toBe('1,1')
      await press(1, 1, 'ArrowDown')
      expect(focused()).toBe('2,1')
      await press(2, 1, 'ArrowUp')
      await press(1, 1, 'ArrowUp')
      expect(focused()).toBe('0,1')
    })

    it('Home, End, Ctrl+Home, Ctrl+End e PageDown/PageUp', async () => {
      wrapper = mountGrid()
      await press(3, 1, 'End')
      expect(focused()).toBe('3,2')
      await press(3, 2, 'Home')
      expect(focused()).toBe('3,0')
      await press(3, 0, 'End', { ctrlKey: true })
      expect(focused()).toBe('16,2')
      await press(16, 2, 'Home', { ctrlKey: true })
      expect(focused()).toBe('0,0')
      await press(0, 0, 'PageDown')
      expect(focused()).toBe('10,0')
      await press(10, 0, 'PageUp')
      expect(focused()).toBe('0,0')
    })

    it('Invio entra nel controllo del filtro e le frecce funzionano nel controllo', async () => {
      wrapper = mountGrid()
      await press(1, 1, 'Enter')
      const input = wrapper.get('input[aria-label="Filter Nome"]').element
      expect(document.activeElement).toBe(input)

      const event = new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      })
      input.dispatchEvent(event)
      await flushPromises()
      expect(event.defaultPrevented).toBe(false)
      expect(document.activeElement).toBe(input)
    })

    it('F2 entra nel controllo; nel filtro a selezione porta sul select', async () => {
      wrapper = mountGrid()
      await press(1, 2, 'F2')
      expect(document.activeElement).toBe(wrapper.get('select[aria-label="Filter Città"]').element)
    })

    it('Esc torna alla cella e la navigazione riprende', async () => {
      wrapper = mountGrid()
      await press(1, 1, 'Enter')
      const input = wrapper.get('input[aria-label="Filter Nome"]')
      await input.trigger('keydown', { key: 'Escape' })
      await flushPromises()
      expect(focused()).toBe('1,1')
      await press(1, 1, 'ArrowRight')
      expect(focused()).toBe('1,2')
    })

    it('Esc applica subito il testo digitato (con debounce attivo)', async () => {
      vi.useFakeTimers()
      try {
        wrapper = mountGrid({}, { debounce: 250 })
        await press(1, 1, 'Enter')
        const input = wrapper.get('input[aria-label="Filter Nome"]')
        await input.setValue('P1')
        await input.trigger('keydown', { key: 'Escape' })
        await flushPromises()
        expect(wrapper.findAll('.vt-body [role="row"]')).toHaveLength(7)
      } finally {
        vi.useRealTimers()
      }
    })

    it('Invio o Spazio su una cella d’intestazione ordinano', async () => {
      wrapper = mountGrid()
      await press(0, 1, 'Enter')
      expect(cell(0, 1).attributes('aria-sort')).toBe('ascending')
      expect(focused()).toBe('0,1')
      await press(0, 1, ' ')
      expect(cell(0, 1).attributes('aria-sort')).toBe('descending')
    })

    it('il clic sul pulsante di ordinamento riporta il focus sulla cella', async () => {
      wrapper = mountGrid()
      await cell(0, 2).get('button').trigger('click')
      await flushPromises()
      expect(focused()).toBe('0,2')
    })

    it('Invio su una cella dati entra nel primo controllo dello slot', async () => {
      wrapper = mountGrid({
        'cell-nome':
          '<template #cell-nome="{ value }"><a href="#x" class="link">{{ value }}</a></template>',
      })
      await press(2, 1, 'Enter')
      expect(document.activeElement).toBe(cell(2, 1).get('a.link').element)
    })

    it('Invio su una cella senza controlli non fa nulla', async () => {
      wrapper = mountGrid()
      await press(2, 0, 'Enter')
      expect(document.activeElement).toBe(document.body)
    })

    it('il focus con il mouse aggiorna la cella attiva', async () => {
      wrapper = mountGrid()
      ;(cell(3, 1).element as HTMLElement).focus()
      await flushPromises()
      expect(cell(3, 1).attributes('tabindex')).toBe('0')
      expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
    })

    it('senza riga dei filtri la riga 1 è la prima riga dati', async () => {
      wrapper = mountGrid(
        {},
        {
          columns: [
            { id: 'id', header: 'ID' },
            { id: 'nome', header: 'Nome' },
          ],
        },
      )
      await press(0, 0, 'ArrowDown')
      expect(focused()).toBe('1,0')
      expect(cell(1, 0).text()).toBe('1')
    })

    it('il metodo focusCell sposta il focus', async () => {
      wrapper = mountGrid()
      ;(wrapper.vm as unknown as { focusCell(row: number, col?: number): void }).focusCell(4, 2)
      await flushPromises()
      expect(focused()).toBe('4,2')
    })

    it('se la cella attiva sparisce (meno righe) il tab stop resta valido', async () => {
      wrapper = mountGrid()
      await press(12, 0, 'End')
      await wrapper.get('input[type="search"]').setValue('P1 ')
      await flushPromises()
      expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
    })
  })
})
