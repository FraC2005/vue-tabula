/** Posizione logica di una cella: riga e colonna a partire da 0 (la riga 0 è l'intestazione). */
export interface GridPosition {
  row: number
  col: number
}

export interface GridBounds {
  rowCount: number
  colCount: number
  /** Quante righe saltano PageUp/PageDown. */
  pageJump?: number
}

/** Porta una posizione dentro i limiti della griglia. */
export function clampPosition(position: GridPosition, bounds: GridBounds): GridPosition {
  return {
    row: Math.min(Math.max(0, position.row), Math.max(0, bounds.rowCount - 1)),
    col: Math.min(Math.max(0, position.col), Math.max(0, bounds.colCount - 1)),
  }
}

/**
 * Calcola la cella raggiunta premendo un tasto di navigazione del pattern ARIA grid.
 * Restituisce `null` se il tasto non è di navigazione. Non c'è "a capo": ai bordi si resta fermi.
 *
 * - Frecce: una cella nella direzione indicata.
 * - Home / End: prima / ultima cella della riga; con Ctrl, prima / ultima cella della griglia.
 * - PageUp / PageDown: `pageJump` righe su / giù (default 10).
 */
export function moveGridPosition(
  position: GridPosition,
  key: string,
  ctrl: boolean,
  bounds: GridBounds,
): GridPosition | null {
  const lastRow = Math.max(0, bounds.rowCount - 1)
  const lastCol = Math.max(0, bounds.colCount - 1)
  const jump = Math.max(1, bounds.pageJump ?? 10)
  const { row, col } = position

  let next: GridPosition
  switch (key) {
    case 'ArrowUp':
      next = { row: row - 1, col }
      break
    case 'ArrowDown':
      next = { row: row + 1, col }
      break
    case 'ArrowLeft':
      next = { row, col: col - 1 }
      break
    case 'ArrowRight':
      next = { row, col: col + 1 }
      break
    case 'Home':
      next = ctrl ? { row: 0, col: 0 } : { row, col: 0 }
      break
    case 'End':
      next = ctrl ? { row: lastRow, col: lastCol } : { row, col: lastCol }
      break
    case 'PageUp':
      next = { row: row - jump, col }
      break
    case 'PageDown':
      next = { row: row + jump, col }
      break
    default:
      return null
  }
  return clampPosition(next, bounds)
}
