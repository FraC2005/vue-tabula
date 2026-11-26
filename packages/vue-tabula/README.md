# vue-tabula

Tabella dati avanzata per Vue 3, scritta da zero: **zero dipendenze a runtime**, TypeScript, tree-shakable, compatibile con SSR e accessibile (pattern ARIA `grid`).

> Versione 0.x: l'API può cambiare tra versioni minori. Vedi il [CHANGELOG](https://github.com/FraC2005/vue-tabula/blob/main/CHANGELOG.md).

## Funzioni (0.1.0)

- Ordinamento su più colonne (Maiusc + clic)
- Ricerca globale (senza distinguere maiuscole e accenti)
- Paginazione lato client
- Celle e intestazioni personalizzabili con slot, tipizzate sul tipo di riga
- Stile con le variabili CSS di shadcn, senza Tailwind a runtime; classi sovrascrivibili tramite prop

In arrivo: filtri per colonna, selezione, `v-model:state`, paginazione lato server, colonne ridimensionabili/riordinabili/fisse, righe espandibili, virtualizzazione (50.000 righe) e navigazione completa da tastiera.

## Installazione

```bash
pnpm add vue-tabula
```

Richiede `vue` ^3.5.

## Uso

```ts
// main.ts: CSS di default, una sola volta
import 'vue-tabula/style.css'
```

```vue
<script setup lang="ts">
import { VtTable } from 'vue-tabula'
import type { ColumnDef } from 'vue-tabula'

interface Person {
  id: number
  name: string
  city: string
}

const rows: Person[] = [
  { id: 1, name: 'Ada Lovelace', city: 'Londra' },
  { id: 2, name: 'Linus Torvalds', city: 'Helsinki' },
]

const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Nome' },
  { id: 'city', header: 'Città' },
]
</script>

<template>
  <VtTable :rows="rows" :columns="columns" row-key="id" aria-label="Persone">
    <template #cell-name="{ value }">
      <strong>{{ value }}</strong>
    </template>
  </VtTable>
</template>
```

Ordinamento, ricerca e paginazione sono attivi di default. Il CSS usa `--background`, `--foreground`, `--border`, `--muted`, `--accent`, `--primary`, `--ring` (con valori di ripiego) e sta nel `@layer vue-tabula`, quindi le tue regole vincono senza `!important`.

## Licenza

[MIT](./LICENSE)
