import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
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
  searchable?: boolean
  paginated?: boolean
  labels?: Record<string, unknown>
  classes?: Record<string, string>
}

// mount() di test-utils non conserva i generici dei componenti: li fissiamo qui.
function mountTable(props: TableProps, slots: Record<string, string> = {}) {
  return mount(VtTable as unknown as Component, { props: { ...props }, slots })
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
        props: { rows: people, columns: cols, rowKey: 'id' },
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
        props: { rows: people, columns: cols, rowKey: 'id' },
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
})
