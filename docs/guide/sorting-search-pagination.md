# Ordinamento, ricerca e pagine

In 0.1.0 tutto avviene lato client, sulle righe passate in `rows`.

## Ordinamento

Clicca (o premi Invio/Spazio) sull'intestazione: l'ordine ciclico è crescente → decrescente → nessuno. Con **Maiusc** la colonna si aggiunge alle altre e l'ordine di clic stabilisce la priorità; gli indicatori mostrano il numero di priorità.

- Il confronto di default riconosce numeri, date e booleani; il testo si confronta senza distinguere maiuscole e accenti e con ordine naturale (`a2` prima di `a10`).
- I valori `null`/`undefined` vanno sempre in fondo, in entrambe le direzioni.
- L'ordinamento è stabile.
- Per un confronto personalizzato usa `sortFn` nella colonna; per disattivare l'ordinamento `sortable: false`.

```ts
const columns: ColumnDef<Person>[] = [
  { id: 'name', header: 'Nome' },
  {
    id: 'level',
    header: 'Livello',
    sortFn: (a, b) => order.indexOf(a as string) - order.indexOf(b as string),
  },
  { id: 'notes', header: 'Note', sortable: false },
]
```

## Ricerca globale

La barra di ricerca filtra le righe in cui **ogni parola** digitata compare in almeno una colonna, senza distinguere maiuscole e accenti: `jose madrid` trova «José Álvarez» a Madrid. Si nasconde con `:searchable="false"`.

La ricerca usa l'accessor delle colonne, quindi cerca nel valore mostrato dall'accessor (non nel contenuto degli slot).

## Paginazione

```vue
<VtTable
  :rows="rows"
  :columns="columns"
  row-key="id"
  :page-size="10"
  :page-size-options="[10, 20, 50]"
/>
```

Cambiando ricerca, ordinamento o righe per pagina si torna a pagina 1. Con `:paginated="false"` si mostrano tutte le righe.

## Funzioni pure

La logica è esportata come funzioni pure, utilizzabili anche senza il componente: `sortIndices`, `toggleSort`, `globalSearchIndices`, `paginate`. Lavorano su **indici** e non modificano mai l'array originale.

```ts
import { globalSearchIndices, sortIndices } from 'vue-tabula'

const found = globalSearchIndices(rows, columns, 'ada')
const ordered = sortIndices(rows, columns, [{ columnId: 'age', dir: 'desc' }], found)
const result = ordered.map((i) => rows[i])
```
