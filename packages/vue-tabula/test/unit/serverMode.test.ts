/* eslint-disable vue/one-component-per-file -- i test definiscono più pagine di prova */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import type { Component } from 'vue'
import { VtTable, usePersistentTableState } from '../../src'
import type { ColumnDef, TableRequest, TableState } from '../../src'

interface Row {
  id: number
  nome: string
  citta: string
}
const columns: ColumnDef<Row>[] = [
  { id: 'nome', header: 'Nome', filter: 'text' },
  {
    id: 'citta',
    header: 'Città',
    filter: 'select',
    filterOptions: ['Roma', 'Milano'],
  },
]
/** Le righe di una pagina, come le restituirebbe un server (in ordine di id). */
const pageRows = (page: number, size = 10): Row[] =>
  Array.from({ length: size }, (_, i) => {
    const id = (page - 1) * size + i + 1
    return { id, nome: `P${id}`, citta: id % 2 ? 'Roma' : 'Milano' }
  })

let wrapper: ReturnType<typeof mountServer>
let onRequest: ReturnType<typeof vi.fn<(r: TableRequest) => void>>
beforeEach(() => {
  onRequest = vi.fn()
})
afterEach(() => wrapper?.unmount())

function mountServer(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  return mount(VtTable as unknown as Component, {
    attachTo: document.body,
    props: {
      mode: 'server',
      rows: pageRows(1),
      columns,
      rowKey: 'id',
      totalRows: 10_000,
      pageSize: 10,
      debounce: 0,
      onRequest,
      ...props,
    },
    slots: slots as never,
  })
}
const names = () =>
  wrapper.findAll('.vt-body [role="gridcell"][aria-colindex="1"]').map((c) => c.text())
const requests = () => onRequest.mock.calls.map(([r]) => r)
const lastRequest = () => requests().at(-1)!
const getState = () => (wrapper.vm as unknown as { getState(): TableState }).getState()
const settle = () => flushPromises()

describe('modo server: i dati restano al server', () => {
  it('non ordina, non filtra e non pagina: mostra rows così come arrivano', async () => {
    const unsorted: Row[] = [
      { id: 9, nome: 'Zeta', citta: 'Roma' },
      { id: 3, nome: 'Alfa', citta: 'Milano' },
      { id: 7, nome: 'Mu', citta: 'Roma' },
    ]
    wrapper = mountServer({ rows: unsorted, totalRows: 3, pageSize: 2 })
    await settle()
    expect(names()).toEqual(['Zeta', 'Alfa', 'Mu']) // 3 righe, anche con pageSize 2

    await wrapper.findAll('[role="columnheader"] button')[0]!.trigger('click')
    expect(names()).toEqual(['Zeta', 'Alfa', 'Mu'])
    await wrapper.get('input[type="search"]').setValue('zzz-nessuna')
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('Alfa')
    await wrapper.get('select[aria-label="Filter Città"]').setValue('1')
    expect(names()).toEqual(['Zeta', 'Alfa', 'Mu'])
    expect(wrapper.text()).not.toContain('No results')
  })

  it('ignora sortFn e filterFn delle colonne', async () => {
    wrapper = mountServer({
      columns: [
        { id: 'nome', header: 'Nome', filter: 'text', filterFn: () => false, sortFn: () => 1 },
      ],
    })
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('x')
    expect(names()).toHaveLength(10)
  })

  it('usa totalRows per la paginazione', async () => {
    wrapper = mountServer({ rows: pageRows(1), totalRows: 95 })
    expect(wrapper.get('[role="grid"]').attributes('aria-rowcount')).toBe('97') // 95 + intestazione + filtri
    expect(wrapper.get('[role="status"]').text()).toBe('1–10 of 95')
    expect(wrapper.text()).toContain('Page 1 of 10')
    await wrapper.get('[aria-label="Next page"]').trigger('click')
    expect(getState().page).toBe(2)
    expect(wrapper.text()).toContain('Page 2 of 10')
  })

  it('riepilogo, indici e ultima pagina con totalRows', async () => {
    wrapper = mountServer({
      rows: pageRows(10),
      totalRows: 95,
      state: { ...emptyState(), page: 10, pageSize: 10 },
    })
    await settle()
    expect(wrapper.get('[role="status"]').text()).toBe('91–100 of 95')
    expect(wrapper.text()).toContain('Page 10 of 10')
    expect(wrapper.get('[aria-label="Next page"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.vt-body [role="row"]').attributes('aria-rowindex')).toBe('93')
  })

  it('con totalRows non noto, aria-rowcount vale -1 e non si perde la pagina', async () => {
    wrapper = mountServer({ totalRows: undefined })
    expect(wrapper.get('[role="grid"]').attributes('aria-rowcount')).toBe('-1')
    await wrapper.get('[aria-label="Next page"]').trigger('click') // disabilitato: pageCount = page
    expect(getState().page).toBe(1)
  })
})

