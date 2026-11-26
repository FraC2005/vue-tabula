# Accessibilità

La tabella segue il pattern ARIA **grid**: `role="grid"`, `rowgroup`, `row`, `columnheader` e `gridcell`, con `aria-rowcount`, `aria-colcount`, `aria-rowindex` e `aria-colindex` (gli indici di riga sono assoluti, anche quando si mostra solo una pagina).

In 0.1.0:

- Le intestazioni ordinabili espongono `aria-sort` (`ascending`, `descending`, `none`) e contengono un vero `<button>`, raggiungibile con Tab e attivabile con Invio e Spazio.
- Il riepilogo delle pagine è una regione `role="status"`: lo screen reader annuncia i cambi di pagina e di risultati.
- Il focus è visibile (`:focus-visible`).
- Passa `aria-label` alla tabella per darle un nome.

::: info Navigazione completa da tastiera
La navigazione tra celle con le frecce (focus per cella) e l'audit completo con screen reader arrivano nella 0.7.0.
:::
