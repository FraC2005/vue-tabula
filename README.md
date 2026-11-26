# vue-tabula

[![npm](https://img.shields.io/npm/v/vue-tabula)](https://www.npmjs.com/package/vue-tabula)
[![CI](https://github.com/FraC2005/vue-tabula/actions/workflows/ci.yml/badge.svg)](https://github.com/FraC2005/vue-tabula/actions/workflows/ci.yml)
[![licenza: MIT](https://img.shields.io/npm/l/vue-tabula)](./LICENSE)

📖 **[Documentazione ed esempi](https://frac2005.github.io/vue-tabula/)**

Componente tabella dati avanzato per Vue 3, scritto da zero, senza dipendenze a runtime.

> Stato: 0.1.0 (MVP). L'API non è ancora stabile.

Funzioni attuali: ordinamento multi-colonna, ricerca globale, paginazione lato client, slot per celle e intestazioni, stile con le variabili CSS di shadcn, ARIA `grid`. Installazione e uso: [README del pacchetto](./packages/vue-tabula/README.md).

## Struttura della repo

- `packages/vue-tabula`: la libreria (pacchetto npm `vue-tabula`).
- `docs`: sito di documentazione VitePress e demo.

## Sviluppo

Requisiti: Node 22+ e pnpm.

```bash
pnpm install
pnpm --filter vue-tabula exec playwright install chromium   # solo la prima volta
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm docs:dev
```

## Licenza

[MIT](./LICENSE)
