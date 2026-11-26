import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { VtTable, usePersistentTableState } from '../../src'
import type { TableState } from '../../src'
import '../../src/styles/vue-tabula.css'

const rows = Array.from({ length: 30 }, (_, i) => ({ id: i + 1, nome: `P${i + 1}` }))
const columns = [{ id: 'nome', header: 'Nome', filter: 'text' }]
const KEY = 'vt-browser-test'

let wrapper: VueWrapper | undefined
let api: ReturnType<typeof usePersistentTableState>
beforeEach(() => localStorage.clear())
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.restoreAllMocks()
})

function mountPage() {
  const Page = defineComponent({
    setup() {
      api = usePersistentTableState(KEY)
      return () =>
        h(VtTable as never, {
          rows,
          columns,
          rowKey: 'id',
          pageSize: 10,
          debounce: 0,
          state: api.state.value,
          'onUpdate:state': (s: TableState) => (api.state.value = s),
        })
    },
  })
  wrapper = mount(Page, { attachTo: document.body })
  return wrapper
}
const visible = () =>
  wrapper!.findAll('.vt-body [role="gridcell"][aria-colindex="1"]').map((c) => c.text())
const nextPage = () => wrapper!.get('[aria-label="Next page"]').element as HTMLElement

// Con localStorage e tastiera reali: "ricaricare la pagina" = smontare e rimontare.
describe('persistenza nel browser', () => {
  it('salva in localStorage e ripristina dopo la "ricarica"', async () => {
    mountPage()
    await userEvent.click(nextPage())
    await userEvent.click(wrapper!.get('input[aria-label="Filter Nome"]').element as HTMLElement)
    await userEvent.keyboard('P')
    expect(JSON.parse(localStorage.getItem(KEY)!)).toMatchObject({ globalSearch: '', page: 1 })
    expect(JSON.parse(localStorage.getItem(KEY)!).filters).toEqual({ nome: 'P' })

    wrapper!.unmount()
    mountPage()
    await vi.waitFor(() => expect(visible()).toHaveLength(10))
    expect(
      (wrapper!.get('input[aria-label="Filter Nome"]').element as HTMLInputElement).value,
    ).toBe('P')
    await userEvent.click(nextPage())
    expect(visible()[0]).toBe('P11')
  })

  it('con localStorage pieno la tabella continua a funzionare e segnala l’errore', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    mountPage()
    await userEvent.click(wrapper!.get('input[aria-label="Filter Nome"]').element as HTMLElement)
    await userEvent.keyboard('P3')
    expect(visible()).toEqual(['P3', 'P30'])
    expect((api.error.value as DOMException).name).toBe('QuotaExceededError')
  })

  it('un valore salvato corrotto viene ignorato', async () => {
    localStorage.setItem(KEY, '{"page": ')
    mountPage()
    await vi.waitFor(() => expect(visible()).toHaveLength(10))
    expect(api.state.value).toBeUndefined()
  })
})
