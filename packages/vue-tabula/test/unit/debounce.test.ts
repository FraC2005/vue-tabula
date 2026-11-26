import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDebouncer } from '../../src/core/debounce'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createDebouncer', () => {
  it('esegue l’azione dopo il ritardo', () => {
    const d = createDebouncer()
    const fn = vi.fn()
    d.schedule('a', fn, 250)
    vi.advanceTimersByTime(249)
    expect(fn).not.toHaveBeenCalled()
    expect(d.hasPending()).toBe(true)
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(d.hasPending()).toBe(false)
  })

  it('una nuova pianificazione con la stessa chiave riparte da zero', () => {
    const d = createDebouncer()
    const fn = vi.fn()
    d.schedule('a', fn, 100)
    vi.advanceTimersByTime(80)
    d.schedule('a', fn, 100)
    vi.advanceTimersByTime(80)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(20)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('chiavi diverse sono indipendenti', () => {
    const d = createDebouncer()
    const a = vi.fn()
    const b = vi.fn()
    d.schedule('a', a, 100)
    d.schedule('b', b, 200)
    vi.advanceTimersByTime(100)
    expect(a).toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
  })

  it('con ritardo 0 (o negativo) esegue subito e annulla l’azione in attesa', () => {
    const d = createDebouncer()
    const late = vi.fn()
    const now = vi.fn()
    d.schedule('a', late, 100)
    d.schedule('a', now, 0)
    expect(now).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(200)
    expect(late).not.toHaveBeenCalled()
  })

  it('flush esegue subito le azioni in attesa, una volta sola', () => {
    const d = createDebouncer()
    const a = vi.fn()
    const b = vi.fn()
    d.schedule('a', a, 100)
    d.schedule('b', b, 100)
    d.flush('a')
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).not.toHaveBeenCalled()
    d.flush()
    vi.advanceTimersByTime(500)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('cancel annulla senza eseguire', () => {
    const d = createDebouncer()
    const a = vi.fn()
    const b = vi.fn()
    d.schedule('a', a, 100)
    d.schedule('b', b, 100)
    d.cancel('a')
    d.cancel()
    vi.advanceTimersByTime(500)
    expect(a).not.toHaveBeenCalled()
    expect(b).not.toHaveBeenCalled()
    expect(d.hasPending()).toBe(false)
  })
})
