import { defineConfig } from 'vitepress'

// `base` serve a GitHub Pages (https://<utente>.github.io/vue-tabula/); si imposta da CI.
export default defineConfig({
  title: 'vue-tabula',
  description: 'Componente tabella dati avanzato per Vue 3',
  lang: 'it-IT',
  base: process.env.DOCS_BASE ?? '/',
  cleanUrls: true,
  themeConfig: {
    nav: [{ text: 'Guida', link: '/guide/getting-started' }],
    sidebar: [{ text: 'Guida', items: [{ text: 'Per iniziare', link: '/guide/getting-started' }] }],
    socialLinks: [{ icon: 'github', link: 'https://github.com/FraC2005/vue-tabula' }],
  },
})
