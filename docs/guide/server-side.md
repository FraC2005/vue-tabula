# Modalità server

Con `mode="server"` la tabella **non ordina, non filtra e non pagina**: mostra `rows` così come arrivano e usa `totalRows` per la paginazione. Ogni volta che l'utente cambia ordinamento, filtri, ricerca, pagina o dimensione di pagina, il componente emette l'evento **`request`** con lo stato completo; tu chiedi i dati al server e passi indietro `rows`, `totalRows` e `loading`.

La demo usa una **finta API locale** (10.000 righe generate nel browser, nessun servizio esterno): puoi cambiare la latenza, simulare errori e vedere cosa succede quando non si ignorano le risposte vecchie.

<script setup>
import ServerDemo from '../.vitepress/components/ServerDemo.vue'
</script>

<ClientOnly>
  <ServerDemo />
</ClientOnly>

## Il pattern standard

Usa **sempre `loading`**: tienilo acceso per tutta la durata della richiesta. Insieme a `signal` è lo schema da copiare.

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { VtTable } from 'vue-tabula'
import type { ColumnDef, TableRequest } from 'vue-tabula'

const rows = ref<Person[]>([])
const totalRows = ref<number>() // undefined = non ancora noto
const loading = ref(false)
const error = ref<unknown>(null)

