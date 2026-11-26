# API

## Props di `VtTable`

| Prop              | Tipo                            | Default             | Descrizione                               |
| ----------------- | ------------------------------- | ------------------- | ----------------------------------------- |
| `rows`            | `T[]`                           | —                   | Righe da mostrare                         |
| `columns`         | `ColumnDef<T>[]`                | —                   | Definizione delle colonne                 |
| `rowKey`          | `keyof T \| (row: T) => RowKey` | —                   | Chiave stabile di ogni riga               |
| `ariaLabel`       | `string`                        | —                   | Nome accessibile della tabella            |
| `pageSize`        | `number`                        | `25`                | Righe per pagina iniziali                 |
| `pageSizeOptions` | `number[]`                      | `[10, 25, 50, 100]` | Opzioni del selettore                     |
| `searchable`      | `boolean`                       | `true`              | Mostra la ricerca globale                 |
| `paginated`       | `boolean`                       | `true`              | Paginazione lato client                   |
| `classes`         | `TableClasses`                  | `{}`                | Classi aggiuntive per le parti principali |
| `labels`          | `Partial<TableLabels>`          | inglese             | Testi dell'interfaccia                    |

## `ColumnDef<T>`

| Campo                           | Descrizione                                                   |
| ------------------------------- | ------------------------------------------------------------- |
| `id`                            | Identificatore univoco (obbligatorio)                         |
| `header`                        | Testo dell'intestazione (obbligatorio)                        |
| `accessor`                      | Chiave di `T` o funzione `(row) => valore`; ripiego: l'`id`   |
| `width`, `minWidth`, `maxWidth` | Dimensioni in pixel; senza `width` la colonna si distribuisce |
| `sortable`                      | `false` per disattivare l'ordinamento (default: ordinabile)   |
| `sortFn`                        | Confronto personalizzato `(a, b) => number`                   |
| `align`                         | `'left' \| 'center' \| 'right'`                               |

## Metodi esposti

Con un `ref` al componente:

- `getState(): TableState` — copia dello stato corrente (serializzabile in JSON); applica prima quanto appena digitato.
- `resetState(): void` — riporta ordinamento, filtri, ricerca e pagina ai valori iniziali.
- `clearSelection(): void` — deseleziona tutte le righe.
- `focusCell(row, col?): void` — sposta il focus su una cella (riga 0 = intestazione, 1 = filtri se presenti, poi le righe).
- `clearFilters(): void` — rimuove i filtri di colonna e la ricerca globale.

## Funzioni e tipi esportati

`createDefaultState`, `DEFAULT_PAGE_SIZE`, `setColumnFilter`, `getCellValue`, `getRowKey`, `compareValues`, `sortIndices`, `toggleSort`, `globalSearchIndices`, `normalizeText`, `columnFilterIndices`, `isFilterActive`, `selectOptions`, `normalizeOptions`, `validateState`, `parseState`, `clampStatePage`, `cloneState`, `jsonEqual`, `STATE_VERSION`, `usePersistentTableState`, `toggleKey`, `selectRange`, `selectKeys`, `deselectKeys`, `pruneSelection`, `selectionState`, `createDebouncer`, `moveGridPosition`, `clampPosition`, `paginate`.

Tipi: `ColumnDef`, `TableState`, `SortEntry`, `SortDirection`, `RowKey`, `CellSlotProps`, `HeaderSlotProps`, `FilterSlotProps`, `FilterKind`, `FilterOption`, `FilterPrimitive`, `FilterValue`, `NumberRange`, `StateValidationContext`, `StateColumn`, `PersistentTableState`, `PersistentTableStateOptions`, `SelectionMode`, `SelectionState`, `GridPosition`, `GridBounds`, `Debouncer`, `TableClasses`, `TableLabels`, `PageInfo`.

::: warning API non ancora stabile
Siamo in 0.x: tra una versione minore e l'altra l'API può cambiare. Le modifiche sono nel [CHANGELOG](https://github.com/FraC2005/vue-tabula/blob/main/CHANGELOG.md).
:::
