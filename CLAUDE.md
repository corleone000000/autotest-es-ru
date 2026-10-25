# AutoTest ES/RU — Especificación para Claude Code

App de práctica del examen teórico del **permiso B (DGT)** para una alumna rusohablante que también habla español. Las preguntas salen **en español** (como en el examen real) y un botón **Mostrar/Ocultar RU** enseña la traducción al ruso de esa misma pregunta.

> Contexto clave: la DGT **no ofrece el examen en ruso** (solo castellano, cooficiales, inglés, francés y alemán). Por eso la app entrena en español y usa el ruso como apoyo, con el objetivo de depender cada vez menos de él.

---

## 1. Objetivo y usuaria

- Usuaria única (mi novia). Sin registro, sin cuentas.
- Uso principal: móvil, ratos sueltos (metro, sofá). Debe funcionar offline.
- Meta: aprobar el teórico a la primera → 30 preguntas, máximo 3 fallos, 30 minutos.

## 2. Stack (decidido)

- **Vite + React + TypeScript + Tailwind**
- **PWA** (`vite-plugin-pwa`) → se instala en el móvil como app, funciona sin internet
- Progreso guardado en **IndexedDB** (vía `idb-keyval` o Dexie)
- Preguntas en **JSON estático** dentro del repo (`/src/data/questions.json`)
- Deploy gratis en **Vercel** o Netlify
- Sin backend en el MVP

## 3. Origen de las preguntas (importante)

No hay un banco oficial público y completo de preguntas DGT; Todotest, PracticaTest, etc. tienen bancos propios con copyright. **No scrapear esas webs.**

Fuentes, por orden de prioridad:
1. **Importación por captura (núcleo de la app).** Ella hace sus tests en su cuenta de autoescuela (Todotest) y, cuando falla o duda, hace captura de pantalla y la sube a la app. Claude con visión extrae enunciado, opciones, respuesta correcta e imagen, lo traduce al ruso y lo guarda en "Mis preguntas". Uso personal, con su propio acceso.
2. **Modelos de examen publicados en dgt.es** (cuestionarios de ejemplo oficiales).
3. **Preguntas generadas con Claude** a partir del Reglamento General de Circulación, solo para rellenar temas con pocas preguntas.

## 4. Modelo de datos

```ts
type Lang = { es: string; ru: string };

interface Question {
  id: string;                 // "B-SEN-0042"
  topic: TopicId;             // ver lista de temas
  question: Lang;
  options: { a: Lang; b: Lang; c: Lang };
  correct: "a" | "b" | "c";
  explanation: Lang;          // por qué es la correcta
  image?: string;             // /images/senales/r-301.png
  terms?: string[];           // ids del glosario presentes en la pregunta
  source: "dgt-modelo" | "generada" | "foto";
}

interface GlossaryTerm {
  id: string;                 // "arcen"
  es: string;                 // "arcén"
  ru: string;                 // "обочина"
  note?: string;
}

interface Attempt {
  questionId: string;
  answer: "a" | "b" | "c";
  correct: boolean;
  usedTranslation: boolean;   // ¿abrió el ruso en esta pregunta?
  timestamp: number;
}
```

Temas: Señales, Velocidad, Prioridad, Adelantamientos, Parada y estacionamiento, Alumbrado, Alcohol y drogas, Documentación, Seguridad pasiva, Mecánica y mantenimiento, Primeros auxilios, Conducción eficiente, Autopistas y autovías, Carga y pasajeros.

## 5. Funcionalidades MVP

### Pantalla de pregunta (el corazón de la app)
- Enunciado y opciones **siempre en español** primero.
- Botón **🇷🇺 RU** fijo y grande: muestra/oculta la traducción debajo de cada línea (pregunta y cada opción), en otro color y tamaño más pequeño.
- **Mantener pulsada una palabra** del glosario → popup con la traducción solo de ese término (ej. "ceda el paso" → "уступите дорогу"). Ayuda a aprender el vocabulario sin leer todo en ruso.
- Tras responder: verde/rojo + explicación en ES (con el mismo botón RU).
- Registrar `usedTranslation` en cada respuesta.

### Modos
1. **Test por temas** — 10/20 preguntas de un tema.
2. **Examen simulado** — 30 preguntas aleatorias, 30 min, apto con ≤3 fallos, corrección al final (como el real).
3. **Modo examen real** — igual que el simulado pero **sin botón RU**. Es el entrenamiento final.
4. **Repaso de fallos** — solo preguntas falladas; una pregunta sale del repaso tras acertarla 3 veces seguidas (repetición espaciada simple).
5. **Favoritas** — marcar con ⭐ para repasar.

### Estadísticas
- % de aciertos global y por tema (barras).
- Exámenes simulados aprobados/suspendidos.
- **% de preguntas en las que usó el ruso**, por semana → debería bajar con el tiempo. Es la métrica de "ya está lista".
- Semáforo "¿estoy lista?": verde si aprueba ≥85% de los simulados de los últimos 10 y usa el RU en <10%.

### Ajustes
- Traducción: "oculta por defecto" (recomendado) / "siempre visible".
- Idioma de la interfaz (menús, botones): ES o RU.
- Tamaño de letra.
- Resetear progreso.

## 6. Pipeline de traducción

