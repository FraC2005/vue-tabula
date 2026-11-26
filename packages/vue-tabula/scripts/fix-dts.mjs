// Post-processing dei file .d.ts generati da vue-tsc.
//
// vue-tsc emette `Componente.vue.d.ts` e negli altri .d.ts lascia l'import
// `./Componente.vue`, che in node16/ESM non si risolve. Il JavaScript emesso da
// Vite è invece `Componente.js`. Qui rinominiamo `X.vue.d.ts` in `X.d.ts` e
// riscriviamo gli specificatori `X.vue` in `X.js`, così tipi e JS combaciano.
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
