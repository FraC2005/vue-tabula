import { afterEach, describe, expect, it } from 'vitest'
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

// Verifica in un vero browser (Chromium) che gli stili di default producano un layout misurabile.
describe('VtTable nel browser', () => {
  it('dispone le righe una sotto l’altra e le celle in orizzontale', () => {
    wrapper = mount(VtTable as unknown as Component, {
      attachTo: document.body,
      props: {
        rows: [
          { id: 1, nome: 'Ada' },
          { id: 2, nome: 'Linus' },
        ],
        columns: [
          { id: 'id', header: 'ID' },
          { id: 'nome', header: 'Nome' },
        ],
        rowKey: 'id',
      },
    })
    const rows = wrapper.findAll('[role="row"]').map((r) => r.element.getBoundingClientRect())
    expect(rows).toHaveLength(3)
    expect(rows[1]!.top).toBeGreaterThanOrEqual(rows[0]!.bottom - 1)
    expect(rows[2]!.top).toBeGreaterThanOrEqual(rows[1]!.bottom - 1)

    const cells = wrapper
      .findAll('[role="columnheader"]')
      .map((c) => c.element.getBoundingClientRect())
    expect(cells[1]!.left).toBeGreaterThanOrEqual(cells[0]!.right - 1)
  })
})
