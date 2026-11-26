# vue-tabula

Libreria open source per Vue 3: componente tabella dati avanzato, da pubblicare su npm (pacchetto `vue-tabula`, senza scope) e da usare nel portfolio.

## Lingua

- Rispondi sempre in italiano.

## Il progetto

Va scritta interamente da zero: niente librerie di tabelle esistenti (TanStack Table, AG Grid, ecc.) e niente codice copiato da esse.

Funzioni del componente:

- Ordinamento su più colonne, filtri per colonna e ricerca globale.
- Paginazione lato client e supporto alla paginazione lato server (il componente emette ordinamento, filtri e pagina; il genitore fornisce righe e totale).
- Selezione delle righe, colonne ridimensionabili, riordinabili e nascondibili, colonne fisse a sinistra.
- Celle personalizzabili tramite slot, righe espandibili.
- Virtualizzazione per decine di migliaia di righe (obiettivo: 50.000 righe fluide).
- Stato salvabile e ripristinabile (ordinamento, filtri, colonne, pagina) come oggetto serializzabile in JSON, con v-model sullo stato.
- Accessibile da tastiera e con screen reader, seguendo il pattern ARIA "grid".
- Stile: nessuna dipendenza da shadcn-vue, reka-ui o Tailwind a runtime. Usa le variabili CSS di shadcn (--background, --foreground, --border, --muted, --accent, --primary, --ring, ecc.). Si spedisce un CSS precompilato con valori di default per chi non usa Tailwind, e le classi delle parti principali sono sovrascrivibili tramite prop.

## Requisiti tecnici

- Vue 3 (Composition API, `<script setup>`), TypeScript strict con tipi completi ed esportati, componente generico sul tipo di riga.
- Build in modalità libreria con Vite, output ESM, dichiarazioni `.d.ts`; Vue come peer dependency e zero dipendenze a runtime. Tree-shakable e compatibile con SSR (Nuxt).
- pnpm come package manager; ESLint e Prettier.
- Test con Vitest e @vue/test-utils su tutte le funzioni principali; per le parti che dipendono dal layout (virtualizzazione, ridimensionamento, colonne fisse) usare Vitest browser mode o Playwright. Logica di ordinamento, filtri e paginazione in funzioni pure testabili separatamente.
- CI con GitHub Actions: lint, typecheck, test e build su ogni push e pull request, con matrice Node 22 e Node 24. In locale si usa Node 22.
- Documentazione con VitePress, esempi interattivi e demo con dati generati (decine di migliaia di righe). Pubblicazione gratuita: Netlify finché la repo è privata, GitHub Pages quando diventerà pubblica (sul piano gratuito Pages funziona solo con repo pubbliche).
- README, CHANGELOG, versionamento semantico (si parte da 0.x), licenza MIT.
- Costo zero.

## Regole di lavoro

- File completi, non pezzi.
- Non fare mai commit, push o pubblicazioni su npm: li fa l'utente. Alla fine di ogni passo lancia lint, test e build, mostra `git status` e proponi il messaggio di commit.
- Quando è il momento di pubblicare, indica i comandi all'utente, ricordandogli di rendere pubblica la repo prima del primo publish. Il pacchetto non ha scope, quindi `--access public` non serve.
- Messaggi di commit con prefisso adatto al tipo di modifica:
  - `feature:` nuova funzione
  - `fix:` correzione
  - `refactor:` riorganizzazione senza cambiare il comportamento
  - `test:` test
  - `docs:` documentazione
  - `chore:` configurazioni e dipendenze
- Mai la riga `Co-Authored-By` nei commit.
- Non aggiungere dipendenze senza chiedere all'utente.
- Tieni questo file aggiornato con le decisioni prese nel piano approvato.

## Ambiente

- Repo GitHub: `FraC2005/vue-tabula` (privata). Branch di lavoro: `develop`.
- Account npm: `ciccio2005`.
- pnpm 12 (via Corepack), Node 22 in locale.

## Decisioni del piano approvato

### Struttura

