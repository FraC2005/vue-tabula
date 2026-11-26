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

const rows = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, nome: `P${i + 1}` }))
const columns = [
  { id: 'id', header: 'ID', filter: 'text' },
  { id: 'nome', header: 'Nome', filter: 'text' },
]

function where(): string {
  const el = document.activeElement as HTMLElement
  return el.dataset.vtRow === undefined
    ? el.tagName.toLowerCase()
    : `${el.dataset.vtRow},${el.dataset.vtCol}`
}

// Con tastiera e focus reali: la griglia è un solo tab stop, le frecce si muovono tra le celle,
// Invio entra nel controllo, Esc ne esce.
describe('navigazione da tastiera nel browser', () => {
  it('Tab entra nella griglia, frecce tra le celle, Invio/Esc dentro e fuori dal filtro', async () => {
    wrapper = mount(VtTable as unknown as Component, {
      attachTo: document.body,
      props: { rows, columns, rowKey: 'id', debounce: 0 },
    })

    // Primo Tab: la barra di ricerca; poi il pulsante... fino alla griglia. Si arriva alla cella 0,0.
    await userEvent.tab()
    expect(where()).toBe('input')
    await userEvent.tab()
    expect(where()).toBe('0,0')

    await userEvent.keyboard('{ArrowDown}')
    expect(where()).toBe('1,0')
    await userEvent.keyboard('{ArrowRight}')
    expect(where()).toBe('1,1')

    await userEvent.keyboard('{Enter}')
    expect(where()).toBe('input')
    await userEvent.keyboard('P3')
    expect((document.activeElement as HTMLInputElement).value).toBe('P3')
    // Dentro il controllo le frecce muovono il cursore, non la cella.
    await userEvent.keyboard('{ArrowLeft}')
    expect(where()).toBe('input')

    await userEvent.keyboard('{Escape}')
    expect(where()).toBe('1,1')
    expect(wrapper.findAll('.vt-body [role="row"]')).toHaveLength(1)
    await userEvent.keyboard('{ArrowDown}')
    expect(where()).toBe('2,1')
  })

  it('un solo tab stop: Tab dalla griglia esce senza attraversare le altre celle', async () => {
    wrapper = mount(VtTable as unknown as Component, {
      attachTo: document.body,
      props: { rows, columns, rowKey: 'id', debounce: 0 },
    })
    await userEvent.tab()
    await userEvent.tab()
    expect(where()).toBe('0,0')
    await userEvent.tab()
    // Il prossimo elemento tabbabile è nella paginazione, non una cella della griglia.
    expect((document.activeElement as HTMLElement).dataset.vtRow).toBeUndefined()
  })
})
