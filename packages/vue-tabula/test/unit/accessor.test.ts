import { describe, expect, it } from 'vitest'
import { getCellValue } from '../../src/core/accessor'
import type { ColumnDef } from '../../src/types'

interface Persona {
  nome: string
  eta: number
}
const riga: Persona = { nome: 'Ada', eta: 36 }

describe('getCellValue', () => {
  it('usa l’id come chiave di ripiego', () => {
    const col: ColumnDef<Persona> = { id: 'nome', header: 'Nome' }
    expect(getCellValue(riga, col)).toBe('Ada')
  })

  it('usa la chiave indicata nell’accessor', () => {
    const col: ColumnDef<Persona> = { id: 'x', header: 'Età', accessor: 'eta' }
    expect(getCellValue(riga, col)).toBe(36)
  })

  it('usa la funzione accessor', () => {
    const col: ColumnDef<Persona> = {
      id: 'x',
      header: 'Descrizione',
      accessor: (r) => `${r.nome} (${r.eta})`,
    }
    expect(getCellValue(riga, col)).toBe('Ada (36)')
  })
})