function emptyState(): TableState {
  return {
    version: 1,
    sort: [],
    filters: {},
    globalSearch: '',
    columnOrder: [],
    columnVisibility: {},
    columnWidths: {},
    pinnedLeft: [],
    page: 1,
    pageSize: 10,
  }
}

describe('modo server: evento request', () => {
  it('si emette una volta al montaggio con lo stato completo e un signal attivo', async () => {
    wrapper = mountServer()
    expect(onRequest).not.toHaveBeenCalled() // non nello stesso tick del montaggio
    await settle()
    expect(onRequest).toHaveBeenCalledTimes(1)
    const request = lastRequest()
    expect(request.state).toEqual(emptyState())
    expect(request.id).toBe(1)
    expect(request.signal).toBeInstanceOf(AbortSignal)
    expect(request.signal.aborted).toBe(false)
  })

  it('non si emette in modalità client', async () => {
    wrapper = mountServer({ mode: 'client', rows: pageRows(1, 5) })
    await wrapper.findAll('[role="columnheader"] button')[0]!.trigger('click')
    await settle()
    expect(onRequest).not.toHaveBeenCalled()
  })

  it('non si emette se la tabella viene smontata prima del primo giro', async () => {
    wrapper = mountServer()
    wrapper.unmount()
    await settle()
    expect(onRequest).not.toHaveBeenCalled()
  })

  it('a ogni modifica emette lo stato aggiornato, riportando a pagina 1 con ordinamento e filtri', async () => {
    wrapper = mountServer()
    await settle()

    await wrapper.get('[aria-label="Next page"]').trigger('click')
    expect(lastRequest().state.page).toBe(2)

    await wrapper.findAll('[role="columnheader"] button')[0]!.trigger('click')
    expect(lastRequest().state).toMatchObject({ sort: [{ columnId: 'nome', dir: 'asc' }], page: 1 })

    await wrapper.get('[aria-label="Next page"]').trigger('click')
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P1')
    expect(lastRequest().state).toMatchObject({ filters: { nome: 'P1' }, page: 1 })

    await wrapper.get('select[aria-label="Filter Città"]').setValue('0')
    expect(lastRequest().state.filters).toEqual({ nome: 'P1', citta: 'Roma' })

    await wrapper.get('input[type="search"]').setValue('ada')
    expect(lastRequest().state.globalSearch).toBe('ada')

    await wrapper.get('.vt-page-size select').setValue('50')
    expect(lastRequest().state).toMatchObject({ pageSize: 50, page: 1 })
    expect(requests().map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('il payload è un oggetto JSON semplice e non condivide riferimenti con lo stato interno', async () => {
    wrapper = mountServer()
    await settle()
    await wrapper.get('input[aria-label="Filter Nome"]').setValue('P1')
    const request = lastRequest()
    expect(JSON.parse(JSON.stringify(request.state))).toEqual(request.state)
    request.state.filters.nome = 'manomesso'
    expect(getState().filters.nome).toBe('P1')
  })

  it('una modifica che non cambia i dati (ordine/visibilità colonne) non fa richieste', async () => {
    wrapper = mountServer({ 'onUpdate:state': (s: TableState) => wrapper.setProps({ state: s }) })
    await settle()
    expect(onRequest).toHaveBeenCalledTimes(1)
    await wrapper.setProps({
      state: { ...getState(), columnOrder: ['citta', 'nome'], columnVisibility: { citta: false } },
    })
    await settle()
    expect(onRequest).toHaveBeenCalledTimes(1)
  })

  it('più modifiche nello stesso tick si fondono in una sola richiesta', async () => {
    wrapper = mountServer({ debounce: 250 })
    await settle()
    vi.useFakeTimers()
    try {
      const search = wrapper.get('input[type="search"]')
      const nome = wrapper.get('input[aria-label="Filter Nome"]')
      await search.setValue('a')
      await nome.setValue('b')
      // Un clic sull'intestazione applica subito le bozze e ordina: tutto nello stesso tick.
      await wrapper.findAll('[role="columnheader"] button')[0]!.trigger('click')
      expect(requests()).toHaveLength(2)
      expect(lastRequest().state).toMatchObject({
        globalSearch: 'a',
        filters: { nome: 'b' },
        sort: [{ columnId: 'nome', dir: 'asc' }],
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('applica il debounce a ricerca e filtri di testo/numerici, non a ordinamento e selezioni', async () => {
    wrapper = mountServer({ debounce: 250 })
    await settle()
    vi.useFakeTimers()
    try {
      await wrapper.get('input[type="search"]').setValue('a')
      await wrapper.get('input[type="search"]').setValue('ad')
      await wrapper.get('input[aria-label="Filter Nome"]').setValue('P')
      expect(requests()).toHaveLength(1)
      vi.advanceTimersByTime(249)
      await flushPromises()
      expect(requests()).toHaveLength(1)
      vi.advanceTimersByTime(1)
      await flushPromises()
      expect(requests()).toHaveLength(2) // ricerca e filtro scadono insieme: una richiesta
      expect(lastRequest().state).toMatchObject({ globalSearch: 'ad', filters: { nome: 'P' } })

      await wrapper.get('select[aria-label="Filter Città"]').setValue('1')
      expect(requests()).toHaveLength(3)
      await wrapper.get('[aria-label="Next page"]').trigger('click')
      expect(requests()).toHaveLength(4)
    } finally {
      vi.useRealTimers()
    }
  })

  it('refresh() rimanda la richiesta con lo stesso stato, annullando la precedente', async () => {
    wrapper = mountServer()
    await settle()
    ;(wrapper.vm as unknown as { refresh(): void }).refresh()
    expect(requests()).toHaveLength(2)
    expect(requests()[1]!.state).toEqual(requests()[0]!.state)
    expect(requests()[0]!.signal.aborted).toBe(true)
    expect(requests()[1]!.signal.aborted).toBe(false)
  })

  it('passando da client a server emette; tornando a client annulla', async () => {
    wrapper = mountServer({ mode: 'client' })
    await settle()
    await wrapper.setProps({ mode: 'server' })
    expect(requests()).toHaveLength(1)
    await wrapper.setProps({ mode: 'client' })
    expect(requests()[0]!.signal.aborted).toBe(true)
  })
})

describe('modo server: risposte fuori ordine', () => {
  it('annulla il signal della richiesta precedente quando ne parte una nuova', async () => {
    wrapper = mountServer()
    await settle()
    await wrapper.get('[aria-label="Next page"]').trigger('click')
    await wrapper.get('[aria-label="Next page"]').trigger('click')
    const [first, second, third] = requests()
    expect(first!.signal.aborted).toBe(true)
    expect(second!.signal.aborted).toBe(true)
    expect(third!.signal.aborted).toBe(false)
    expect(third!.id).toBeGreaterThan(second!.id)
  })

  it('annulla l’ultima richiesta allo smontaggio', async () => {
    wrapper = mountServer()
    await settle()
    const { signal } = lastRequest()
    wrapper.unmount()
    expect(signal.aborted).toBe(true)
  })

  it('un genitore che controlla signal.aborted ignora la risposta vecchia anche se arriva per ultima', async () => {
    // Come nella documentazione: ogni risposta viene scartata se nel frattempo è partita
    // una richiesta più recente, anche quando l'API non rispetta il signal.
    const waiting: { request: TableRequest; resolve: (page: number) => void }[] = []
    const Page = defineComponent({
      data: () => ({ rows: pageRows(1), loading: false, error: null as unknown }),
      methods: {
        async load(request: TableRequest) {
          this.loading = true
          const page = await new Promise<number>((resolve) => waiting.push({ request, resolve }))
          if (request.signal.aborted) return // risposta vecchia
          this.rows = pageRows(page)
          this.loading = false
        },
      },
      render() {
        return h(VtTable as never, {
          mode: 'server',
          rows: this.rows,
          columns,
          rowKey: 'id',
          totalRows: 10_000,
          loading: this.loading,
          pageSize: 10,
          debounce: 0,
          onRequest: (r: TableRequest) => void this.load(r),
        })
      },
    })
    const page = mount(Page, { attachTo: document.body })
    await settle()
    const shown = () =>
      page.findAll('.vt-body [role="gridcell"][aria-colindex="1"]').map((c) => c.text())
    const next = () => page.get('[aria-label="Next page"]').trigger('click')

    await next() // → pagina 2 (lenta)
    await next() // → pagina 3 (veloce)
    expect(waiting.map((w) => w.request.state.page)).toEqual([1, 2, 3])

    waiting[2]!.resolve(3) // arriva prima la più recente…
    await settle()
    expect(shown()[0]).toBe('P21')
    expect(page.get('[role="grid"]').attributes('aria-busy')).toBeUndefined()

    waiting[1]!.resolve(2) // …poi quella vecchia: non deve sovrascrivere
    waiting[0]!.resolve(1)
    await settle()
    expect(shown()[0]).toBe('P21')
    expect(page.get('[role="grid"]').attributes('aria-busy')).toBeUndefined()
    page.unmount()
  })

  it('un contatore di richieste (id) è un’alternativa equivalente a signal.aborted', async () => {
    wrapper = mountServer()
    await settle()
    await wrapper.get('[aria-label="Next page"]').trigger('click')
    const [first, second] = requests()
    let latest = 0
    const accepted: number[] = []
    // Il genitore ricorda l'id più recente e scarta le risposte con id minore.
    for (const r of [first!, second!]) latest = Math.max(latest, r.id)
    for (const r of [second!, first!]) if (r.id === latest) accepted.push(r.id)
    expect(accepted).toEqual([second!.id])
  })
})

describe('modo server: loading', () => {
  it('aria-busy, indicatore e righe precedenti ancora visibili', async () => {
    wrapper = mountServer({ loading: true })
    expect(wrapper.get('[role="grid"]').attributes('aria-busy')).toBe('true')
    expect(wrapper.find('.vt-loading').exists()).toBe(true)
    expect(wrapper.find('.vt-loading').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.vt-root').attributes('data-loading')).toBeDefined()
    expect(names()).toHaveLength(10) // le righe precedenti restano
  })

  it('annuncia il caricamento nel role="status"', async () => {
    wrapper = mountServer({ loading: false })
    const live = () => wrapper.findAll('[role="status"]').at(-1)!.text()
    expect(live()).toBe('')
    await wrapper.setProps({ loading: true })
    expect(live()).toBe('Loading…')
    await wrapper.setProps({ loading: false })
    expect(live()).toBe('')
    expect(wrapper.get('[role="grid"]').attributes('aria-busy')).toBeUndefined()
  })

  it('senza righe e in caricamento mostra “Loading…” e non “No results”', async () => {
    wrapper = mountServer({ rows: [], totalRows: undefined, loading: true })
    expect(wrapper.get('.vt-empty').text()).toBe('Loading…')
    await wrapper.setProps({ loading: false, totalRows: 0 })
    expect(wrapper.get('.vt-empty').text()).toBe('No results')
  })

  it('lo slot loading sostituisce l’indicatore di default', () => {
    wrapper = mountServer(
      { loading: true },
      { loading: () => h('span', { class: 'mio-spinner' }, '...') },
    )
    expect(wrapper.find('.mio-spinner').exists()).toBe(true)
    expect(wrapper.find('.vt-loading-bar').exists()).toBe(false)
  })

  it('funziona anche in modalità client', () => {
    wrapper = mountServer({ mode: 'client', loading: true })
    expect(wrapper.get('[role="grid"]').attributes('aria-busy')).toBe('true')
  })

  it('le etichette sono sostituibili', async () => {
    wrapper = mountServer({ loading: true, labels: { loading: 'Caricamento…' } })
    expect(wrapper.findAll('[role="status"]').at(-1)!.text()).toBe('Caricamento…')
  })
})

describe('modo server: error', () => {
  it('mostra il messaggio con role="alert" e le righe precedenti restano visibili', () => {
    wrapper = mountServer({ error: new Error('500') })
    expect(wrapper.get('[role="alert"]').text()).toContain('Could not load the data')
    expect(names()).toHaveLength(10)
  })

  it('nessun errore: nessun avviso', () => {
    wrapper = mountServer({ error: null })
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('Retry rimanda la richiesta con lo stato corrente', async () => {
    wrapper = mountServer({ error: new Error('x') })
    await settle()
    await wrapper.get('.vt-retry').trigger('click')
    expect(requests()).toHaveLength(2)
    expect(requests()[1]!.state).toEqual(requests()[0]!.state)
    expect(requests()[0]!.signal.aborted).toBe(true)
  })

  it('lo slot error riceve error e retry', async () => {
    const failure = new Error('timeout')
    wrapper = mountServer(
      { error: failure },
      {
        error: ({ error, retry }: { error: unknown; retry: () => void }) =>
          h('button', { class: 'mio-retry', onClick: retry }, (error as Error).message),
      },
    )
    await settle()
    expect(wrapper.get('.mio-retry').text()).toBe('timeout')
    await wrapper.get('.mio-retry').trigger('click')
    expect(requests()).toHaveLength(2)
  })

  it('annuncia l’errore nel role="status" e in client non mostra Retry', async () => {
    wrapper = mountServer({ mode: 'client', rows: pageRows(1, 3), error: 'boom' })
    expect(wrapper.find('.vt-retry').exists()).toBe(false)
    expect(wrapper.findAll('[role="status"]').at(-1)!.text()).toBe('Could not load the data')
  })
})

describe('modo server: filterOptions obbligatorio per i filtri a selezione', () => {
  const noOptions: ColumnDef<Row>[] = [
    { id: 'nome', header: 'Nome' },
    { id: 'citta', header: 'Città', filter: 'select' },
  ]
  let warn: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warn.mockRestore()
    vi.unstubAllEnvs()
  })

  it('avvisa in sviluppo, una sola volta per colonna, e il filtro resta senza voci', async () => {
    wrapper = mountServer({ columns: noOptions })
    await wrapper.setProps({ rows: pageRows(2) }) // un nuovo rendering non ripete l'avviso
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]![0])).toContain('"citta"')
    expect(String(warn.mock.calls[0]![0])).toContain('filterOptions')
    // Niente voci ricavate dalle righe: solo «All».
    expect(wrapper.get('select[aria-label="Filter Città"]').findAll('option')).toHaveLength(1)
  })

  it('non avvisa se filterOptions è dichiarato, e usa solo quelle voci', () => {
    wrapper = mountServer()
    expect(warn).not.toHaveBeenCalled()
    expect(
      wrapper
        .get('select[aria-label="Filter Città"]')
        .findAll('option')
        .map((o) => o.text()),
    ).toEqual(['All', 'Roma', 'Milano'])
  })

  it('non avvisa in modalità client (le opzioni si ricavano dalle righe)', () => {
    wrapper = mountServer({ mode: 'client', columns: noOptions, rows: pageRows(1, 4) })
    expect(warn).not.toHaveBeenCalled()
    expect(wrapper.get('select[aria-label="Filter Città"]').findAll('option')).toHaveLength(3)
  })

  it('non avvisa in produzione', () => {
    vi.stubEnv('NODE_ENV', 'production')
    wrapper = mountServer({ columns: noOptions })
    expect(warn).not.toHaveBeenCalled()
  })

  it('avvisa se si passa a server dopo il montaggio', async () => {
    wrapper = mountServer({ mode: 'client', columns: noOptions })
    expect(warn).not.toHaveBeenCalled()
    await wrapper.setProps({ mode: 'server' })
    expect(warn).toHaveBeenCalledTimes(1)
  })
})

describe('modo server: selezione solo sulla pagina corrente', () => {
  const selectedKeys = () => wrapper.emitted('update:selected')?.at(-1)?.[0] as number[] | undefined
  const header = () => wrapper.get('[role="columnheader"] input.vt-select-input')
  const box = (i: number) => wrapper.findAll('.vt-body input.vt-select-input')[i]!
  const mountSelectable = (extra: Record<string, unknown> = {}) =>
    mountServer({
      selection: 'multiple',
      selected: [],
      'onUpdate:selected': (k: number[]) => wrapper.setProps({ selected: k }),
      ...extra,
    })

  it('la checkbox dell’intestazione seleziona solo le righe della pagina', async () => {
    wrapper = mountSelectable()
    await header().trigger('click')
    expect(selectedKeys()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect((header().element as HTMLInputElement).checked).toBe(true)
    await header().trigger('click')
    expect(selectedKeys()).toEqual([])
  })

  it('Ctrl/Cmd+A seleziona solo le righe della pagina', async () => {
    wrapper = mountSelectable()
    await wrapper
      .get('[data-vt-row="2"][data-vt-col="1"]')
      .trigger('keydown', { key: 'a', ctrlKey: true })
    expect(selectedKeys()).toHaveLength(10)
    await wrapper.setProps({ selected: [] })
    await wrapper
      .get('[data-vt-row="2"][data-vt-col="1"]')
      .trigger('keydown', { key: 'a', metaKey: true })
    expect(selectedKeys()).toHaveLength(10)
  })

  it('le chiavi di altre pagine restano selezionate e contate, e l’intestazione guarda la pagina', async () => {
    wrapper = mountSelectable({ selected: [101, 102, 103], rows: pageRows(1) })
    const indeterminate = () => (header().element as HTMLInputElement).indeterminate
    expect(indeterminate()).toBe(false) // nessuna riga della pagina corrente è selezionata
    expect((header().element as HTMLInputElement).checked).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toBe('1–10 of 10000 · 3 selected')

    await box(0).trigger('click')
    expect(indeterminate()).toBe(true) // calcolato sulla pagina
    await header().trigger('click') // seleziona il resto della pagina
    expect(selectedKeys()).toEqual([101, 102, 103, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect((header().element as HTMLInputElement).checked).toBe(true)
    await header().trigger('click') // toglie solo la pagina corrente
    expect(selectedKeys()).toEqual([101, 102, 103])
  })

  it('cambiando pagina l’intestazione e il conteggio si riferiscono alla nuova pagina', async () => {
    wrapper = mountSelectable()
    await header().trigger('click')
    await wrapper.setProps({ rows: pageRows(2) })
    expect((header().element as HTMLInputElement).checked).toBe(false)
    expect((header().element as HTMLInputElement).indeterminate).toBe(false)
    expect(wrapper.get('[role="status"]').text()).toContain('10 selected')
  })

  it('Maiusc+clic seleziona l’intervallo dentro la pagina', async () => {
    wrapper = mountSelectable()
    await box(2).trigger('click')
    await box(5).trigger('click', { shiftKey: true })
    expect(selectedKeys()).toEqual([3, 4, 5, 6])
  })

  it('Maiusc+clic con ancora in un’altra pagina seleziona solo la riga cliccata', async () => {
    wrapper = mountSelectable({ rows: pageRows(1) })
    await box(1).trigger('click')
    await wrapper.setProps({ rows: pageRows(2) })
    await box(4).trigger('click', { shiftKey: true })
    expect(selectedKeys()).toEqual([2, 15])
  })
})

describe('modo server: stato e ripristino', () => {
  const restored = (page: number): TableState => ({
    ...emptyState(),
    page,
    filters: { nome: 'P' },
    sort: [{ columnId: 'nome', dir: 'desc' }],
  })

  it('il ripristino non riporta la pagina a 1 prima che arrivi totalRows', async () => {
    wrapper = mountServer({ rows: [], totalRows: undefined, loading: true, state: restored(7) })
    await settle()
    expect(getState().page).toBe(7)
    expect(lastRequest().state).toMatchObject({ page: 7, filters: { nome: 'P' } })
    // totalRows = 0 durante il caricamento (valore iniziale tipico): ancora nessuna correzione.
    await wrapper.setProps({ totalRows: 0 })
    await settle()
    expect(getState().page).toBe(7)
    // Con un totale che contiene la pagina, resta dov'è.
    await wrapper.setProps({ rows: pageRows(7), totalRows: 95, loading: false })
    await settle()
    expect(getState().page).toBe(7)
    expect(requests()).toHaveLength(1)
  })

  it('con un totale stantio durante il caricamento non corregge la pagina', async () => {
    wrapper = mountServer({ rows: pageRows(1), totalRows: 20, loading: true, state: restored(7) })
    await settle()
    expect(getState().page).toBe(7)
  })

  it('finito il caricamento, una pagina oltre l’ultima scende all’ultima (non alla prima)', async () => {
    wrapper = mountServer({ rows: [], totalRows: undefined, loading: true, state: restored(7) })
    await settle()
    await wrapper.setProps({ rows: pageRows(3), totalRows: 25, loading: false })
    await settle()
    expect(getState().page).toBe(3)
    expect(lastRequest().state.page).toBe(3) // e rilegge i dati dell'ultima pagina
    expect(requests()).toHaveLength(2)
  })

  it('v-model:state funziona: emette update:state e ripassare lo stato non fa richieste doppie', async () => {
    wrapper = mountServer({ 'onUpdate:state': (s: TableState) => wrapper.setProps({ state: s }) })
    await settle()
    await wrapper.get('[aria-label="Next page"]').trigger('click')
    await settle()
    expect(requests()).toHaveLength(2)
    expect((wrapper.props() as { state?: TableState }).state?.page).toBe(2)
  })

  it('un nuovo stato dal genitore genera una sola richiesta e annulla la precedente', async () => {
    wrapper = mountServer()
    await settle()
    await wrapper.setProps({ state: restored(2) })
    expect(requests()).toHaveLength(2)
    expect(requests()[0]!.signal.aborted).toBe(true)
    expect(lastRequest().state).toMatchObject({ page: 2, filters: { nome: 'P' } })
  })

  it('rispetta pageSize e totalRows quando lo stato viene da JSON malformato', async () => {
    wrapper = mountServer({ state: { page: 'x', pageSize: 7, sort: 'no', filters: 5 } })
    await settle()
    expect(lastRequest().state).toMatchObject({ page: 1, pageSize: 10, sort: [], filters: {} })
  })

  it('con usePersistentTableState la prima richiesta usa già lo stato salvato (una sola)', async () => {
    const stored = JSON.stringify({ ...emptyState(), page: 4, globalSearch: 'ada' })
    const storage = {
      getItem: vi.fn(() => stored),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    }
    const Page = defineComponent({
      setup() {
        const { state } = usePersistentTableState('server-table', { storage })
        return () =>
          h(VtTable as never, {
            mode: 'server',
            rows: [],
            columns,
            rowKey: 'id',
            totalRows: undefined,
            pageSize: 10,
            debounce: 0,
            state: state.value,
            'onUpdate:state': (s: TableState) => (state.value = s),
            onRequest,
          })
      },
    })
    const page = mount(Page, { attachTo: document.body })
    await settle()
    expect(onRequest).toHaveBeenCalledTimes(1)
    expect(lastRequest().state).toMatchObject({ page: 4, globalSearch: 'ada' })
    expect(lastRequest().signal.aborted).toBe(false)
    page.unmount()
  })

  it('la ricerca globale e i filtri si ripristinano nei controlli', async () => {
    wrapper = mountServer({ state: { ...restored(2), globalSearch: 'ada' } })
    await settle()
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('ada')
    expect((wrapper.get('input[aria-label="Filter Nome"]').element as HTMLInputElement).value).toBe(
      'P',
    )
    expect(wrapper.findAll('[role="columnheader"]')[0]!.attributes('aria-sort')).toBe('descending')
  })
})