Las traducciones se generan **una vez** y se guardan en el JSON (no en directo, para que funcione offline y sea gratis en uso).

`scripts/translate.ts`:
1. Lee `questions.json`, busca campos `ru` vacíos.
2. Llama a la API de Claude por lotes con un prompt que incluya el **glosario ES→RU** para que los términos de tráfico sean siempre los mismos (no "обочина" en una pregunta y "край дороги" en otra).
3. Escribe el resultado y genera un informe de términos nuevos para revisar.
4. API key en `.env`, nunca en el código del frontend.

Ella revisa un muestreo las primeras veces; si algo suena raro, se corrige en el glosario y se re-traduce.

## 7. Diseño

- Mobile-first, una pregunta por pantalla, botones de respuesta grandes (fácil con el pulgar).
- Imagen de la señal/situación arriba, ocupando el ancho.
- Modo oscuro automático.
- Estética limpia, nada de anuncios ni menús de más (lo contrario de Todotest).
- Señales: SVG propios o imágenes de dominio público del catálogo oficial de señales.

## 8. Plan por fases (prompts para Claude Code)

**Fase 0 — Setup**
> Crea un proyecto Vite + React + TS + Tailwind con vite-plugin-pwa. Estructura: /src/data, /src/components, /src/pages, /scripts. Lee este documento entero antes de empezar y úsalo como CLAUDE.md.

**Fase 1 — Pantalla de pregunta**
> Implementa los tipos de la sección 4 y la pantalla de pregunta de la sección 5 con 10 preguntas de ejemplo (ES+RU) en questions.json. Incluye el botón RU, el popup del glosario y la corrección con explicación.

**Fase 1.5 — Importar por captura**
> Función serverless en Vercel (API key de Claude en variable de entorno) que recibe una o varias capturas de un test, extrae cada pregunta al formato Question de la sección 4, traduce al ruso usando el glosario y la guarda en IndexedDB. Pantalla para revisar/corregir antes de guardar. Detectar duplicados por texto del enunciado.

**Fase 2 — Modos y progreso**
> Añade los 5 modos, el guardado en IndexedDB y el temporizador del examen simulado.

**Fase 3 — Estadísticas y "¿estoy lista?"**
> Pantalla de estadísticas con las métricas de la sección 5, incluida la evolución del uso del ruso.

**Fase 4 — Banco de preguntas**
> Script para generar preguntas por tema a partir de la normativa y script de traducción de la sección 6. Objetivo: 300 preguntas.

**Fase 5 — Deploy**
> Deploy en Vercel, comprobar instalación como PWA en iPhone/Android y funcionamiento offline.
## 9. Fuera de alcance (por ahora)

- Cuentas de usuario, multiusuario, monetización.
- Otros permisos (A, C, D).
- Audio/lectura en voz alta (posible fase futura).

---

## 10. Notas de implementación (estado actual)

- **Fases 0–5 + 1.5 implementadas.** Ver README.md para arrancar, desplegar e instalar.
- **Banco:** un archivo por tema en `src/data/questions/<tema>.json` (en lugar de un único `questions.json`); se cargan con `import.meta.glob`. Tema 1 añadido: "Introducción y definiciones" (`definiciones`). 310 preguntas: 30 del tema 1 y 20 de cada uno de los otros 14.
- **Modelo de datos:** además de la sección 4, `Question` tiene `ref` (norma citada, obligatoria en las generadas), `video?` (pregunta de vídeo, examen DGT 2026) y `needsReview?`. `Attempt` añade `usedGlossary` y `mode`. Las preguntas importadas son `LocalQuestion` (con `imageBlob`/`videoBlob`) y viven en IndexedDB con clave `mq:<id>`.
- **Normativa:** verificada contra el texto consolidado del BOE (API de datos abiertos, `scripts/lib/boe.ts`) a octubre de 2026, incluidas las reformas del RGC por el RD 465/2025 (señalización) y el RD 518/2026 (usuarios vulnerables, en vigor el 1/10/2026). Ante una duda real se marca `needsReview: true`.
- **usedTranslation** solo cuenta si el ruso estaba visible antes de responder (en práctica) o en algún momento durante el examen. Con "traducción siempre visible" cuenta siempre.
- **Repaso de fallos:** cualquier fallo (en cualquier modo) mete la pregunta; sale tras 3 aciertos seguidos.
- **Semáforo:** verde si hay 10 simulacros (simulado o real) con ≥85 % aprobados y uso del ruso <10 % en los últimos 14 días; amarillo si ≥60 % aprobados y ruso <25 %.
- **Importación:** `api/import.ts` usa `claude-opus-5-5` con salida estructurada (Zod) y fallback por rechazo; la captura se reduce a JPEG ≤1568 px en el cliente y Claude devuelve el recuadro de la imagen para recortarla. `IMPORT_TOKEN` protege el endpoint.
- **Traducciones:** escritas a mano (no había API key) siguiendo `glossary.json`; `scripts/translate.ts` rellena las que falten con la API.
- **Fase 5:** `vercel.json` listo (build, `dist`, función `api/import.ts` con 120 s e `includeFiles` del glosario, cabeceras del service worker). Verificado en local con `npm run preview`: SW activo, manifest instalable (192/512/maskable), precache completo y la app funcionando con el servidor apagado. El despliegue se hace desde la cuenta de Vercel del usuario (ver README).
