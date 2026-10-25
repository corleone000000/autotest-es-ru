# AutoTest ES/RU

App (PWA) para practicar el examen teórico del **permiso B de la DGT** en español, con traducción al ruso bajo demanda. Funciona sin conexión y se instala en el móvil como una app.

- 310 preguntas originales en 15 temas, con explicación y la norma en la que se basa (texto consolidado del BOE vigente a octubre de 2026, incluidas las reformas del RD 465/2025 y el RD 518/2026).
- Botón 🇷🇺 RU, glosario ES→RU al mantener pulsada una palabra subrayada.
- Test por temas, examen simulado (30 preguntas · 30 min · máx. 3 fallos), modo examen real (sin ruso), repaso de fallos, favoritas.
- Estadísticas, uso del ruso por semana y semáforo "¿estoy lista?".
- Importar preguntas desde capturas de pantalla (Claude con visión) y soporte para preguntas de vídeo.

## Requisitos

- Node.js 20.12 o superior (probado con Node 24 LTS).

## Arrancar en local

```bash
npm install
npm run dev          # http://localhost:5173 (incluye /api/import)
```

Para probar la versión de producción (con service worker y modo offline):

```bash
npm run build
npm run preview      # http://localhost:4173
```

`npm run build` valida antes el banco de preguntas (`npm run validate`) y falla si hay errores.

## Variables de entorno

Crea un archivo `.env` en la raíz (no se sube al repositorio) con este contenido:

```dotenv
# API key de Claude (https://platform.claude.com). La usan /api/import y los scripts.
ANTHROPIC_API_KEY=

# Opcional: modelo (por defecto claude-opus-5-5).
# ANTHROPIC_MODEL=claude-opus-5-5

# Opcional pero recomendado en Vercel: clave compartida para que nadie más use /api/import.
# Escribe la misma en la app: Ajustes → Clave de importación.
IMPORT_TOKEN=
```

Sin `ANTHROPIC_API_KEY` todo funciona salvo la importación por captura y los scripts de traducción/generación.

## Desplegar en Vercel

1. Sube el repositorio a GitHub (privado si quieres).
2. En [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repositorio. Vercel detecta Vite; `vercel.json` ya fija `npm run build` y la carpeta `dist`.
3. En **Settings → Environment Variables** añade `ANTHROPIC_API_KEY` y `IMPORT_TOKEN` (una cadena larga aleatoria).
4. **Deploy**. La función `api/import.ts` se despliega sola (tiempo máximo 120 s, incluye `src/data/glossary.json`).

Alternativa por terminal: `npm i -g vercel`, `vercel` (primera vez) y `vercel --prod`.

## Instalar en el móvil

Abre la URL de Vercel (HTTPS) en el móvil:

- **iPhone (Safari):** botón Compartir → **Añadir a pantalla de inicio**.
- **Android (Chrome):** menú ⋮ → **Instalar aplicación** (o el aviso que aparece abajo).

Abre la app una vez con conexión: a partir de ahí funciona sin internet (preguntas, imágenes y vídeos del banco quedan en caché). Las actualizaciones se descargan solas la próxima vez que haya conexión.

El progreso se guarda en el propio navegador (IndexedDB). Usa **Ajustes → Copia de seguridad** para exportarlo de vez en cuando.

## Importar preguntas desde capturas

**Inicio → Mis preguntas → Importar**: elige una o varias capturas. Claude extrae enunciado, opciones, respuesta e imagen, lo traduce con el glosario y te deja revisarlo antes de guardar (las preguntas casi idénticas a otras existentes se marcan como posible duplicado). Si la captura no muestra la respuesta correcta, Claude la deduce y la pregunta queda marcada para revisión. Se guardan solo en tu dispositivo.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run validate` | Comprueba el banco: esquema, ids, citas, imágenes, duplicados, reparto a/b/c y lista `needsReview`. |
| `npm run translate` | Traduce con Claude los campos `ru` vacíos usando `glossary.json`. `--topic <id>`, `--force` (re-traducir), `--dry-run`. Deja un informe de términos nuevos en `scripts/out/`. |
| `npm run generate -- --topic <id> --count 10` | Descarga del BOE los artículos del tema y genera borradores de preguntas originales (`needsReview: true`, sin traducir). |
| `npx tsx scripts/lib/boe.ts RGC a48` | Muestra el texto vigente de un artículo del BOE (`LSV`, `RGC`, `RGV`, `RGCond`; `indice` lista los bloques). |
| `node scripts/make-signs.mjs` | Regenera los SVG de señales de `public/images/senales/`. |
| `npm run icons` | Regenera los iconos PNG de la PWA desde `public/icon.svg`. |

## Banco de preguntas

Cada tema está en `src/data/questions/<tema>.json`:

```json
{
  "id": "B-VEL-0001",
  "topic": "velocidad",
  "source": "generada",
  "ref": "RGC art. 48.1.a",
  "question": { "es": "…", "ru": "…" },
  "options": { "a": { "es": "…", "ru": "…" }, "b": { … }, "c": { … } },
  "correct": "a",
  "explanation": { "es": "…", "ru": "…" },
  "image": "/images/senales/r-1.svg",
  "video": "/videos/situacion-01.mp4",
  "needsReview": true
}
```

- `ref` es la norma en la que se basa (se muestra como "Fuente" en la explicación). Abreviaturas: `LSV` (Ley de Tráfico, RDL 6/2015), `RGC`, `RGV`, `RGCond`, `CP`. Las preguntas puramente técnicas o sanitarias lo indican ("Conocimiento técnico (no regulado en norma)").
- `needsReview: true` muestra un aviso en la app y aparece en `npm run validate`.

### Preguntas de vídeo

La DGT incorporó en 2026 una pregunta de vídeo al examen. Para añadir una al banco, copia el clip (MP4 H.264 o WebM, pocos MB) a `public/videos/` y pon su ruta en el campo `video`. Se precachea para funcionar sin conexión y se reproduce encima del enunciado. En las preguntas importadas puedes adjuntar un vídeo desde la pantalla de revisión.

## Estructura

```
api/import.ts            función serverless (Vercel) de importación por captura
scripts/                 validación, traducción, generación, BOE, iconos y señales
src/data/                banco (questions/*.json), glossary.json, topics.ts
src/components/          pregunta, glosario, media, editor, UI
src/pages/               inicio, práctica, examen, temas, estadísticas, ajustes, importar
src/lib/                 IndexedDB, progreso, examen, estadísticas, i18n, ajustes
```
