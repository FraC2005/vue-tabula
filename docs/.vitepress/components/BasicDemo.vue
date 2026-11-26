<script setup lang="ts">
import { VtTable } from 'vue-tabula'
import type { ColumnDef } from 'vue-tabula'
import { makePeople } from './people'
import type { Person } from './people'

const rows = makePeople(200)

const columns: ColumnDef<Person>[] = [
  { id: 'id', header: 'ID', width: 80, align: 'right' },
  { id: 'name', header: 'Nome' },
  { id: 'city', header: 'Città' },
  { id: 'role', header: 'Reparto' },
  { id: 'age', header: 'Età', width: 90, align: 'right' },
  { id: 'salary', header: 'Stipendio', width: 130, align: 'right' },
  { id: 'active', header: 'Attivo', width: 100 },
]
</script>

<template>
  <VtTable :rows="rows" :columns="columns" row-key="id" aria-label="Persone">
    <template #cell-salary="{ value }">{{ Number(value).toLocaleString('it-IT') }} €</template>
    <template #cell-active="{ value }">{{ value ? 'Sì' : 'No' }}</template>
  </VtTable>
</template>
