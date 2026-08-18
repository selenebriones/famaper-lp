# Famaper — Landing Page

Landing page comercial de **Famaper / FMP Racks**: fabricación, diseño e instalación de racks industriales y sistemas de almacenamiento a la medida, con cobertura nacional en México.

Sitio estático de una sola página, enfocado en la captación de leads B2B (directores de CEDIS y gerentes de logística).

---

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| [Astro](https://astro.build) | ^7.0 | Framework, generación estática |
| [Tailwind CSS](https://tailwindcss.com) | ^4.3 | Estilos, vía `@tailwindcss/vite` y directiva `@theme` |
| [GSAP + ScrollTrigger](https://gsap.com) | 3.12.5 | Animaciones de revelado al hacer scroll (CDN) |
| [Swiper](https://swiperjs.com) | 11 | Carrusel de productos (CDN) |
| [Phosphor Icons](https://phosphoricons.com) | latest | Iconografía (CDN) |
| [Poppins](https://fonts.google.com/specimen/Poppins) | 300–800 | Tipografía (Google Fonts) |

> GSAP, Swiper, Phosphor y Poppins se cargan por CDN desde `src/layouts/Layout.astro`. No son dependencias de npm.

Requiere **Node.js >= 22.12.0**.

---

## Instalación y comandos

```bash
npm install
```

| Comando | Acción |
|---|---|
| `npm run dev` | Servidor de desarrollo en `http://localhost:4321` |
| `npm run build` | Compila el sitio estático a `./dist/` |
| `npm run preview` | Sirve localmente el build de producción |

---

## Estructura del proyecto

```
famaper-lp/
├── public/
│   ├── favicon.ico
│   └── images/            # Logo, fotos de producto, fondos de sección
├── src/
│   ├── layouts/
│   │   └── Layout.astro   # <head> + SEO, CDNs, header fijo, footer, init de GSAP
│   ├── pages/
│   │   └── index.astro    # Landing completa: contenido, markup y scripts
│   └── styles/
│       └── global.css     # Tokens @theme de Tailwind v4 y utilidades
├── astro.config.mjs
└── package.json
```

Todo el contenido editable (servicios, productos, metodología, oficinas) vive en **arreglos al inicio de `src/pages/index.astro`**, dentro del frontmatter. Para agregar o modificar un producto u oficina basta con editar esos arreglos: el markup se genera solo.

---

## Design System

Definido con la directiva `@theme` de Tailwind v4 en `src/styles/global.css`:

| Token | Valor | Uso |
|---|---|---|
| `--color-brand-primary` | `#ECCF52` | Amarillo industrial. CTAs, iconos, acentos |
| `--color-brand-secondary` | `#EEEEEE` | Gris claro. Fondos de sección y footer |
| `--color-brand-surface` | `#FFFFFF` | Fondo principal |
| `--color-brand-dark` | `#121212` | Negro carbón. Tarjetas oscuras, sección de oficinas |
| `--color-brand-text` | `#000000` | Texto principal |
| `--color-brand-muted` | `#4A4A4A` | Texto secundario |
| `--font-sans` | Poppins | Tipografía única del sitio |

Se usan como clases normales de Tailwind: `bg-brand-primary`, `text-brand-muted`, etc.

---

## Secciones de la landing

1. **Hero** — Video MP4 propio de fondo (`public/videos/video_famaper_480p.mp4`, silenciado y en loop) con capa oscura.
2. **Servicios** — Consultoría, Diseño, Fabricación e Instalación.
3. **Banda E-E-A-T** — +20 años de experiencia, ISO 9001 y NOM-STPS-006, sobre imagen con degradado.
4. **Productos** — Menorack y Selectivo como tarjetas destacadas, más un carrusel Swiper (3 por vista, autoplay 3.5s) con los otros 8 sistemas.
5. **Metodología** — Los 3 pasos del proyecto.
6. **Cobertura nacional** — 4 sedes con dirección completa y 6 oficinas adicionales con teléfono.
7. **Contacto** — Datos directos, Política de Calidad y formulario de cotización.

---

## Animaciones

GSAP se registra en `Layout.astro` y las animaciones se declaran al final de `index.astro`, siempre dentro de `document.addEventListener('DOMContentLoaded', ...)`.

Clases que dispara ScrollTrigger:

- `.anim-card` — Entrada con desplazamiento vertical y fade para tarjetas de servicios, productos, metodología y oficinas.
- `.hero-content > *` — Revelado escalonado del hero al cargar.
- `.section-title` — Revelado de los títulos de sección.

En `prefers-reduced-motion` se desactiva el video de fondo del hero y el scroll suave.

---

## Pendientes antes de producción

- [ ] **`public/images/og-famaper.jpg`** — Imagen para Open Graph y Twitter Card (recomendado 1200×630). Referenciada en `Layout.astro`.
- [ ] **Conectar el formulario.** Hoy solo valida en cliente y muestra un mensaje de confirmación; no envía nada. Falta el endpoint (`src/pages/api/lead.ts`) y el destino de los leads (n8n, Sheets, Brevo o CRM).
- [ ] **Páginas legales.** El footer enlaza a `/politicas-de-privacidad` y `/terminos-y-condiciones`, que aún no existen.
- [ ] **Dominio real** en `Astro.site` (`astro.config.mjs`) para que la URL canónica y las etiquetas OG apunten correctamente.
- [ ] **Optimizar imágenes de producto.** Los PNG suman ~4.6 MB. Convertirlos a WebP reduciría el peso ~80% sin pérdida visible.
- [ ] Verificar si `public/images/foto_20anios.webp` sigue en uso; hoy no se referencia en el código.
- [ ] **Peso del video del hero.** El MP4 pesa 3.8 MB y se descarga con `preload="auto"`. Si afecta el tiempo de carga en móvil, valorar una versión más corta o `preload="metadata"`.

---

## Notas de mantenimiento

- **Anclas del menú:** `#servicios`, `#productos`, `#metodologia`, `#calidad` y `#contacto`. Si se renombra un `id`, hay que actualizar `navLinks` en `Layout.astro`.
- **Iconos:** Se usan clases de Phosphor (`ph-bold ph-nombre`). Un nombre inexistente no lanza error, simplemente no dibuja nada. Verificar en [phosphoricons.com](https://phosphoricons.com) antes de usar uno nuevo.
- **Grid de productos:** Las tarjetas destacadas ocupan 2 columnas. Al agregar productos hay que cuidar que el total de columnas cierre filas completas para no dejar huecos.
# famaper-lp