- Monorepo pnpm con due workspace: `packages/vue-tabula` (libreria pubblicata) e `docs` (VitePress + demo, privato, usa la libreria via `workspace:*`).
- Test della libreria in `packages/vue-tabula/test`: `unit/` (funzioni pure e @vue/test-utils, happy-dom) e `browser/` (Vitest browser mode + Playwright, solo Chromium, anche in CI).
- Sorgente: `core/` (funzioni pure: sort, filter, paginate, state, virtual), `composables/`, `components/` (`VtTable.vue`), `styles/`.
- Prefisso `VtTable` per i componenti e `vt-*` per le classi CSS.
- Le dichiarazioni `.d.ts` si generano con `vue-tsc --emitDeclarationOnly` (niente vite-plugin-dts, che richiederebbe @microsoft/api-extractor).

### API

- `TableState` serializzabile in JSON (`version`, `sort`, `filters`, `globalSearch`, `columnOrder`, `columnVisibility`, `columnWidths`, `pinnedLeft`, `page`, `pageSize`). Lo stato interno usa `TableState` fin dalla 0.1.0; il `v-model:state` arriva alla 0.2.0.
- Slot: `cell-<columnId>` e slot generico di fallback `cell` con `{ row, column, value }`, oltre a `header-<columnId>`, `expanded-row`, `empty`, `loading`, `toolbar`, `pagination`. Tutti gli slot sono tipizzati con `defineSlots` e generici sul tipo di riga.
- In modalità server la ricerca globale ha un debounce prima di emettere `request`.
- Metodi esposti: `scrollToRow`, `resetState`, `getState`, `clearSelection`, `expandAll`/`collapseAll`, `focusCell`.

- Import relativi nel sorgente con estensione `.js` (`'./core/sort.js'`), necessari perché i `.d.ts` si risolvano in node16/ESM. Lo script `packages/vue-tabula/scripts/fix-dts.mjs` (in coda a `build`) rinomina `*.vue.d.ts` in `*.d.ts` e riscrive gli specificatori `.vue`; si elimina quando vue-tsc non serve più l'aiuto (vedi il commento in testa al file).
- `pnpm check:package` (publint + attw con `--profile esm-only`, escluso `./style.css`) usa `pnpm dlx`, senza dipendenze, e gira in CI dopo la build.
- Il CSS è collegato al componente con `<style src>` (non con `import`, che finirebbe nei `.d.ts`).
- Layout ARIA: `role="grid"` su un elemento interno (`.vt-grid`); toolbar e paginazione stanno fuori dal grid.
- Testi dell'interfaccia in inglese di default, sostituibili con la prop `labels`. Le colonne sono ordinabili salvo `sortable: false`.

- Filtri per colonna (0.2.0): `filter: 'text' | 'select' | 'number'`, valori JSON in `TableState.filters` (`string`, primitivo o array, `{min,max}`). Pipeline: filtri di colonna → ricerca globale → ordinamento → pagina. Tipo di confronto da `column.filter`, altrimenti dedotto dalla forma del valore; `filterFn` lo sostituisce. La riga dei filtri è una riga del grid (`aria-rowindex` 2) e sposta gli indici delle righe dati.
- Debounce (0.2.0): prop `debounce` (default 250 ms) per ricerca globale e filtri di testo/numerici; le bozze stanno fuori dallo stato e si applicano allo scadere, su blur/Invio/Esc o con `getState()`; i filtri a selezione sono immediati. Vale per client e server: in 0.3.0 `request` si emette dal punto in cui si aggiorna lo stato.
- Navigazione da tastiera (anticipata dalla 0.7.0): modello di posizione logica (riga 0 = intestazione, 1 = filtri se presenti, poi le righe della pagina) in `core/navigation.ts`, roving tabindex con un solo tab stop, controlli predefiniti con `tabindex="-1"`. Alla 0.7.0 restano virtualizzazione (righe fuori dal DOM) e audit con screen reader, più la **gestione automatica del tabindex degli elementi focalizzabili dentro gli slot delle celle**: `tabindex="-1"` finché non si entra nella cella con Invio/F2, poi ripristino all'uscita (Esc).
- Selezione (0.2.0): prop `selection` (`none`/`single`/`multiple`), `selectionColumn`, `v-model:selected` (`RowKey[]`, via `defineModel`, facoltativo); la selezione NON sta in `TableState`. Per chiave tra pagine/ordinamenti/filtri; "tutte" e Ctrl/Cmd+A valgono per le righe filtrate (in server mode, per la pagina corrente); Maiusc+clic aggiunge l'intervallo nell'ordine mostrato (l'ultima riga toccata diventa l'ancora). La colonna di selezione è la colonna logica 0 (`aria-colindex` 1) e sposta di uno le colonne di dati.

