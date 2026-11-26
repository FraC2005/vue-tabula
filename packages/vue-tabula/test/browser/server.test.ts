import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { VtTable } from '../../src'
import type { TableRequest } from '../../src'
import '../../src/styles/vue-tabula.css'

interface Row {
  id: number
  nome: string
}
const columns = [{ id: 'nome', header: 'Nome' }]
const pageRows = (page: number): Row[] =>
  Array.from({ length: 10 }, (_, i) => {
    const id = (page - 1) * 10 + i + 1
    return { id, nome: `P${id}` }
  })

/** API finta con latenza reale: la pagina 2 è lenta, le altre veloci. Rispetta il signal. */
function fakeFetch(page: number, signal: AbortSignal, honorSignal = true): Promise<Row[]> {
  const delay = page === 2 ? 250 : 20
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(pageRows(page)), delay)
    if (honorSignal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('annullata', 'AbortError'))
      })
    }
  })
}

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

/** Una pagina con la tabella in modalità server; `careful` decide se scartare le risposte vecchie. */
function mountPage(careful: boolean) {
  const log: string[] = []
  const Page = defineComponent({
    data: () => ({ rows: [] as Row[], loading: false }),
    methods: {
      async load({ state, signal, id }: TableRequest) {
        this.loading = true
        try {
          // Se `careful` è falso l'API ignora il signal e nessuno controlla `aborted`.
          const rows = await fakeFetch(state.page, signal, careful)
          if (careful && signal.aborted) return
          this.rows = rows
          log.push(`richiesta ${id}: pagina ${state.page} mostrata`)
        } catch (e) {
          if (careful && signal.aborted) return // AbortError: previsto, nessun errore da mostrare
          throw e
        } finally {
          if (!careful || !signal.aborted) this.loading = false
        }
      },
    },
    render() {
      return h(VtTable as never, {
        mode: 'server',
        rows: this.rows,
        columns,
        rowKey: 'id',
        totalRows: 100,
        loading: this.loading,
        pageSize: 10,
        searchable: false,
        debounce: 0,
        onRequest: (r: TableRequest) => void this.load(r),
      })
    },
  })
  wrapper = mount(Page, { attachTo: document.body })
  return log
}
const shown = () =>
  wrapper!.findAll('.vt-body [role="gridcell"][aria-colindex="1"]').map((c) => c.text())
const next = () => wrapper!.get('[aria-label="Next page"]').element as HTMLElement
const prev = () => wrapper!.get('[aria-label="Previous page"]').element as HTMLElement

describe('modalità server nel browser: risposte fuori ordine', () => {
  it('con signal.aborted la risposta lenta e vecchia non sovrascrive quella recente', async () => {
    const log = mountPage(true)
    await vi.waitFor(() => expect(shown()[0]).toBe('P1'))

    await userEvent.click(next()) // pagina 2: risposta lenta (250 ms)
    await userEvent.click(next()) // pagina 3: risposta veloce (20 ms)
    expect(wrapper!.get('[role="grid"]').attributes('aria-busy')).toBe('true')

    await vi.waitFor(() => expect(shown()[0]).toBe('P21'))
    // Si aspetta più della risposta lenta: la pagina 2 non deve comparire.
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(shown()[0]).toBe('P21')
    expect(wrapper!.get('[role="grid"]').attributes('aria-busy')).toBeUndefined()
    expect(log.some((l) => l.includes('pagina 2'))).toBe(false)
  })

  it('senza alcun controllo, invece, la risposta vecchia vince (il problema è reale)', async () => {
    const log = mountPage(false)
    await vi.waitFor(() => expect(shown()[0]).toBe('P1'))

    await userEvent.click(next())
    await userEvent.click(next())
    await vi.waitFor(() => expect(shown()[0]).toBe('P21'))
    await vi.waitFor(() => expect(shown()[0]).toBe('P11'), { timeout: 1000 }) // la pagina 2, in ritardo
    expect(wrapper!.text()).toContain('Page 3 of 10') // ...mentre l'interfaccia dice pagina 3
    expect(log.at(-1)).toContain('pagina 2')
  })

  it('un clic che torna indietro annulla davvero la richiesta lenta', async () => {
    mountPage(true)
    await vi.waitFor(() => expect(shown()[0]).toBe('P1'))
    await userEvent.click(next()) // pagina 2 (lenta)
    await userEvent.click(prev()) // di nuovo pagina 1 (veloce)
    await vi.waitFor(() => expect(shown()[0]).toBe('P1'))
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(shown()[0]).toBe('P1')
    expect(wrapper!.text()).toContain('Page 1 of 10')
  })

  it('le righe precedenti restano visibili durante il caricamento', async () => {
    mountPage(true)
    await vi.waitFor(() => expect(shown()[0]).toBe('P1'))
    await userEvent.click(next()) // lenta
    expect(wrapper!.get('[role="grid"]').attributes('aria-busy')).toBe('true')
    expect(shown()[0]).toBe('P1') // ancora le righe della pagina 1
    expect(wrapper!.get('.vt-loading').isVisible()).toBe(true)
    await vi.waitFor(() => expect(shown()[0]).toBe('P11'))
    expect(wrapper!.find('.vt-loading').exists()).toBe(false)
  })

  it('l’AbortError della richiesta annullata non appare come errore', async () => {
    mountPage(true)
    await vi.waitFor(() => expect(shown()[0]).toBe('P1'))
    await userEvent.click(next())
    await userEvent.click(next())
    await vi.waitFor(() => expect(shown()[0]).toBe('P21'))
    expect(wrapper!.find('[role="alert"]').exists()).toBe(false)
  })
})
