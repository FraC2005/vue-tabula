# Stile

`vue-tabula` non dipende da Tailwind né da shadcn-vue a runtime. Il CSS di default (`vue-tabula/style.css`) è già compilato e usa le **variabili CSS di shadcn**, con valori di ripiego se non sono definite:

`--background`, `--foreground`, `--border`, `--muted`, `--muted-foreground`, `--accent`, `--primary`, `--ring`, `--radius`.

Se usi shadcn, la tabella eredita già il tuo tema (anche scuro). Altrimenti basta definire le variabili:

```css
:root {
  --background: #fff;
  --foreground: #0a0a0a;
  --border: #e5e5e5;
  --muted: #f5f5f5;
}
.dark {
  --background: #0a0a0a;
  --foreground: #fafafa;
  --border: #262626;
  --muted: #171717;
}
```

## Sovrascrivere le regole

Tutti gli stili stanno nel `@layer vue-tabula`: qualsiasi regola fuori da un layer (la tua, o quelle di Tailwind) ha la precedenza **senza `!important`**.

```css
.vt-row:hover > .vt-cell {
  background: hotpink;
}
```

## Classi per le parti principali

La prop `classes` aggiunge classi alle parti principali (si sommano a quelle di default `vt-*`):

```vue
<VtTable :classes="{ root: 'shadow-lg', headerCell: 'uppercase text-xs', cell: 'py-1' }" ... />
```

Parti disponibili: `root`, `toolbar`, `search`, `header`, `headerCell`, `filterRow`, `filterInput`, `loading`, `error`, `body`, `row`, `cell`, `empty`, `pagination`.

## Testi

I testi dell'interfaccia sono in inglese di default e si traducono con la prop `labels`:

```vue
<VtTable
  :labels="{
    search: 'Cerca',
    searchPlaceholder: 'Cerca…',
    empty: 'Nessun risultato',
    previousPage: 'Pagina precedente',
    nextPage: 'Pagina successiva',
    pageSize: 'Righe per pagina',
    summary: ({ start, end, total }) => `${start}–${end} di ${total}`,
    pageOf: (page, count) => `Pagina ${page} di ${count}`,
    filterColumn: (header) => `Filtra ${header}`,
    filterAll: 'Tutti',
    filterMin: 'Min',
    filterMax: 'Max',
    clearFilters: 'Azzera filtri',
    loading: 'Caricamento…',
    error: 'Impossibile caricare i dati',
    retry: 'Riprova',
    selectAll: 'Seleziona tutte le righe',
    selectRow: 'Seleziona la riga',
    selectedCount: (n) => `${n} selezionate`,
  }"
  ...
/>
```
