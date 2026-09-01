import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // Las páginas siguen siendo estáticas; solo /api/lead corre en el servidor
  // (marcado con `export const prerender = false`).
  adapter: vercel(),

  vite: {
    plugins: [tailwindcss()],
  },
});
