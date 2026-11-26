# Changelog

Tutte le modifiche rilevanti di questo progetto sono documentate qui.
Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il progetto usa il [versionamento semantico](https://semver.org/lang/it/).

## [Non rilasciato]

### Aggiunto

- Filtri per colonna (`filter: 'text' | 'select' | 'number'`) con riga di controlli sotto le intestazioni, `filterOptions`, `filterFn` e slot `filter-<columnId>`. I filtri si combinano in AND tra loro e con la ricerca globale; ogni cambio riporta a pagina 1.
- Pulsante «Clear filters» e metodo esposto `clearFilters`.
- Funzioni pure `columnFilterIndices`, `isFilterActive`, `selectOptions`, `normalizeOptions` e `setColumnFilter`; `globalSearchIndices` accetta un elenco di indici da considerare.
- Tipi `FilterValue`, `FilterKind`, `FilterOption`, `FilterPrimitive`, `NumberRange`, `FilterSlotProps`.
- Etichette `filterColumn`, `filterAll`, `filterMin`, `filterMax`, `clearFilters` e classi `filterRow`, `filterInput`.
- Navigazione da tastiera secondo il pattern ARIA grid: un solo tab stop (roving tabindex), frecce, Home/Fine (con Ctrl: angoli), PageUp/PageDown, Invio o F2 per entrare nel controllo di una cella, Esc per uscirne (applicando subito il testo digitato), Invio/Spazio sulle intestazioni per ordinare. Metodo esposto `focusCell` e funzioni pure `moveGridPosition` e `clampPosition`.
- Prop `debounce` (default 250 ms) per ricerca globale e filtri di testo e numerici, con applicazione immediata su blur, Invio, Esc e `getState()`; i filtri a selezione restano immediati. Funzione `createDebouncer`.
- Selezione delle righe per `rowKey` (prop `selection`: `single` o `multiple`), con colonna di checkbox opzionale (`selectionColumn`) e `v-model:selected` facoltativo con le chiavi selezionate. La selezione resta tra pagine, ordinamenti e filtri.
- Interazioni: checkbox nell'intestazione con stato indeterminato (seleziona tutte le righe filtrate), Maiusc+clic per un intervallo (anche tra pagine), Spazio sulla cella della checkbox, Maiusc+Spazio su qualunque cella, Ctrl/Cmd+A in modalità `multiple`.
- Accessibilità: `aria-selected` sulle righe, `aria-multiselectable` sulla griglia, annuncio del numero di righe selezionate nel `role="status"` (con regione propria se manca il riepilogo di paginazione). Con la colonna di selezione, `aria-colcount` e `aria-colindex` la includono.
- I clic su elementi interattivi dentro le celle (link, pulsanti, campi, `[role="button"]`...) non attivano la selezione né l'intervallo con Maiusc; fa eccezione la checkbox di selezione. Il conteggio delle righe selezionate include le chiavi orfane (non più in `rows`).
- Metodo esposto `clearSelection` e funzioni pure `toggleKey`, `selectRange`, `selectKeys`, `deselectKeys`, `pruneSelection` (toglie le chiavi senza riga), `selectionState`, più `getRowKey`; tipi `SelectionMode` e `SelectionState`; etichette `selectAll`, `selectRow`, `selectedCount`.
- README del pacchetto: sezione Requisiti (Vue 3.x, TypeScript 6.x con vue-tsc).

### Modificato

- La ricerca globale è ora ritardata di `debounce` ms (prima era immediata); `:debounce="0"` ripristina il comportamento precedente.
- Le intestazioni e i controlli predefiniti non sono più tab stop singoli: si raggiungono con la navigazione della griglia (frecce, Invio/F2).
- `TableState.filters` è ora `Record<string, FilterValue>` (prima `Record<string, unknown>`).

## [0.1.0] - 2026-11-26

Primo MVP.

### Aggiunto

- Componente `VtTable`, generico sul tipo di riga, con struttura ARIA `grid` (`aria-rowcount`, `aria-rowindex`, `aria-colcount`, `aria-colindex`, `aria-sort`).
- Ordinamento su più colonne (Maiusc + clic), stabile, con valori nulli in fondo e `sortFn` personalizzabile.
- Ricerca globale senza distinzione di maiuscole e accenti, con più parole in AND.
- Paginazione lato client con selettore delle righe per pagina.
- Slot `cell-<columnId>`, `cell`, `header-<columnId>`, `empty`, `toolbar` e `pagination`, tutti tipizzati.
- Prop `classes` e `labels` per personalizzare classi e testi.
- Metodi esposti `getState` e `resetState`; lo stato interno è un `TableState` serializzabile in JSON.
- Funzioni pure esportate: `sortIndices`, `toggleSort`, `compareValues`, `globalSearchIndices`, `normalizeText`, `paginate`.
- CSS di default nel `@layer vue-tabula`, con le variabili CSS di shadcn e valori di ripiego (`vue-tabula/style.css`).
- Documentazione VitePress con esempio interattivo, README del pacchetto.
- Controllo del pacchetto con publint e Are the Types Wrong (`pnpm check:package`, anche in CI).

### Modificato

- Le dichiarazioni `.d.ts` si risolvono correttamente in node16/ESM (script `fix-dts.mjs`).

## [0.0.0]

- Scaffold del monorepo pnpm: libreria, documentazione VitePress, test, lint e CI.