### Stile

- Il CSS di default sta dentro `@layer vue-tabula`, con le variabili CSS di shadcn.

### Versioni

| Versione | Contenuto                                                                                                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0.0      | Scaffold monorepo, Vite lib, ESLint/Prettier, Vitest, CI (Node 22 e 24), VitePress vuoto, MIT                                                                                                          |
| 0.1.0    | MVP: tipi e colonne, ARIA `grid` di base, ordinamento multi-colonna, ricerca globale, paginazione client, slot celle, CSS di default, docs, README. **Primo publish: la repo diventa pubblica prima.** |
| 0.2.0    | Filtri per colonna, selezione righe, `v-model:state`                                                                                                                                                   |
| 0.3.0    | Paginazione lato server                                                                                                                                                                                |
| 0.4.0    | Colonne nascondibili, riordinabili, ridimensionabili                                                                                                                                                   |
| 0.5.0    | Virtualizzazione righe (demo 50.000 righe)                                                                                                                                                             |
| 0.6.0    | Colonne fisse a sinistra, righe espandibili, combinazione con la virtualizzazione                                                                                                                      |
| 0.7.0    | Navigazione completa da tastiera e screen reader, audit a11y                                                                                                                                           |
| 0.8.0    | Solo rifinitura del sito docs, test Nuxt/SSR, dimensione e tree-shaking                                                                                                                                |
| 1.0.0    | API stabile                                                                                                                                                                                            |

Ogni versione include: test, pagina di documentazione ed esempio per le funzioni nuove, voce nel CHANGELOG.

### Pubblicazione e docs

- Fino alla 0.1.0 le docs girano solo in locale. Dalla 0.1.0 (repo pubblica) GitHub Pages con deploy da GitHub Actions. Niente Netlify.
- Pacchetto senza scope: `--access public` non serve.

### Interazioni delicate

- Virtualizzazione + colonne fisse + righe espandibili: righe posizionate con offset cumulativi, altezze misurate con `ResizeObserver` e ricerca binaria; colonne fisse con `position: sticky` e offset calcolati dalle larghezze. Ripiego: altezza fissa dichiarata per le righe espandibili in modalità virtuale.
- Virtualizzazione + ARIA: `aria-rowcount`/`aria-rowindex`/`aria-colcount`/`aria-colindex`; focus per indici logici; la riga col focus resta sempre nel DOM.
- Ridimensionamento + colonne fisse: variabili CSS per colonna (`--vt-col-<id>-w`), offset `sticky` ricalcolati.
- Selezione per chiave (`rowKey`) tra le pagine; in modalità server "seleziona tutto" vale per la pagina corrente.
- Modalità server: ordinamento, filtri e pagina vengono solo emessi; ogni cambio di filtri/ordinamento riporta la pagina a 1; lo stato ripristinato viene validato.
- Riordino: le colonne fisse si riordinano solo tra loro.
- SSR: nessun accesso a `window`/`document` fuori da `onMounted`.
- Performance: ordinamento e filtri su un array di indici, memoizzati; `shallowRef` per le righe.

### Dipendenze approvate (solo dev, nessuna a runtime)

`vue` (anche peer), `vite`, `@vitejs/plugin-vue`, `typescript` (6.0.x: `typescript-eslint` non supporta ancora la 7), `vue-tsc`, `vitest`, `@vue/test-utils`, `happy-dom`, `@vitest/browser`, `@vitest/browser-playwright`, `@vitest/coverage-v8`, `playwright` (solo Chromium), `eslint`, `eslint-plugin-vue`, `typescript-eslint`, `prettier`, `vitepress`.
