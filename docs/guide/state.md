# Stato e persistenza

Lo stato della tabella (ordinamento, filtri, ricerca globale, pagina, dimensione di pagina…) è un oggetto **serializzabile in JSON**: `TableState`. Con `v-model:state` lo leggi, lo salvi dove vuoi e lo ripristini.

```ts
interface TableState {
  version: 1
  sort: { columnId: string; dir: 'asc' | 'desc' }[]
  filters: Record<string, FilterValue>
  globalSearch: string
  columnOrder: string[]
  columnVisibility: Record<string, boolean>
  columnWidths: Record<string, number>
  pinnedLeft: string[]
  page: number // da 1
  pageSize: number
}
```

::: tip Cosa non c'è nello stato
La **selezione** delle righe non fa parte di `TableState`: ha il suo `v-model:selected` (vedi [Selezione](./selection)). Le colonne ordinabili, nascondibili, ridimensionabili e fisse arrivano nelle prossime versioni: i campi `columnOrder`, `columnVisibility`, `columnWidths` e `pinnedLeft` ci sono già (e vengono già validati) ma per ora non hanno effetto.
:::

## `v-model:state`

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { TableState } from 'vue-tabula'

const state = ref<TableState>()
</script>

<template>
  <VtTable v-model:state="state" :rows="rows" :columns="columns" row-key="id" />
</template>
```

- Il componente emette `update:state` a ogni cambio con un oggetto JSON semplice (non un proxy reattivo): puoi fare `JSON.stringify` o inviarlo a un server così com'è.
- Il v-model è facoltativo. Senza, la tabella gestisce lo stato da sola; `getState()` e `resetState()` restano disponibili su un `ref` al componente.
- Passare `undefined` dopo uno stato riporta la tabella ai valori iniziali.
- Chi riceve `update:state` deve aggiornare lo stato **in modo sincrono** (come fa `v-model`). Un genitore che lo ripassa in ritardo, dopo altri cambi dell'utente, ne annullerebbe le modifiche più recenti.

### Niente cicli

Quando il genitore ripassa lo stato appena ricevuto, il componente **non lo riemette**. Il confronto è per contenuto, non per riferimento: una copia profonda, o lo stesso oggetto con le chiavi in un altro ordine, non cambia nulla. Puoi quindi clonare lo stato, salvarlo e ripassarlo senza preoccuparti.

## Ripristino validato

Uno stato che arriva da fuori (JSON salvato, storage del browser, un server, un link condiviso) può essere vecchio, incompleto o manomesso. Il componente lo **valida sempre** prima di adottarlo e non lancia mai eccezioni: con un input corrotto usa lo stato di default.

| Caso                                                         | Cosa succede                                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Chiavi sconosciute                                           | Ignorate                                                               |
| Colonne inesistenti (in `sort`, `filters`, …)                | Ignorate                                                               |
| Ordinamento su una colonna con `sortable: false`             | Scartato                                                               |
| Valori di tipo sbagliato                                     | Scartati: il campo torna al default                                    |
| Filtro incompatibile con `column.filter`                     | Scartato (es. un testo su un filtro `number`)                          |
| Filtri vuoti o non attivi                                    | Scartati                                                               |
| `page` non intero o < 1                                      | Diventa 1                                                              |
| `page` oltre l'ultima pagina                                 | Riportata all'ultima valida, dopo aver applicato i filtri ripristinati |
| `pageSize` non tra `pageSizeOptions` (o la prop)             | Diventa il valore della prop `pageSize`                                |
| Input che non è un oggetto (stringa, numero, `null`, array…) | Stato di default                                                       |
| `version` più recente di quella nota                         | Stato di default (non si può interpretare)                             |
| `version` più vecchia                                        | Passa dalle migrazioni, poi viene validata                             |
| Elenchi enormi                                               | Troncati (1000 voci)                                                   |

Se la validazione corregge qualcosa, il componente emette `update:state` con lo stato corretto, così il genitore resta allineato. Se i dati (`rows`) non sono ancora arrivati, la pagina non viene riportata nei limiti (non si sa quante pagine ci saranno): lo farà quando i dati ci sono.

La `version` serve alle migrazioni future: oggi esiste solo la 1. Quando il formato cambierà, gli stati salvati con la versione precedente verranno convertiti automaticamente.

### Funzioni pure

Le stesse regole sono disponibili senza il componente:

```ts
import { parseState, validateState } from 'vue-tabula'

const context = { columns, pageSizeOptions: [10, 25, 50], defaultPageSize: 25 }

const a = validateState(unknownObject, context) // mai lancia
const b = parseState(localStorage.getItem('tabella'), context) // accetta anche una stringa JSON
```

`validateState` e `parseState` restituiscono sempre un oggetto nuovo e completo. `clampStatePage(state, total)` porta `page` nei limiti, `cloneState` fa una copia JSON e `jsonEqual` confronta due valori per contenuto.

## Salvare lo stato: `usePersistentTableState`

Un helper facoltativo salva lo stato in `localStorage` (o `sessionStorage`) e lo ripristina al ricaricamento. Prova: ordina, filtra, cambia pagina e ricarica.

<script setup>
import PersistentStateDemo from '../.vitepress/components/PersistentStateDemo.vue'
</script>

<ClientOnly>
  <PersistentStateDemo />
</ClientOnly>

```vue
<script setup lang="ts">
import { VtTable, usePersistentTableState } from 'vue-tabula'

const { state, reset, error } = usePersistentTableState('tabella-persone')
// opzioni: { storage: 'local' (default) | 'session' | un oggetto compatibile con Storage }
</script>

<template>
  <button @click="reset">Reset</button>
  <p v-if="error">Il salvataggio non è disponibile.</p>
  <VtTable v-model:state="state" :rows="rows" :columns="columns" row-key="id" />
</template>
```

- **`state`**: da collegare a `v-model:state`. All'inizio è `undefined` (la tabella parte dai default); dopo il montaggio, se c'è uno stato salvato, lo riceve. Ogni cambio viene salvato.
- **`reset()`**: dimentica lo stato salvato e riporta la tabella ai valori iniziali.
- **`error`**: l'ultimo errore di lettura o scrittura dello storage, o `null`.
- **Più tabelle**: usa una chiave diversa per ciascuna.

### SSR e Nuxt

Durante il rendering sul server l'helper **non tocca `window`**. Legge lo storage dopo il montaggio nel browser, quindi anche l'HTML idratato coincide con quello del server: la tabella si vede prima con i default e poi riceve lo stato salvato. Con Nuxt funziona senza `<ClientOnly>`.

### Storage pieno o disabilitato

Storage pieno (`QuotaExceededError`), disabilitato (modalità privata, cookie bloccati: anche solo leggere `window.localStorage` può lanciare) o con dati corrotti **non causano eccezioni**. L'errore finisce in `error`, la tabella continua a funzionare senza persistenza e, se una scrittura successiva riesce, `error` torna a `null`. Un valore salvato che non è JSON valido viene ignorato; uno che è un oggetto ma malformato passa dalla validazione.

### Salvare altrove

L'helper è solo una comodità: `v-model:state` ti dà un oggetto JSON, quindi puoi salvarlo dove vuoi (un server, l'URL, IndexedDB) e ripassarlo allo stesso modo. La validazione protegge comunque da dati vecchi o manomessi.
