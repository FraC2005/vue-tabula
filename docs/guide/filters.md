# Filtri per colonna

Una colonna con `filter` mostra un controllo nella riga sotto le intestazioni. I filtri di colonna si combinano **in AND** tra loro e con la ricerca globale; ogni cambio riporta a pagina 1. Con almeno un filtro attivo compare il pulsante «Clear filters» (azzera anche la ricerca globale).

<script setup>
import FiltersDemo from '../.vitepress/components/FiltersDemo.vue'
</script>

<ClientOnly>
  <FiltersDemo />
</ClientOnly>

## Tipi di filtro

| `filter`   | Controllo           | Valore nello stato            | Confronto                                                  |
| ---------- | ------------------- | ----------------------------- | ---------------------------------------------------------- |
| `'text'`   | Campo di testo      | `string`                      | Contiene il testo, senza distinguere maiuscole e accenti   |
| `'select'` | Menu a tendina      | valore primitivo (o un array) | Uguale a (uno di); non è un «contiene»                     |
| `'number'` | Due campi Min / Max | `{ min?, max? }`              | Compreso tra i due estremi (inclusi); i nulli sono esclusi |

```ts
const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Nome', filter: 'text' },
  { id: 'city', header: 'Città', filter: 'select' }, // opzioni ricavate dalle righe
  { id: 'age', header: 'Età', filter: 'number' },
  {
    id: 'active',
    header: 'Attivo',
    filter: 'select',
    filterOptions: [
      { label: 'Sì', value: true },
      { label: 'No', value: false },
    ],
  },
]
```

Le opzioni di un filtro `select` si ricavano dai valori distinti presenti in `rows` (in ordine naturale); con `filterOptions` le dichiari tu, anche con un'etichetta diversa dal valore.

## Debounce

Mentre si digita, la **ricerca globale** e i filtri di **testo** e **numerici** si applicano dopo una breve pausa (250 ms di default), così la tabella non si ricalcola a ogni tasto. Il testo digitato è mostrato subito; cambia solo il momento in cui le righe si aggiornano. Si configura con la prop `debounce` (in ms; `0` applica subito):

```vue
<VtTable :debounce="400" ... />
```

La pausa viene saltata (l'effetto è immediato) quando:

- il campo perde il focus, o premi Invio o Esc;
- cambia un filtro a **selezione** (non si digita nulla: si applica sempre subito);
- chiami `getState()`, che include sempre quanto appena digitato;
- usi `setValue` di uno slot `filter-<columnId>` (il controllo personalizzato decide da sé quando).

`clearFilters()` e `resetState()` scartano ciò che è in attesa. Il debounce agisce sul passaggio che aggiorna lo stato, quindi vale allo stesso modo in modalità client e server.

## Confronto personalizzato

`filterFn` sostituisce il confronto di default della colonna. Riceve il valore della cella, il valore del filtro e la riga:

```ts
{
  id: 'name',
  header: 'Nome',
  filter: 'text',
  filterFn: (value, filter) => String(value).startsWith(String(filter)),
}
```

## Controllo personalizzato

Lo slot `filter-<columnId>` sostituisce il controllo e riceve `{ column, value, setValue }`. `setValue(undefined)` (o un valore vuoto) rimuove il filtro:

```vue
<VtTable :rows="rows" :columns="columns" row-key="id">
  <template #filter-city="{ value, setValue }">
    <button @click="setValue('Roma')">Solo Roma</button>
    <button v-if="value" @click="setValue(undefined)">Tutte</button>
  </template>
</VtTable>
```

## Funzioni pure

`columnFilterIndices(rows, columns, filters, indices?)` applica i filtri senza il componente e restituisce indici; `isFilterActive`, `selectOptions`, `normalizeOptions` e `setColumnFilter(state, columnId, value)` completano il set. `createDebouncer()` espone il gestore del debounce usato dal componente. Esempio, combinato con la ricerca globale:

```ts
import { columnFilterIndices, globalSearchIndices } from 'vue-tabula'

const byColumn = columnFilterIndices(rows, columns, { city: 'Roma', age: { min: 30 } })
const found = globalSearchIndices(rows, columns, 'ada', byColumn)
```
