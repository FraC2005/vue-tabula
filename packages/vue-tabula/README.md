# vue-tabula

Tabella dati avanzata per Vue 3, scritta da zero: **zero dipendenze a runtime**, TypeScript, tree-shakable, compatibile con SSR e accessibile (pattern ARIA `grid`).

📖 [Documentazione ed esempi](https://frac2005.github.io/vue-tabula/)

> Versione 0.x: l'API può cambiare tra versioni minori. Vedi il [CHANGELOG](https://github.com/FraC2005/vue-tabula/blob/main/CHANGELOG.md).

## Funzioni

- Ordinamento su più colonne (Maiusc + clic)
- Ricerca globale (senza distinguere maiuscole e accenti)
- Filtri per colonna: testo, selezione e intervallo numerico, combinabili in AND; ricerca e filtri digitati con debounce configurabile
- Selezione delle righe (singola o multipla) per chiave, tra le pagine, con `v-model:selected`, Maiusc+clic per gli intervalli e scorciatoie da tastiera
- Navigazione da tastiera secondo il pattern ARIA grid (un solo tab stop, frecce, Invio/F2, Esc)
- Paginazione lato client
- Celle e intestazioni personalizzabili con slot, tipizzate sul tipo di riga
- Stile con le variabili CSS di shadcn, senza Tailwind a runtime; classi sovrascrivibili tramite prop

In arrivo: `v-model:state`, paginazione lato server, colonne ridimensionabili/riordinabili/fisse, righe espandibili, virtualizzazione (50.000 righe) e navigazione da tastiera con la virtualizzazione.

## Installazione

```bash
pnpm add vue-tabula
```

## Requisiti

- **Vue 3.x** (3.5 o successivo, `vue` come peer dependency).
- Con **vue-tsc** usa **TypeScript 6.x** finché vue-tsc non supporta TypeScript 7.
- Nessuna dipendenza a runtime.

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
