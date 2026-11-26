export interface Person {
  id: number
  name: string
  city: string
  role: string
  age: number
  salary: number
  active: boolean
}

const names = [
  'Ada',
  'Linus',
  'Grace',
  'Alan',
  'Margaret',
  'Dennis',
  'Barbara',
  'Tim',
  'Anna',
  'José',
]
const surnames = [
  'Lovelace',
  'Torvalds',
  'Hopper',
  'Turing',
  'Hamilton',
  'Ritchie',
  'Liskov',
  'Berners-Lee',
  'Rossi',
  'Álvarez',
]
export const cities = [
  'Roma',
  'Milano',
  'Torino',
  'Napoli',
  'Bologna',
  'Firenze',
  'Madrid',
  'Londra',
]
export const roles = ['Sviluppo', 'Design', 'Prodotto', 'Dati', 'Supporto']

/** Genera righe di esempio deterministiche (stesso risultato a ogni caricamento, anche in SSR). */
export function makePeople(count: number): Person[] {
  let seed = 42
  const next = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
  const pick = <T>(list: T[]) => list[Math.floor(next() * list.length)] as T
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${pick(names)} ${pick(surnames)}`,
    city: pick(cities),
    role: pick(roles),
    age: 20 + Math.floor(next() * 45),
    salary: 25000 + Math.floor(next() * 60) * 1000,
    active: next() > 0.3,
  }))
}
