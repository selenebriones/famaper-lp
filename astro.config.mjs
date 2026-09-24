import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// La landing se publica como sitio estático dentro de fmpracks.com, bajo el
// prefijo /racks-industriales. No hay Node en ese servidor (Plesk + Apache),
// así que el formulario pega a /api/lead, que resuelve el Laravel del sitio
// principal. Ver docs/DEPLOY.md.
export default defineConfig({
  site: 'https://fmpracks.com',
  base: '/racks-industriales',
  output: 'static',
  trailingSlash: 'ignore',

  vite: {
    plugins: [tailwindcss()],
  },
});
