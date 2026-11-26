import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { Component } from 'vue'
import { VtTable } from '../../src'
import '../../src/styles/vue-tabula.css'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

const rows = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, nome: `P${i + 1}` }))
const columns = [{ id: 'nome', header: 'Nome' }]

function mountTable(props: Record<string, unknown> = {}) {
  wrapper = mount(VtTable as unknown as Component, {
    attachTo: document.body,
    props: {
      rows,
      columns,
      rowKey: 'id',
      selection: 'multiple',
      searchable: false,
      pageSize: 25,
      ...props,
    },
  })
  return wrapper
}

const selected = () =>
  wrapper!
    .findAll('.vt-body [role="row"]')
    .filter((r) => r.attributes('aria-selected') === 'true')
    .map((r) => r.get('[aria-colindex="2"]').text())

const checkbox = (i: number) =>
  wrapper!.findAll('.vt-body [role="row"]')[i]!.get('input.vt-select-input').element as HTMLElement

// Con mouse e tastiera reali: i modificatori (Maiusc, Ctrl) arrivano davvero agli eventi del browser.
describe('selezione nel browser', () => {
  it('Maiusc+clic seleziona un intervallo di righe', async () => {
    mountTable()
    await userEvent.click(checkbox(1))
    expect(selected()).toEqual(['P2'])

    await userEvent.keyboard('{Shift>}')
    await userEvent.click(checkbox(4))
    await userEvent.keyboard('{/Shift}')
    expect(selected()).toEqual(['P2', 'P3', 'P4', 'P5'])

    // Un clic senza Maiusc cambia solo quella riga.
    await userEvent.click(checkbox(3))
    expect(selected()).toEqual(['P2', 'P3', 'P5'])
  })

  it('Maiusc+clic su una cella seleziona l’intervallo senza selezionare il testo', async () => {
    mountTable({ selectionColumn: false })
    const cells = wrapper!.findAll('.vt-body [role="gridcell"]')
    await userEvent.keyboard('{Shift>}')
    await userEvent.click(cells[2]!.element as HTMLElement)
    await userEvent.click(cells[5]!.element as HTMLElement)
    await userEvent.keyboard('{/Shift}')
    const keys = wrapper!.findAll('.vt-body [aria-selected="true"]')
    expect(keys).toHaveLength(4)
    expect(window.getSelection()?.toString()).toBe('')
  })

  it('Spazio sulla cella della checkbox e Maiusc+Spazio su una cella dati', async () => {
    mountTable()
    await userEvent.tab() // prima cella dell'intestazione
    await userEvent.keyboard('{ArrowDown}') // prima riga, colonna checkbox
    expect(document.activeElement?.getAttribute('data-vt-row')).toBe('1')
    await userEvent.keyboard(' ')
    expect(selected()).toEqual(['P1'])

    await userEvent.keyboard('{ArrowRight}{ArrowDown}')
    await userEvent.keyboard('{Shift>} {/Shift}')
    expect(selected()).toEqual(['P1', 'P2'])
    // Spazio semplice su una cella dati non seleziona.
    await userEvent.keyboard(' ')
    expect(selected()).toEqual(['P1', 'P2'])
  })

  it('Ctrl+A seleziona tutte le righe e lo stato dell’intestazione diventa selezionato', async () => {
    mountTable()
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await userEvent.keyboard('{Control>}a{/Control}')
    expect(selected()).toHaveLength(12)
    const header = wrapper!.get('[role="columnheader"] input').element as HTMLInputElement
    expect(header.checked).toBe(true)
    expect(header.indeterminate).toBe(false)
    expect(window.getSelection()?.toString()).toBe('')

    await userEvent.click(checkbox(0))
    expect(header.indeterminate).toBe(true)
    expect(wrapper!.get('[role="status"]').text()).toContain('11 selected')
  })
})
