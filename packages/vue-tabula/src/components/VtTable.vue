<script setup lang="ts" generic="T extends object">
import { computed } from 'vue'
import type { CellSlotProps, ColumnDef, RowKey } from '../types.js'
import { getCellValue } from '../core/accessor.js'

const props = defineProps<{
  rows: T[]
  columns: ColumnDef<T>[]
  /** Chiave della riga oppure funzione che la calcola. */
  rowKey: keyof T | ((row: T) => RowKey)
  ariaLabel?: string
}>()

defineSlots<{
  /** Slot di fallback per qualsiasi cella. */
  cell?(props: CellSlotProps<T>): unknown
  /** Slot per le celle di una colonna specifica: `cell-<columnId>`. */
  [name: `cell-${string}`]: ((props: CellSlotProps<T>) => unknown) | undefined
}>()

function keyOf(row: T): RowKey {
  const key = props.rowKey
  return typeof key === 'function' ? key(row) : (row[key] as RowKey)
}

const rowCount = computed(() => props.rows.length + 1)
</script>

<template>
  <div
    class="vt-root"
    role="grid"
    :aria-label="ariaLabel"
    :aria-rowcount="rowCount"
    :aria-colcount="columns.length"
  >
    <div class="vt-header" role="rowgroup">
      <div class="vt-row" role="row" :aria-rowindex="1">
        <div
          v-for="(column, c) in columns"
          :key="column.id"
          class="vt-header-cell"
          role="columnheader"
          :aria-colindex="c + 1"
        >
          {{ column.header }}
        </div>
      </div>
    </div>
    <div class="vt-body" role="rowgroup">
      <div
        v-for="(row, r) in rows"
        :key="keyOf(row)"
        class="vt-row"
        role="row"
        :aria-rowindex="r + 2"
      >
        <div
          v-for="(column, c) in columns"
          :key="column.id"
          class="vt-cell"
          role="gridcell"
          :aria-colindex="c + 1"
        >
          <slot
            :name="`cell-${column.id}`"
            :row="row"
            :column="column"
            :value="getCellValue(row, column)"
          >
            <slot name="cell" :row="row" :column="column" :value="getCellValue(row, column)">
              {{ getCellValue(row, column) }}
            </slot>
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="../styles/vue-tabula.css"></style>
