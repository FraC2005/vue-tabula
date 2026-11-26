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
})
