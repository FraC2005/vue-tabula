# Per iniziare

`vue-tabula` è una tabella dati per Vue 3, scritta da zero e senza dipendenze a runtime. Richiede solo `vue` (3.5 o successivo).

## Installazione

```bash
pnpm add vue-tabula
```

## Uso minimo

Importa il componente **e** il CSS di default (una sola volta, per esempio in `main.ts`):

```ts
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
  { id: 'id', header: 'ID', width: 80 },
  { id: 'name', header: 'Nome' },
  { id: 'city', header: 'Città' },
]
</script>

<template>
  <VtTable :rows="rows" :columns="columns" row-key="id" aria-label="Persone" />
</template>
```

`VtTable` è generico sul tipo di riga: `columns` e gli slot delle celle sono tipizzati su `Person`.

`row-key` identifica ogni riga in modo stabile: è il nome di una proprietà (`'id'`) oppure una funzione `(row) => chiave`.

## Esempio

Prova a cliccare sulle intestazioni (con **Maiusc** si ordina su più colonne), a cercare e a cambiare pagina:

<script setup>
import BasicDemo from '../.vitepress/components/BasicDemo.vue'
</script>

<ClientOnly>
  <BasicDemo />
</ClientOnly>
