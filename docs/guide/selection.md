# Selezione delle righe

Attiva la selezione con la prop `selection`: `'single'` (una riga alla volta) o `'multiple'`. Compare una colonna con le checkbox (si nasconde con `:selection-column="false"`).

La selezione è per **chiave di riga** (`rowKey`): resta quando cambi pagina, ordinamento o filtri. Cerca `P1`, seleziona qualche riga, cambia pagina e torna indietro:

<script setup>
import SelectionDemo from '../.vitepress/components/SelectionDemo.vue'
</script>

<ClientOnly>
  <SelectionDemo />
</ClientOnly>

## `v-model:selected`

La selezione è l'elenco delle chiavi selezionate, in ordine di selezione. Il `v-model` è facoltativo: senza, la tabella la gestisce da sola.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { RowKey } from 'vue-tabula'

const selected = ref<RowKey[]>([])
</script>

<template>
  <VtTable
    v-model:selected="selected"
    :rows="rows"
    :columns="columns"
    row-key="id"
    selection="multiple"
  />
</template>
```

Per svuotarla assegna `[]` o chiama `clearSelection()` su un `ref` al componente.

### Chiavi orfane

Le chiavi di righe che non sono più in `rows` (rimosse dai dati, o presenti solo in un'altra pagina) **restano nella selezione**: è la selezione a decidere, non i dati mostrati. Di conseguenza il **conteggio** (`selected.length` e l'annuncio «3 selected») include anche le chiavi orfane. Con la paginazione lato server (0.3.0), dove `rows` contiene solo la pagina corrente, sarà la norma: le righe scelte nelle altre pagine restano selezionate e contate.

Se invece `rows` contiene tutti i dati selezionabili e vuoi togliere le chiavi che non esistono più, usa `pruneSelection(selected, rows, rowKey)`:

```ts
import { pruneSelection } from 'vue-tabula'

// dopo aver ricaricato i dati
selected.value = pruneSelection(selected.value, rows.value, 'id')
```

Restituisce un nuovo array (stesso ordine, senza le chiavi senza riga). Il componente non lo applica da solo proprio perché, lato server, toglierebbe le selezioni delle altre pagine.

## Interazioni

| Azione                                    | Effetto                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| Clic sulla checkbox di una riga           | Seleziona o deseleziona la riga (in `single` sostituisce la precedente)    |
| Maiusc+clic (checkbox o cella)            | Aggiunge l'intervallo tra l'ultima riga toccata e quella cliccata          |
| Checkbox dell'intestazione                | Seleziona **tutte le righe filtrate** (anche in altre pagine), o le toglie |
| Spazio sulla cella della checkbox         | Seleziona o deseleziona la riga                                            |
| Maiusc+Spazio su qualunque cella          | Seleziona o deseleziona la riga                                            |
| Ctrl/Cmd+A su una cella (solo `multiple`) | Seleziona tutte le righe filtrate                                          |

- L'**intervallo** segue l'ordine mostrato (ordinamento e filtri compresi) e può attraversare più pagine. Si aggiunge alla selezione esistente; il verso non conta.
- «Tutte» e Ctrl/Cmd+A valgono per le righe che passano i filtri e la ricerca: le altre righe selezionate restano. In [modalità server](./server-side#selezione) valgono per la pagina corrente (le altre righe non sono nel componente).
- La checkbox dell'intestazione è **indeterminata** quando è selezionata solo una parte delle righe filtrate.
- Ctrl/Cmd+A dentro un campo di testo (filtro, ricerca) seleziona il testo, non le righe.
- I clic su elementi interattivi dentro le celle (`a`, `button`, `input`, `select`, `textarea`, `[contenteditable]`, `[role="button"]`) non selezionano nulla, nemmeno con Maiusc: un link o un pulsante nello slot di una cella si comporta normalmente. Fa eccezione la checkbox di selezione.

## Accessibilità

- Ogni riga ha `aria-selected` (`true`/`false`); con `multiple` la griglia ha `aria-multiselectable="true"`.
- La colonna di selezione è la colonna 1 (`aria-colindex`): `aria-colcount` e gli indici delle colonne di dati la includono.
- Il numero di righe selezionate è annunciato nella regione `role="status"` (per esempio «1–10 of 120 · 3 selected»). Con `:paginated="false"` o con lo slot `pagination` personalizzato, la tabella mostra una regione di stato propria sotto la griglia.
- Le checkbox hanno un nome accessibile («Select all rows», «Select row»), traducibile con `labels`.

## Funzioni pure

`toggleKey`, `selectRange`, `selectKeys`, `deselectKeys`, `pruneSelection` e `selectionState` lavorano su array di chiavi e non li modificano:

```ts
import { selectRange, selectionState } from 'vue-tabula'

const keys = [1, 2, 3, 4, 5] // ordine mostrato
const next = selectRange([], keys, 2, 4) // [2, 3, 4]
selectionState(next, keys) // 'some'
```
