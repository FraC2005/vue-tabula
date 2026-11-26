# Changelog

Tutte le modifiche rilevanti di questo progetto sono documentate qui.
Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il progetto usa il [versionamento semantico](https://semver.org/lang/it/).

## [Non rilasciato]

## [0.3.0] - 2026-11-26

Paginazione lato server.

### Aggiunto

- Modalità server (`mode="server"`): la tabella non ordina, non filtra e non pagina; mostra `rows` così come arrivano e usa `totalRows` per la paginazione (`undefined` = non ancora noto: `aria-rowcount="-1"` e pagina non toccata). `sortFn` e `filterFn` delle colonne sono ignorati.
- Evento `request` (`TableRequest`: `{ state, signal, id }`) con lo stato completo: emesso dopo il primo montaggio e a ogni modifica di ordinamento, filtri, ricerca globale, pagina o dimensione di pagina, con il debounce già esistente per i campi digitati. Non parte per modifiche alle colonne; le modifiche dello stesso istante si fondono in una richiesta. La prima richiesta usa già uno stato ripristinato subito dopo il montaggio (una sola richiesta, anche con `usePersistentTableState`).
- `AbortSignal` nel payload di `request`: il componente lo annulla quando parte una richiesta più recente e allo smontaggio, così il genitore ignora le risposte fuori ordine (`signal.aborted`, oppure il contatore `id`). Metodo esposto `refresh()` per rimandare la richiesta.
- Prop `loading`: `aria-busy` sulla griglia, barra di caricamento (che rispetta `prefers-reduced-motion`), righe precedenti ancora visibili e annuncio nel `role="status"`; slot `loading`. Prop `error` e slot `error` (`{ error, retry }`) con `role="alert"` e pulsante Retry in modalità server.
- Filtri a selezione in modalità server: `filterOptions` è obbligatorio, con un avviso in console in sviluppo (una volta per colonna).
- Selezione in modalità server: la checkbox dell'intestazione, Ctrl/Cmd+A, lo stato indeterminato e gli intervalli valgono solo per la pagina corrente; le chiavi di altre pagine restano selezionate e contate.
- Stato in modalità server: `v-model:state` e `usePersistentTableState` funzionano; il ripristino non riporta la pagina a 1 prima che `totalRows` sia noto e, a caricamento finito, una pagina oltre l'ultima scende all'ultima (non alla prima).
- Tipi `TableMode`, `TableRequest`, `ErrorSlotProps`; etichette `loading`, `error`, `retry`; classi `loading` ed `error`.
- Documentazione: pagina «Modalità server» (pattern standard con `loading`, risposte fuori ordine, errori, totale, filtri, selezione, stato) con una demo che usa una finta API locale (10.000 righe, latenza casuale, errori simulati, interruttore per ignorare o meno le risposte vecchie), senza servizi esterni.

### Corretto

- Gli avvisi di sviluppo non lanciano `ReferenceError` se la libreria è caricata senza bundler (ESM da CDN, `process` non definito) e restano attivi nel browser con Vite/webpack in sviluppo.

## [0.2.0] - 2026-11-26

### Aggiunto

- `v-model:state`: lo stato della tabella (`TableState`: ordinamento, filtri, ricerca globale, pagina e dimensione di pagina) è emesso con `update:state` come oggetto JSON semplice e si può ripristinare passandolo come prop. Il confronto con lo stato del genitore è per contenuto, non per riferimento: quando il genitore ripassa lo stato ricevuto il componente non riemette, quindi niente cicli. Passare `undefined` dopo uno stato riporta la tabella ai valori iniziali.
- Ripristino validato: chiavi sconosciute e colonne inesistenti ignorate, valori di tipo sbagliato scartati, filtri incompatibili con `column.filter` scartati, `page` riportata nell'intervallo valido (dopo i filtri ripristinati; non con i dati ancora in caricamento), `pageSize` tra quelli ammessi, `version` per le migrazioni future (una versione più recente di quella nota dà lo stato di default). Un input corrotto non lancia mai e dà lo stato di default; la pagina scende all'ultima valida se i dati diminuiscono.
- `usePersistentTableState(key, { storage })`: salva lo stato in `localStorage` o `sessionStorage` e lo ripristina al ricaricamento. Compatibile con SSR (nessun accesso a `window` fuori dal client; lettura dopo il montaggio) e tollerante a storage pieno, disabilitato o con dati corrotti (errore esposto in `error`, nessuna eccezione). Include `reset()`.
- Funzioni pure `validateState`, `parseState`, `clampStatePage`, `cloneState`, `jsonEqual`, costante `STATE_VERSION`; tipi `StateValidationContext`, `StateColumn`, `PersistentTableState`, `PersistentTableStateOptions`.
- Documentazione: pagina «Stato e persistenza» con esempio di stato salvato e ripristinato al ricaricamento e pulsante di reset; pagine sui filtri e sulla selezione con le relative demo.
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
