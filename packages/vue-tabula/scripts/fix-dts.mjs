// Post-processing dei file .d.ts generati da vue-tsc.
//
// PERCHÉ ESISTE
// vue-tsc emette `Componente.vue.d.ts` e negli altri .d.ts lascia gli
// specificatori `./Componente.vue`. Noi però pubblichiamo JavaScript con
// estensione `.js` (`Componente.js`, generato da Vite). In node16/ESM lo
// specificatore `.vue` non si risolve, e gli strumenti come
// @arethetypeswrong/cli segnalano "Internal resolution error": chi usa la
// libreria da TypeScript con `moduleResolution: node16/nodenext` non
// vedrebbe i tipi. Qui rinominiamo `X.vue.d.ts` in `X.d.ts` e riscriviamo gli
// specificatori `X.vue` in `X.js`, così tipi e JS combaciano.
//
// QUANDO SI PUÒ ELIMINARE
// Quando vue-tsc emetterà dichiarazioni che si risolvono in node16/ESM senza
// aiuto (o se la libreria non avrà più file `.vue` nell'API pubblica).
// Verifica: togli `node scripts/fix-dts.mjs` dallo script `build`, ricostruisci
// e lancia `pnpm check:package`. Se passa, elimina questo file.
import { readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dist = new URL('../dist', import.meta.url).pathname

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  )
}

for (const file of walk(dist)) {
  if (file.endsWith('.vue.d.ts')) renameSync(file, file.replace(/\.vue\.d\.ts$/, '.d.ts'))
}

for (const file of walk(dist).filter((f) => f.endsWith('.d.ts'))) {
  const source = readFileSync(file, 'utf8')
  const fixed = source.replace(/(from\s+|import\s*\()(['"])(\.[^'"]*?)\.vue\2/g, '$1$2$3.js$2')
  if (fixed !== source) writeFileSync(file, fixed)
}
