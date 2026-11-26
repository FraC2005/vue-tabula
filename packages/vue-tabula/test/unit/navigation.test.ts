import { describe, expect, it } from 'vitest'
import { clampPosition, moveGridPosition } from '../../src/core/navigation'

const bounds = { rowCount: 20, colCount: 4, pageJump: 5 }
const move = (row: number, col: number, key: string, ctrl = false) =>
  moveGridPosition({ row, col }, key, ctrl, bounds)

describe('moveGridPosition', () => {
  it('le frecce spostano di una cella', () => {
    expect(move(3, 2, 'ArrowUp')).toEqual({ row: 2, col: 2 })
    expect(move(3, 2, 'ArrowDown')).toEqual({ row: 4, col: 2 })
    expect(move(3, 2, 'ArrowLeft')).toEqual({ row: 3, col: 1 })
    expect(move(3, 2, 'ArrowRight')).toEqual({ row: 3, col: 3 })
  })

  it('ai bordi si resta fermi, senza andare a capo', () => {
    expect(move(0, 0, 'ArrowUp')).toEqual({ row: 0, col: 0 })
    expect(move(0, 0, 'ArrowLeft')).toEqual({ row: 0, col: 0 })
    expect(move(19, 3, 'ArrowDown')).toEqual({ row: 19, col: 3 })
    expect(move(19, 3, 'ArrowRight')).toEqual({ row: 19, col: 3 })
  })

  it('Home/End vanno a inizio e fine riga; con Ctrl agli angoli', () => {
    expect(move(7, 2, 'Home')).toEqual({ row: 7, col: 0 })
    expect(move(7, 2, 'End')).toEqual({ row: 7, col: 3 })
    expect(move(7, 2, 'Home', true)).toEqual({ row: 0, col: 0 })
    expect(move(7, 2, 'End', true)).toEqual({ row: 19, col: 3 })
  })

  it('PageUp/PageDown saltano pageJump righe e si fermano ai bordi', () => {
    expect(move(7, 1, 'PageDown')).toEqual({ row: 12, col: 1 })
    expect(move(7, 1, 'PageUp')).toEqual({ row: 2, col: 1 })
    expect(move(17, 1, 'PageDown')).toEqual({ row: 19, col: 1 })
    expect(move(2, 1, 'PageUp')).toEqual({ row: 0, col: 1 })
  })

  it('restituisce null per i tasti che non sono di navigazione', () => {
    expect(move(1, 1, 'a')).toBeNull()
    expect(move(1, 1, 'Enter')).toBeNull()
    expect(move(1, 1, 'Escape')).toBeNull()
  })

  it('funziona con una griglia vuota o di una cella', () => {
    expect(
      moveGridPosition({ row: 0, col: 0 }, 'ArrowDown', false, { rowCount: 0, colCount: 0 }),
    ).toEqual({
      row: 0,
      col: 0,
    })
  })
})

describe('clampPosition', () => {
  it('riporta la posizione nei limiti', () => {
    expect(clampPosition({ row: 99, col: -3 }, bounds)).toEqual({ row: 19, col: 0 })
  })
})
