<script setup lang="ts">
import { ref } from 'vue'
import { VtTable } from 'vue-tabula'
import type { ColumnDef, RowKey } from 'vue-tabula'
import { makePeople } from './people'
import type { Person } from './people'

const rows = makePeople(120)
const selected = ref<RowKey[]>([])

const columns: ColumnDef<Person>[] = [
  { id: 'id', header: 'ID', width: 80, align: 'right' },
  { id: 'name', header: 'Nome', filter: 'text' },
  { id: 'city', header: 'Città', filter: 'select' },
  { id: 'role', header: 'Reparto', filter: 'select' },
]
</script>

<template>
  <div class="selection-demo">
    <p>
      Righe selezionate: <strong>{{ selected.length }}</strong>
      <button v-if="selected.length" type="button" class="clear" @click="selected = []">
        Deseleziona
      </button>
    </p>
    <VtTable
      v-model:selected="selected"
      :rows="rows"
      :columns="columns"
      row-key="id"
      selection="multiple"
      aria-label="Persone con selezione"
      :page-size="10"
    />
  </div>
</template>

<style scoped>
.clear {
  margin-left: 0.75rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
}
</style>
