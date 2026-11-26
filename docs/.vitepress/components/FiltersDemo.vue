<script setup lang="ts">
import { VtTable } from 'vue-tabula'
import type { ColumnDef } from 'vue-tabula'
import { makePeople } from './people'
import type { Person } from './people'

const rows = makePeople(300)

const columns: ColumnDef<Person>[] = [
  { id: 'id', header: 'ID', width: 80, align: 'right' },
  { id: 'name', header: 'Nome', filter: 'text' },
  { id: 'city', header: 'Città', filter: 'select' },
  { id: 'role', header: 'Reparto', filter: 'select' },
  { id: 'age', header: 'Età', width: 150, align: 'right', filter: 'number' },
  {
    id: 'active',
    header: 'Attivo',
    width: 110,
    filter: 'select',
    filterOptions: [
      { label: 'Sì', value: true },
      { label: 'No', value: false },
    ],
  },
]
</script>

<template>
  <VtTable
    :rows="rows"
    :columns="columns"
    row-key="id"
    aria-label="Persone con filtri"
    :page-size="10"
  >
    <template #cell-active="{ value }">{{ value ? 'Sì' : 'No' }}</template>
  </VtTable>
</template>
