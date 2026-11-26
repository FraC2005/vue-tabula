# vue-tabula

Componente tabella dati avanzato per Vue 3, scritto da zero, senza dipendenze a runtime.

> Stato: sviluppo iniziale (0.x). L'API non è ancora stabile.

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
