<script setup lang="ts">
import { computed } from 'vue'
import { VtTable, usePersistentTableState } from 'vue-tabula'
import type { ColumnDef } from 'vue-tabula'
import { makePeople } from './people'
import type { Person } from './people'

const rows = makePeople(200)

const columns: ColumnDef<Person>[] = [
  { id: 'id', header: 'ID', width: 80, align: 'right' },
  { id: 'name', header: 'Nome', filter: 'text' },
  { id: 'city', header: 'Città', filter: 'select' },
  { id: 'age', header: 'Età', width: 150, align: 'right', filter: 'number' },
]

// Salva in localStorage a ogni cambio e ripristina al ricaricamento.
const { state, reset, error } = usePersistentTableState('vue-tabula-docs:persistent-demo')

function reload() {
  window.location.reload()
}

const json = computed(() =>
  state.value ? JSON.stringify(state.value, null, 2) : '(ancora nessuno stato)',
)
</script>

<template>
  <div class="persistent-demo">
    <p>
      Ordina, filtra, cambia pagina, poi
      <button type="button" class="demo-btn" @click="reload">ricarica la pagina</button>
      : la tabella riparte da dove l'avevi lasciata.
      <button type="button" class="demo-btn" @click="reset">Reset</button>
    </p>
    <p v-if="error" class="demo-warning">
      Il salvataggio non è disponibile (storage disabilitato o pieno): la tabella funziona comunque,
      ma senza persistenza.
    </p>
    <VtTable
      v-model:state="state"
      :rows="rows"
      :columns="columns"
      row-key="id"
      aria-label="Persone con stato salvato"
      :page-size="10"
    />
    <details>
      <summary>Stato corrente (JSON)</summary>
      <pre>{{ json }}</pre>
    </details>
  </div>
</template>

<style scoped>
.demo-btn {
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}
.demo-warning {
  color: var(--vp-c-warning-1);
}
pre {
  max-height: 16rem;
  overflow: auto;
  font-size: 0.8rem;
}
</style>
