/* eslint-disable vue/one-component-per-file -- i test definiscono più pagine di prova */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { VtTable, usePersistentTableState } from '../../src'
import type { ColumnDef, PersistentTableStateOptions, TableState } from '../../src'

interface Row {
  id: number
  nome: string
}
const rows: Row[] = Array.from({ length: 25 }, (_, i) => ({ id: i + 1, nome: `P${i + 1}` }))
const columns: ColumnDef<Row>[] = [{ id: 'nome', header: 'Nome', filter: 'text' }]

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: vi.fn((k: string) => data.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void data.set(k, v)),
    removeItem: vi.fn((k: string) => void data.delete(k)),
  }
}

/** Una pagina con tabella + composable, come nell'esempio della documentazione. */
function mountPage(key: string, options: PersistentTableStateOptions = {}) {
  let api!: ReturnType<typeof usePersistentTableState>
  const Page = defineComponent({
    setup() {
      api = usePersistentTableState(key, options)
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
  const wrapper = mount(Page, { attachTo: document.body })
  return { wrapper, api }
}
const names = (w: ReturnType<typeof mountPage>['wrapper']) =>
  w.findAll('.vt-body [role="gridcell"][aria-colindex="1"]').map((c) => c.text())

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
afterEach(() => vi.restoreAllMocks())

describe('usePersistentTableState', () => {
  it('salva ogni cambio e ripristina al ricaricamento (localStorage)', async () => {
    const first = mountPage('t1')
    await first.wrapper.get('input[aria-label="Filter Nome"]').setValue('P2')
    await first.wrapper
      .get('[aria-label="Next page"]')
      .trigger('click')
      .catch(() => {})
    const saved = JSON.parse(localStorage.getItem('t1')!) as TableState
    expect(saved.filters).toEqual({ nome: 'P2' })
    first.wrapper.unmount()

    // «Ricarica la pagina»: nuovo montaggio, stesso storage.
    const second = mountPage('t1')
    await flushPromises()
    expect(names(second.wrapper)).toHaveLength(7)
    expect(
      (second.wrapper.get('input[aria-label="Filter Nome"]').element as HTMLInputElement).value,
    ).toBe('P2')
    second.wrapper.unmount()
  })

  it('usa sessionStorage con storage: "session"', async () => {
    const { wrapper } = mountPage('t2', { storage: 'session' })
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P3')
    expect(sessionStorage.getItem('t2')).toContain('P3')
    expect(localStorage.getItem('t2')).toBeNull()
    wrapper.unmount()
  })

  it('accetta un oggetto compatibile con Storage', async () => {
    const storage = fakeStorage()
    const { wrapper } = mountPage('t3', { storage })
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P4')
    expect(storage.setItem).toHaveBeenCalledWith('t3', expect.stringContaining('P4'))
    wrapper.unmount()
  })

  it('legge lo storage dopo il montaggio, non durante setup', async () => {
    const storage = fakeStorage()
    const order: string[] = []
    storage.getItem.mockImplementation((k) => {
      order.push(`get ${k}`)
      return null
    })
    let setupDone = false
    const Page = defineComponent({
      setup() {
        usePersistentTableState('t4', { storage })
        expect(storage.getItem).not.toHaveBeenCalled()
        setupDone = true
        return () => h('div')
      },
    })
    mount(Page)
    expect(setupDone).toBe(true)
    expect(order).toEqual(['get t4'])
  })

  it('ignora un valore salvato che non è JSON valido o non è un oggetto', async () => {
    for (const bad of ['{', 'null', '42', '"x"', '[1,2]', '']) {
      const storage = fakeStorage({ k: bad })
      const { wrapper, api } = mountPage('k', { storage })
      await flushPromises()
      expect(names(wrapper)).toHaveLength(10)
      expect(api.state.value).toBeUndefined()
      wrapper.unmount()
    }
  })

  it('uno stato salvato malformato ma oggetto viene validato dalla tabella', async () => {
    const storage = fakeStorage({
      k: JSON.stringify({ version: 1, page: 99, filters: { nome: 'P1', zzz: 'x' }, estranea: 1 }),
    })
    const { wrapper, api } = mountPage('k', { storage })
    await flushPromises()
    // P1, P10-P19: 11 righe → 2 pagine, e la pagina 99 viene riportata alla 2 (con 1 riga).
    expect(names(wrapper)).toEqual(['P19'])
    expect(api.state.value).toMatchObject({ page: 2, filters: { nome: 'P1' } })
    expect(api.state.value).not.toHaveProperty('estranea')
    wrapper.unmount()
  })

  it('storage disabilitato (getItem lancia): nessuna eccezione e errore esposto', async () => {
    const storage = fakeStorage()
    storage.getItem.mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const { wrapper, api } = mountPage('k', { storage })
    await flushPromises()
    expect(api.error.value).toBeInstanceOf(DOMException)
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P1')
    expect(names(wrapper).length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('storage pieno (setItem lancia): la tabella continua a funzionare', async () => {
    const storage = fakeStorage()
    storage.setItem.mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const { wrapper, api } = mountPage('k', { storage })
    await expect(
      wrapper.get('input[aria-label="Filter Nome"]').setValue('P24'),
    ).resolves.not.toThrow()
    expect(names(wrapper)).toEqual(['P24'])
    expect((api.error.value as DOMException).name).toBe('QuotaExceededError')
    // Se poi la scrittura riesce, l'errore si azzera.
    storage.setItem.mockImplementation((k, v) => void storage.data.set(k, v))
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P23')
    expect(api.error.value).toBeNull()
    wrapper.unmount()
  })

  it('window.localStorage che lancia all’accesso (cookie bloccati) non rompe nulla', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError')
    })
    const { wrapper } = mountPage('k')
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P24')
    expect(names(wrapper)).toEqual(['P24'])
    wrapper.unmount()
  })

  it('reset dimentica lo stato salvato e riporta la tabella ai valori iniziali', async () => {
    const { wrapper, api } = mountPage('t5')
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P24')
    expect(localStorage.getItem('t5')).toContain('P24')
    api.reset()
    await flushPromises()
    expect(names(wrapper)).toHaveLength(10)
    // Il componente riporta i default e lo stato torna a essere salvato: ma senza il filtro.
    expect(localStorage.getItem('t5') ?? '').not.toContain('P24')
    wrapper.unmount()
  })

  it('più chiavi sono indipendenti', async () => {
    const a = mountPage('chiave-a')
    const b = mountPage('chiave-b')
    await a.wrapper.get('input[aria-label="Filter Nome"]').setValue('P5')
    await nextTick()
    expect(localStorage.getItem('chiave-b')).toBeNull()
    a.wrapper.unmount()
    b.wrapper.unmount()
  })
})

describe('usePersistentTableState: SSR', () => {
  it('sul server non tocca window né lo storage e la tabella si rende con i default', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem')
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    vi.stubGlobal('window', undefined)
    try {
      let api!: ReturnType<typeof usePersistentTableState>
      const Page = defineComponent({
        setup() {
          api = usePersistentTableState('ssr')
          return () => h(VtTable as never, { rows, columns, rowKey: 'id', pageSize: 10 })
        },
      })
      const html = await renderToString(createSSRApp(Page))
      expect(html).toContain('role="grid"')
      expect(html).toContain('P10')
      expect(html).not.toContain('P11')
      expect(api.state.value).toBeUndefined()
      expect(getItem).not.toHaveBeenCalled()
      expect(setItem).not.toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('anche con window assente, reset non lancia', () => {
    vi.stubGlobal('window', undefined)
    try {
      let api!: ReturnType<typeof usePersistentTableState>
      const Page = defineComponent({
        setup() {
          api = usePersistentTableState('ssr2')
          return () => h('div')
        },
      })
      void renderToString(createSSRApp(Page))
      expect(() => api.reset()).not.toThrow()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