async function load({ state, signal }: TableRequest) {
  loading.value = true
  error.value = null
  try {
    const params = new URLSearchParams({ state: JSON.stringify(state) })
    const response = await fetch(`/api/people?${params}`, { signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()

    if (signal.aborted) return // è partita una richiesta più recente: questa risposta è vecchia
    rows.value = data.rows
    totalRows.value = data.total
  } catch (e) {
    if (signal.aborted) return // AbortError: previsto, non è un errore da mostrare
    error.value = e
  } finally {
    // Se la richiesta è stata annullata ne è già partita un'altra, che ha acceso `loading`.
    if (!signal.aborted) loading.value = false
  }
}
</script>

<template>
  <VtTable
    mode="server"
    :rows="rows"
    :columns="columns"
    row-key="id"
    :total-rows="totalRows"
    :loading="loading"
    :error="error"
    @request="load"
  />
</template>
```

::: warning Perché `loading` non è facoltativo
Oltre all'indicatore e all'annuncio per gli screen reader, il componente usa `loading` per capire **quando `totalRows` è affidabile**. Se ripristini una pagina (da `v-model:state` o da `usePersistentTableState`) e il server ha ora meno pagine, la pagina viene riportata all'ultima valida **solo a caricamento finito**. Senza `loading` questa correzione **non avviene**: il componente non può distinguere un `totalRows` vecchio, ancora in memoria da prima della richiesta, da quello nuovo, e rischierebbe di scartare una pagina valida (per esempio con `totalRows` a `0` all'inizio). Il risultato senza `loading` è una pagina oltre l'ultima che resta com'è, con la tabella vuota.
:::

## L'evento `request`

```ts
interface TableRequest {
  state: TableState // sort, filters, globalSearch, page, pageSize (e il resto)
  signal: AbortSignal
  id: number // 1, 2, 3…
}
```

- **Quando parte.** Una volta dopo il montaggio (all'inizio del primo ciclo di aggiornamenti: se subito dopo il montaggio ripristini uno stato salvato, la richiesta usa quello stato e parte una sola volta) e a ogni modifica di ordinamento, filtri, ricerca, pagina o dimensione di pagina. Non parte per modifiche che non cambiano i dati (ordine, visibilità o larghezza delle colonne). Modifiche nello stesso istante si fondono in una richiesta.
- **Debounce.** I campi che si digitano (ricerca globale, filtri di testo e numerici) aspettano il [debounce](./filters#debounce) (250 ms di default) prima di cambiare lo stato, quindi prima di emettere `request`. Ordinamento, pagina e filtri a selezione partono subito.
- **Ordinamento e filtri → pagina 1.** Ogni cambio di ordinamento, filtri o ricerca riporta a pagina 1 (nello stesso `request`).
- **Lo stato è JSON.** `state` è un oggetto semplice: puoi inviarlo così com'è (query string, body) e rispecchia esattamente `TableState`. Non dimenticare che **`sortFn` e `filterFn` delle colonne sono ignorati**: ordinare e filtrare spetta al server.
- **Riprovare.** `refresh()` sul `ref` del componente rimanda la richiesta con lo stato corrente.
- **SSR/Nuxt.** `request` si emette solo nel browser, dopo il montaggio. Se hai già i dati della prima pagina dal server, puoi saltare la prima richiesta: controlla `request.id === 1` e che lo stato sia quello di default.

## Risposte fuori ordine

Se l'utente cambia pagina due volte di fila, la richiesta per la pagina 2 può rispondere **dopo** quella per la pagina 3: senza accorgimenti, la risposta vecchia sovrascrive la nuova e la tabella mostra dati che non corrispondono alla pagina indicata (provalo nella demo togliendo la spunta a «ignora le risposte vecchie»).

Per questo ogni `request` porta un **`signal`** (`AbortSignal`): il componente lo **annulla** quando parte una richiesta più recente e quando la tabella viene smontata. Due modi equivalenti per ignorare le risposte vecchie:

**1. `signal` (consigliato).** Passalo a `fetch` e controlla `signal.aborted` dopo ogni `await`, come nel pattern sopra. Il controllo serve anche se la tua API non rispetta il `signal`: copre entrambi i casi.

```ts
const data = await getPeople(state, { signal })
if (signal.aborted) return
```

**2. Un contatore.** Ricorda l'`id` più recente e scarta le risposte con un `id` minore.

```ts
let latest = 0

async function load({ state, id }: TableRequest) {
  latest = id
  const data = await getPeople(state)
  if (id !== latest) return // risposta vecchia
  rows.value = data.rows
}
```

Con il contatore l'API non viene interrotta e continua a lavorare per niente: il `signal` risparmia anche quel lavoro.

::: tip Due regole

- **Non mostrare `AbortError`.** Una richiesta annullata fa rifiutare `fetch` con `AbortError`: è normale, non un errore per l'utente (`if (signal.aborted) return` nel `catch`).
- **Spegni `loading` solo se non annullata.** Se la richiesta è stata annullata ne è già partita una nuova che ha acceso `loading`: spegnerlo mostrerebbe la tabella «pronta» mentre i dati stanno ancora arrivando.
  :::

## Caricamento: `loading`

- La griglia ha `aria-busy="true"` e compare una barra di caricamento (rispetta `prefers-reduced-motion`).
- Le **righe precedenti restano visibili**, attenuate, finché non arrivano le nuove: niente tabella che si svuota a ogni clic.
- Un annuncio «Loading…» arriva agli screen reader tramite una regione `role="status"`. Il testo si traduce con `labels.loading`.
- Se non ci sono ancora righe, la cella vuota mostra «Loading…» invece di «No results».
- Lo slot `loading` sostituisce la barra di default. È nascosto agli screen reader (c'è già l'annuncio), quindi non metterci informazioni essenziali.

```vue
<VtTable mode="server" :loading="loading" ...>
  <template #loading><MySpinner /></template>
</VtTable>
```

## Errori: `error`

Imposta `error` (qualunque valore non falsy) per mostrare un messaggio con `role="alert"`, in cima alla griglia. Le righe precedenti restano visibili. Il pulsante **Retry** rimanda la richiesta con lo stato corrente.

Lo slot `error` riceve `{ error, retry }` e sostituisce il messaggio di default:

```vue
<VtTable mode="server" :error="error" ...>
  <template #error="{ error, retry }">
    <span>Non riesco a caricare: {{ (error as Error).message }}</span>
    <button @click="retry">Riprova</button>
  </template>
</VtTable>
```

Azzera `error` quando parte una nuova richiesta (come fa il pattern sopra con `error.value = null`).

## Totale

`totalRows` è il numero di righe **che soddisfano i filtri**, non quelle della pagina. Finché non è noto lascialo `undefined`: la tabella non dichiara il numero di righe (`aria-rowcount="-1"`) e non tocca la pagina. Quando passi un numero, la paginazione e il riepilogo («11–20 of 10000») si calcolano su quello.

## Filtri a selezione: `filterOptions` obbligatorio

In modalità client le voci di un filtro `select` si ricavano dalle righe; in modalità server `rows` è solo la pagina corrente, quindi **non si possono ricavare**. Dichiara sempre `filterOptions`:

```ts
{ id: 'city', header: 'Città', filter: 'select', filterOptions: ['Roma', 'Milano', 'Torino'] }
```

Se manca, in sviluppo la libreria scrive un avviso in console (una volta per colonna) e il filtro resta con la sola voce «All».

## Selezione

La selezione per `rowKey` funziona anche lato server, con una differenza: **«seleziona tutte» (checkbox dell'intestazione), Ctrl/Cmd+A, lo stato indeterminato e gli intervalli con Maiusc valgono solo per la pagina corrente**, perché le altre righe non sono nel componente. Le chiavi selezionate in altre pagine restano selezionate e contate. Vedi [Selezione](./selection#chiavi-orfane).

## Stato e persistenza

`v-model:state` e [`usePersistentTableState`](./state) funzionano come in modalità client. Il ripristino **non riporta la pagina a 1**: una pagina salvata resta com'è finché non conosci `totalRows` (e dopo il caricamento scende all'ultima solo se il server ha meno pagine; vedi l'avviso su `loading` sopra). La prima richiesta usa già lo stato ripristinato.

## Riepilogo delle props e degli eventi

| Elemento               | Descrizione                                                                       |
| ---------------------- | --------------------------------------------------------------------------------- |
| `mode="server"`        | I dati restano al server                                                          |
| `totalRows`            | Righe totali che soddisfano i filtri (`undefined` = non ancora noto)              |
| `loading`              | Richiesta in corso: `aria-busy`, indicatore e annuncio, righe precedenti visibili |
| `error`                | Ultimo errore: messaggio con `role="alert"` e Retry                               |
| `@request`             | `{ state, signal, id }`: servono nuovi dati                                       |
| slot `loading`/`error` | Sostituiscono indicatore e messaggio di default                                   |
| `refresh()`            | Rimanda la richiesta con lo stato corrente                                        |
