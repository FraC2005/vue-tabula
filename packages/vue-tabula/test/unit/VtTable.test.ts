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
})
