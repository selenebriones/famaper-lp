# Publicación en fmpracks.com/racks-industriales

## Cómo está armado

La landing se publica **estática** dentro del sitio principal, no en Vercel.

```
fmpracks.com  (Plesk + nginx + Apache, PHP 8.4)
│
├── /                      Laravel 8  (repo FuturiteDev/Famaper)
├── /api/lead              Laravel 8  ← el formulario de la landing pega aquí
└── /racks-industriales/   HTML estático (este repo, compilado)
```

El servidor **no tiene Node**, así que el endpoint SSR original (`src/pages/api/lead.ts`,
adaptador de Vercel) se reimplementó en PHP dentro del Laravel que ya corre ahí:
`app/Http/Controllers/LeadLpController.php` en el repo `Famaper`. El contrato de
respuesta es idéntico al que tenía el endpoint de Astro, así que el JavaScript del
formulario no cambió más que la URL.

El `.htaccess` de la raíz de `Famaper` deja pasar el prefijo sin tocarlo:

```apache
RewriteRule ^racks-industriales(/|$) - [L]
```

Esa línea va **antes** del rewrite a `public/`. Si se quita, Laravel responde 404.

## Publicar un cambio

Los cambios se hacen **siempre en este repo**, en `src/`. La carpeta
`Famaper/racks-industriales/` es salida compilada: `deploy.sh` la borra y la
reescribe completa en cada corrida, así que lo que se edite ahí se pierde.

```bash
./deploy.sh
```

Compila y copia `dist/` a `../Famaper/racks-industriales/` con `rsync --delete`.
Después hay que commitear y subir en el repo `Famaper`, que es lo que Plesk
sincroniza como docroot:

```bash
cd ../Famaper && git add racks-industriales && git commit -m "..." && git push
```

Y en Plesk, **Git → Pull**.

> El build se versiona a propósito dentro de `Famaper`: Plesk solo sincroniza ese
> repo, y así publicar la landing es el mismo `pull` de siempre.

### Los dos candados de `deploy.sh`

- **Aborta si hay cambios sin commitear.** Lo que se publica tiene que
  corresponder a un commit que exista; si no, nadie puede reproducir después lo
  que quedó en línea.
- **Avisa si el commit no está en GitHub.** No aborta —a veces urge— pero deja
  claro el riesgo.

### Saber qué versión está publicada

`deploy.sh` sella el build con el commit de origen:

```bash
curl -s https://fmpracks.com/racks-industriales/version.json
```

Ese `commit` es de **este** repo, no del de `Famaper`. Sirve para responder
"¿ya subió mi cambio?" sin entrar al servidor.

## El prefijo `/racks-industriales`

`base` en `astro.config.mjs` reescribe lo que Astro genera, **pero no los strings
literales del markup**. Por eso toda ruta absoluta se construye con la constante
`base` del frontmatter:

```astro
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
...
<img src={`${base}/images/foo.webp`} />
```

Los dos `<script>` de `index.astro` son `is:inline`, así que Vite **no** los procesa
y `import.meta.env.BASE_URL` no se sustituye ahí. El valor entra por `define:vars`:

```astro
<script is:inline define:vars={{ BASE: base }}>
```

La única ruta que **no** lleva prefijo es `fetch('/api/lead')`: ese endpoint no es
parte de la landing, lo resuelve Laravel en la raíz del dominio.

## Probar en local sin mandar leads reales

El endpoint entrega a la API de Futurité, que registra el lead en el CRM y dispara
el correo a ventas. Para probar sin generar leads de verdad, en el `.env` de
`Famaper`:

```
FUTURITE_LEADS_ENDPOINT=http://127.0.0.1:8124/sink
```

Y levantar cualquier servidor que responda 200 en ese puerto. Las pruebas
automáticas (`vendor/bin/phpunit --filter LeadLpTest`) ya falsean la red con
`Http::fake()` y no necesitan nada de esto.

## Variables de entorno (en el `.env` del servidor)

Todas son opcionales: `config/services.php` trae los valores de producción por
defecto. Solo hay que declararlas para sobreescribirlas.

| Variable | Para qué |
|---|---|
| `N8N_LEAD_WEBHOOK_URL` | Webhook que alimenta el Google Sheet. **Vacío hoy**: mientras no se active el workflow, el lead viaja solo por Futurité |
| `FUTURITE_LEADS_ENDPOINT` | Endpoint de la API de leads |
| `FUTURITE_API_KEY` | Identifica al cliente (194) |
| `FUTURITE_LEAD_TO` / `FUTURITE_LEAD_CC` | Destinatarios, separados por coma |
