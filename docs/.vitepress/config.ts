import { defineConfig } from 'vitepress'

// `base` serve a GitHub Pages (https://<utente>.github.io/vue-tabula/); si imposta da CI.
export default defineConfig({
  title: 'vue-tabula',
  description: 'Componente tabella dati avanzato per Vue 3',
  lang: 'it-IT',
  base: process.env.DOCS_BASE ?? '/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Guida', link: '/guide/getting-started' },
      { text: 'API', link: '/guide/api' },
    ],
    sidebar: [
      {
        text: 'Guida',
        items: [
          { text: 'Per iniziare', link: '/guide/getting-started' },
          { text: 'Ordinamento, ricerca e pagine', link: '/guide/sorting-search-pagination' },
          { text: 'Filtri per colonna', link: '/guide/filters' },
          { text: 'Modalità server', link: '/guide/server-side' },
          { text: 'Selezione delle righe', link: '/guide/selection' },
          { text: 'Stato e persistenza', link: '/guide/state' },
          { text: 'Celle personalizzate', link: '/guide/slots' },
          { text: 'Stile', link: '/guide/styling' },
          { text: 'Accessibilità', link: '/guide/accessibility' },
        ],
      },
      { text: 'Riferimento', items: [{ text: 'API', link: '/guide/api' }] },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/FraC2005/vue-tabula' }],
  },
})
