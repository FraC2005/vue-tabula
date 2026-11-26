# Accessibilità

La tabella segue il pattern ARIA **grid**: `role="grid"`, `rowgroup`, `row`, `columnheader` e `gridcell`, con `aria-rowcount`, `aria-colcount`, `aria-rowindex` e `aria-colindex` (gli indici di riga sono assoluti, anche quando si mostra solo una pagina).

## Cosa espone

- Le intestazioni ordinabili espongono `aria-sort` (`ascending`, `descending`, `none`).
- Il riepilogo delle pagine è una regione `role="status"`: lo screen reader annuncia i cambi di pagina e di risultati.
- La riga dei filtri è una riga del grid (`aria-rowindex` 2) e ogni controllo ha un nome accessibile («Filter Nome»); gli indici delle righe dati tengono conto della riga in più.
- Il focus è visibile (`:focus-visible`).
- Passa `aria-label` alla tabella per darle un nome.

## Tastiera

La griglia è **un solo tab stop** (roving tabindex): Tab entra sulla cella attiva e un altro Tab esce dalla tabella senza attraversare tutte le celle. All'interno ci si muove così:

| Tasto                 | Azione                                                                      |
| --------------------- | --------------------------------------------------------------------------- |
| ← → ↑ ↓               | Sposta di una cella (ai bordi si resta fermi)                               |
| Home / Fine           | Prima / ultima cella della riga                                             |
| Ctrl+Home / Ctrl+Fine | Prima / ultima cella della griglia                                          |
| PageUp / PageDown     | 10 righe su / giù                                                           |
| Invio o F2            | Entra nel controllo della cella (filtro, link o pulsante nello slot)        |
| Invio o Spazio        | Su un'intestazione: ordina (con Maiusc, aggiunge la colonna)                |
| Esc                   | Dentro un controllo: torna alla cella e applica subito ciò che hai digitato |

Dentro un controllo (campo di testo, menu) i tasti funzionano normalmente: le frecce muovono il cursore o cambiano la voce, non la cella. La riga 0 è l'intestazione, la 1 i filtri (se ci sono), poi le righe della pagina.

I controlli predefiniti (campi dei filtri, pulsante di ordinamento) non sono raggiungibili con Tab: si entra con Invio o F2. Il contenuto degli slot è tuo: un link o un pulsante che inserisci in una cella resta tabbabile; per avere un solo tab stop dai `tabindex="-1"`.

Il metodo esposto `focusCell(row, col)` sposta il focus su una cella.

::: info Ancora in arrivo
La navigazione con la virtualizzazione (righe non presenti nel DOM) e l'audit completo con screen reader arrivano nella 0.7.0.
:::
