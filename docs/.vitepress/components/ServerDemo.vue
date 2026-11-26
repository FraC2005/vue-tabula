<script setup lang="ts">
import { computed, ref } from 'vue'
import { VtTable, usePersistentTableState } from 'vue-tabula'
import type { ColumnDef, RowKey, TableRequest } from 'vue-tabula'
import { TOTAL_ROWS, fetchPeople } from './fakeApi'
import { cities, roles } from './people'
import type { Person } from './people'

// --- Colonne: in modalità server `filterOptions` è obbligatorio per i filtri a selezione ---
const columns: ColumnDef<Person>[] = [
  { id: 'id', header: 'ID', width: 80, align: 'right' },
  { id: 'name', header: 'Nome', filter: 'text' },
  { id: 'city', header: 'Città', filter: 'select', filterOptions: cities },
  { id: 'role', header: 'Reparto', filter: 'select', filterOptions: roles },
  { id: 'age', header: 'Età', width: 150, align: 'right', filter: 'number' },
]

// --- Parametri della finta API (attivabili dalla demo) ---
const latencyChoice = ref<'fast' | 'random' | 'slow'>('random')
const failRequests = ref(false)
const ignoreStale = ref(true)

const LATENCIES = { fast: [80, 250], random: [100, 1600], slow: [1500, 3000] } as const

// --- Stato della richiesta: il pattern standard ---
const rows = ref<Person[]>([])
const totalRows = ref<number | undefined>(undefined)
const loading = ref(false)
const error = ref<unknown>(null)
const selected = ref<RowKey[]>([])

const { state, reset, error: storageError } = usePersistentTableState('vue-tabula-docs:server-demo')

const log = ref<string[]>([])
function note(message: string) {
  log.value = [message, ...log.value].slice(0, 8)
}

async function load({ state: requested, signal, id }: TableRequest) {
  loading.value = true
  error.value = null
  const label = `#${id} · pagina ${requested.page}`
  try {
    const response = await fetchPeople(requested, columns, {
      latency: LATENCIES[latencyChoice.value],
      fail: failRequests.value,
      // Con «ignora risposte vecchie» disattivato l'API non rispetta il signal.
      signal: ignoreStale.value ? signal : undefined,
    })
    if (ignoreStale.value && signal.aborted) {
      note(`${label} → risposta vecchia, scartata`)
      return
    }
    rows.value = response.rows
    totalRows.value = response.total
    note(`${label} → mostrata (${response.took} ms)`)
  } catch (e) {
    if (ignoreStale.value && signal.aborted) {
      note(`${label} → annullata`) // AbortError: previsto, non è un errore da mostrare
      return
    }
    error.value = e
    note(`${label} → errore`)
  } finally {
    // Se la richiesta è stata annullata ne è già partita un'altra: `loading` resta acceso.
    if (!ignoreStale.value || !signal.aborted) loading.value = false
  }
}

const json = computed(() =>
  state.value ? JSON.stringify(state.value, null, 2) : '(nessuno stato)',
)
</script>

<template>
  <div class="server-demo">
    <fieldset class="controls">
      <legend>Finta API (10.000 righe, nel browser)</legend>
      <label>
        Latenza
        <select v-model="latencyChoice">
          <option value="fast">veloce (80–250 ms)</option>
          <option value="random">casuale (100–1600 ms)</option>
          <option value="slow">lenta (1,5–3 s)</option>
        </select>
      </label>
      <label><input v-model="failRequests" type="checkbox" /> simula errori (500)</label>
      <label>
        <input v-model="ignoreStale" type="checkbox" /> ignora le risposte vecchie
        (<code>signal</code>)
      </label>
      <button type="button" class="demo-btn" @click="reset">Reset</button>
    </fieldset>
    <p v-if="!ignoreStale" class="demo-warning">
      Senza controllo: cambia pagina in fretta con la latenza casuale e osserva che una risposta
      lenta e vecchia può sovrascrivere quella più recente (la pagina mostrata non corrisponde a
      quella indicata).
    </p>
    <p v-if="storageError" class="demo-warning">
      Lo stato non può essere salvato (storage non disponibile).
    </p>

    <VtTable
      v-model:state="state"
      v-model:selected="selected"
      mode="server"
      :rows="rows"
      :columns="columns"
      row-key="id"
      :total-rows="totalRows"
      :loading="loading"
      :error="error"
      selection="multiple"
      aria-label="Persone (dati dal server)"
      :page-size="10"
      @request="load"
    >
      <template #error="{ error: failure, retry }">
        <span>{{ (failure as Error).message }}</span>
        <button type="button" class="demo-btn" @click="retry">Riprova</button>
      </template>
    </VtTable>

    <p>
      Selezionate: <strong>{{ selected.length }}</strong> (la checkbox dell'intestazione vale solo
      per la pagina corrente) · Totale sul server:
      <strong>{{ TOTAL_ROWS.toLocaleString('it-IT') }}</strong>
    </p>

    <details open>
      <summary>Richieste</summary>
      <ul class="log">
        <li v-for="(line, i) in log" :key="`${i}-${line}`">{{ line }}</li>
        <li v-if="!log.length">(nessuna ancora)</li>
      </ul>
    </details>
    <details>
      <summary>Stato corrente (JSON)</summary>
      <pre>{{ json }}</pre>
    </details>
  </div>
</template>

<style scoped>
.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.25rem;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
}
.demo-btn {
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}
.demo-warning {
  color: var(--vp-c-warning-1);
}
.log {
  margin: 0.25rem 0;
  padding-left: 1.25rem;
  font-family: var(--vp-font-family-mono);
  font-size: 0.8rem;
}
pre {
  max-height: 16rem;
  overflow: auto;
  font-size: 0.8rem;
}
</style>
