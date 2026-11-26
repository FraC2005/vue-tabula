import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { h } from 'vue'
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

  it('i clic su link, pulsanti e campi dentro le celle non selezionano, nemmeno con Maiusc', async () => {
    wrapper = mount(VtTable as unknown as Component, {
      attachTo: document.body,
      props: {
        rows,
        columns: [
          { id: 'nome', header: 'Nome' },
          { id: 'azione', header: 'Azione', accessor: () => '' },
        ],
        rowKey: 'id',
        selection: 'multiple',
        searchable: false,
        pageSize: 25,
      },
      slots: {
        // preventDefault: un Maiusc+clic su un link aprirebbe una nuova finestra.
        'cell-nome': (p: { value: unknown }) =>
          h(
            'a',
            { href: '#x', class: 'lnk', onClick: (e: Event) => e.preventDefault() },
            String(p.value),
          ),
        'cell-azione': () => [
          h('button', { type: 'button', class: 'btn' }, 'x'),
          h('input', { type: 'text', class: 'campo' }),
          h('span', { role: 'button', tabindex: 0, class: 'ruolo' }, 'y'),
        ],
      },
    })
    const rowsEl = () => wrapper!.findAll('.vt-body [role="row"]')
    const selectedCount = () => wrapper!.findAll('.vt-body [aria-selected="true"]').length
    const el = (row: number, sel: string) => rowsEl()[row]!.get(sel).element as HTMLElement

    // Un'ancora per l'intervallo: la riga 1 selezionata con la checkbox.
    await userEvent.click(rowsEl()[0]!.get('input.vt-select-input').element as HTMLElement)
    expect(selectedCount()).toBe(1)

    await userEvent.keyboard('{Shift>}')
    for (const sel of ['.lnk', '.btn', '.campo', '.ruolo']) {
      await userEvent.click(el(4, sel))
      expect(selectedCount(), `Maiusc+clic su ${sel}`).toBe(1)
    }
    // Maiusc+clic su una parte non interattiva della stessa riga: l'intervallo funziona ancora.
    await userEvent.click(rowsEl()[4]!.findAll('[role="gridcell"]')[1]!.element as HTMLElement)
    await userEvent.keyboard('{/Shift}')
    expect(selectedCount()).toBe(5)

    // La checkbox di selezione resta l'eccezione: funziona anche con Maiusc.
    await userEvent.click(rowsEl()[7]!.get('input.vt-select-input').element as HTMLElement)
    expect(selectedCount()).toBe(6)
  })
})
