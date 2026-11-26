# Changelog

Tutte le modifiche rilevanti di questo progetto sono documentate qui.
Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il progetto usa il [versionamento semantico](https://semver.org/lang/it/).

## [Non rilasciato]

## [0.1.0] - 2026-11-26

Primo MVP.

### Aggiunto

- Componente `VtTable`, generico sul tipo di riga, con struttura ARIA `grid` (`aria-rowcount`, `aria-rowindex`, `aria-colcount`, `aria-colindex`, `aria-sort`).
- Ordinamento su più colonne (Maiusc + clic), stabile, con valori nulli in fondo e `sortFn` personalizzabile.
- Ricerca globale senza distinzione di maiuscole e accenti, con più parole in AND.
- Paginazione lato client con selettore delle righe per pagina.
- Slot `cell-<columnId>`, `cell`, `header-<columnId>`, `empty`, `toolbar` e `pagination`, tutti tipizzati.
- Prop `classes` e `labels` per personalizzare classi e testi.
- Metodi esposti `getState` e `resetState`; lo stato interno è un `TableState` serializzabile in JSON.
- Funzioni pure esportate: `sortIndices`, `toggleSort`, `compareValues`, `globalSearchIndices`, `normalizeText`, `paginate`.
- CSS di default nel `@layer vue-tabula`, con le variabili CSS di shadcn e valori di ripiego (`vue-tabula/style.css`).
- Documentazione VitePress con esempio interattivo, README del pacchetto.
- Controllo del pacchetto con publint e Are the Types Wrong (`pnpm check:package`, anche in CI).

### Modificato

- Le dichiarazioni `.d.ts` si risolvono correttamente in node16/ESM (script `fix-dts.mjs`).

## [0.0.0]

- Scaffold del monorepo pnpm: libreria, documentazione VitePress, test, lint e CI.
