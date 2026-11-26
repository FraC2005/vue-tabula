# Celle personalizzate

Ogni cella si personalizza con uno slot. Lo slot riceve `{ row, column, value }`.

| Slot                | Quando si usa                                         |
| ------------------- | ----------------------------------------------------- |
| `cell-<columnId>`   | Solo le celle della colonna indicata                  |
| `cell`              | Ripiego per tutte le celle senza slot specifico       |
| `header-<columnId>` | Intestazione della colonna (riceve `{ column }`)      |
| `empty`             | Contenuto quando non ci sono righe da mostrare        |
| `toolbar`           | Sostituisce la ricerca (riceve `search`, `setSearch`) |
| `pagination`        | Sostituisce i controlli di pagina                     |

```vue
<VtTable :rows="rows" :columns="columns" row-key="id">
  <template #cell-salary="{ value }">{{ Number(value).toLocaleString('it-IT') }} €</template>
  <template #cell-active="{ value }">
    <span :class="value ? 'ok' : 'ko'">{{ value ? 'Sì' : 'No' }}</span>
  </template>
</VtTable>
```

Lo slot `cell-<columnId>` ha la precedenza su `cell`. Gli slot sono tipizzati: `row` è del tipo delle righe, `value` è `unknown` (restringilo prima dell'uso).

::: tip Ricerca e ordinamento
Ricerca e ordinamento usano il valore dell'accessor, non quello che mostra lo slot. Se mostri un valore formattato, usa `accessor` per far corrispondere i due.
:::
