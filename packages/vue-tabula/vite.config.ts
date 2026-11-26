import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Build in modalità libreria: solo ESM, un file per modulo (preserveModules)
// così i bundler possono eliminare il codice non usato (tree-shaking).
export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2022',
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      cssFileName: 'style',
    },
    rollupOptions: {
      external: ['vue'],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
})
