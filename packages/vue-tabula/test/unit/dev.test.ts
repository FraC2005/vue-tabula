import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

// Si compila src/core/dev.ts e lo si esegue in un contesto isolato, dove `process` può essere
// davvero non definito (un ReferenceError vero, come in un browser che carica l'ESM da CDN).
const source = readFileSync(resolve(process.cwd(), 'src/core/dev.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText

interface DevModule {
  isDev(): boolean
  devWarn(message: string): void
}

function load(globals: Record<string, unknown>, transform: (code: string) => string = (c) => c) {
  const warn = vi.fn()
  const exports = {} as DevModule
  const context = createContext({ exports, console: { warn }, ...globals })
  runInContext(transform(compiled), context)
  return { dev: exports, warn }
}

/** Quello che fanno Vite, esbuild e webpack: sostituiscono il testo `process.env.NODE_ENV`. */
const bundlerReplace = (value: string) => (code: string) =>
  code.replaceAll('process.env.NODE_ENV', JSON.stringify(value))

describe('core/dev senza process (ESM da CDN, nessun bundler)', () => {
  it('importare il modulo e usarlo non lancia, senza avvisi', () => {
    const context = createContext({ exports: {}, console: {} })
    expect(() => runInContext('typeof process', context)).not.toThrow()
    expect(runInContext('typeof process', context)).toBe('undefined')
    // Il caso da coprire: un ReferenceError vero (di un altro realm, quindi si controlla il messaggio).
    expect(() => runInContext('process', context)).toThrow(/process is not defined/)

    const { dev, warn } = load({})
    expect(() => dev.isDev()).not.toThrow()
    expect(dev.isDev()).toBe(false)
    expect(() => dev.devWarn('x')).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })

  it('con process.env mancante (process = {}) non lancia', () => {
    const { dev, warn } = load({ process: {} })
    expect(dev.isDev()).toBe(false)
    expect(() => dev.devWarn('x')).not.toThrow()
    expect(warn).not.toHaveBeenCalled()
  })

  it('con process definito ma NODE_ENV assente vale come sviluppo', () => {
    const { dev, warn } = load({ process: { env: {} } })
    expect(dev.isDev()).toBe(true)
    dev.devWarn('ciao')
    expect(warn).toHaveBeenCalledWith('[vue-tabula] ciao')
  })
})

describe('core/dev in Node (SSR, test)', () => {
  it('avvisa in sviluppo e test, non in produzione', () => {
    for (const [env, expected] of [
      ['development', true],
      ['test', true],
      ['production', false],
    ] as const) {
      const { dev, warn } = load({ process: { env: { NODE_ENV: env } } })
      expect(dev.isDev(), env).toBe(expected)
      dev.devWarn('m')
      expect(warn).toHaveBeenCalledTimes(expected ? 1 : 0)
    }
  })
})

describe('core/dev con la sostituzione del bundler, nel browser (nessun process)', () => {
  it('in sviluppo gli avvisi restano attivi: è il motivo per cui non c’è un guard typeof', () => {
    const { dev, warn } = load({}, bundlerReplace('development'))
    expect(dev.isDev()).toBe(true)
    dev.devWarn('visibile')
    expect(warn).toHaveBeenCalledWith('[vue-tabula] visibile')
  })

  it('in produzione gli avvisi spariscono', () => {
    const { dev, warn } = load({}, bundlerReplace('production'))
    expect(dev.isDev()).toBe(false)
    dev.devWarn('nascosto')
    expect(warn).not.toHaveBeenCalled()
  })

  it('con un guard typeof il bundler non basterebbe: gli avvisi in sviluppo sparirebbero', () => {
    // Dimostrazione della scelta: la variante con `typeof process` dà false anche in dev.
    const guarded = compiled.replace(
      /return process\.env\.NODE_ENV/,
      'return typeof process !== "undefined" && process.env.NODE_ENV',
    )
    expect(guarded).not.toBe(compiled)
    const { dev } = load({}, () => bundlerReplace('development')(guarded))
    expect(dev.isDev()).toBe(false)
  })
})
