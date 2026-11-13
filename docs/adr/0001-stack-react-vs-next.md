# ADR 0001 — Stack de la aplicación: Next.js frente a React + Vite

- **Estado:** Aceptado
- **Fecha:** 2026-11-13
- **Decide:** la base del proyecto `rplantilla` (PWA de gestión de cuadrilla de costaleros)

## Contexto

La aplicación tiene cuatro restricciones que vienen del encargo:

1. Es una **PWA** y "casi el 90% sera utilizada desde un movil": tiene que instalarse, arrancar rápido y funcionar con mala cobertura durante el recorrido.
2. El backend se quiere en **Payload**, porque "creo que tiene servers mcp": los agentes de IA deben poder leer y operar los datos por MCP.
3. Se quiere construir por **unidades de trabajo independientes**, cada una a cargo de un agente distinto.
4. La lógica de relevos es **combinatorial** y va a traer reglas estrictas que se van a ir puliendo: necesita una capa de dominio testeable, rápida de ejecutar y independiente de la UI.

La decisión de "React o Next.js" no es realmente libre en este contexto, porque Payload 3 es *Next.js-native*: no existe un build standalone de Payload sobre Vite. Pero sí es libre elegir un cliente React que **no** obligue a cargar Next.

## Opciones

### Opción A — React + Vite (SPA) + backend aparte

- Cliente: React 19 + Vite + `vite-plugin-pwa` (o Workbox a mano). Bundle mínimo, arranque instantáneo, offline por IndexedDB.
- Backend: Payload necessitate un servidor Next.js propio; además, el plugin MCP de Payload vive dentro de ese servidor.
- **Coste:** dos stacks que desplegar y mantener (el cliente Vite y el servidor Next), dos pipelines, dos superficies de configuración. El MCP sigue existiendo, pero vive en el proyecto Next de al lado.
- **A favor:** cliente más ligero y superficie de ataque menor en el móvil.

### Opción B — Next.js 16 (App Router) + Payload 3 embebido  ✅

- Un solo proyecto y un solo deploy: la app y `/admin` comparten dominio, tipos y despliegue.
- Payload 3.93 embebido en `src/app/(payload)`, con **plugin MCP** (`@payloadcms/plugin-mcp`) y su colección de API keys, de modo que los agentes consultan y operan los datos por MCP.
- Cliente PWA sobre el App Router con **Serwist** (`@serwist/next`) para el service worker.
- La capa de dominio (`src/domain`) es TypeScript puro, sin React ni Next: se testea con Vitest en milisegundos y se puede portar a otro cliente sin tocar una línea de negocio.
- **Coste:** Next es más heavyweight que Vite; hay que cuidar el tamaño del bundle cliente y no arrastrar render de servidor a las pantallas de la app.

### Opción C — React + Vite + Payload como servicio independiente (Docker)

- Separación estricta: cliente y backend son dos repositorios o dos servicios.
- **Coste:** el más caro de los tres en mantenimiento (contratos API duplicados, dos despliegues) sin ganancia funcional clara frente a la Opción B.

## Decisión

**Opción B — Next.js 16 + Payload 3 embebido.**

Motivos, en orden de peso:

1. **Payload manda en la elección.** El encargo pide Payload y MCP; la Opción A sólo entrega la mitad de lo pedido (el CMS en otro proyecto, con su propio despliegue y su propio ciclo).
2. **Un solo lugar para el dominio.** La lógica de relevos y sus reglas se escriben una vez, en `src/domain`, y la consumen el admin, la PWA, los tests y los agentes por MCP.
3. **Offline sin surrender.** El service worker se genera de verdad en el build y su código vive en el repositorio. `next-pwa` está archivado y es *webpack-only*: bajo Turbopack compila bien y no produce ningún service worker, sin error ni aviso (fallo silencioso). No es una opción.
4. **Reversibilidad.** Si mañana el cliente/App Admin pesan demasiado, el dominio y el contrato REST/MCP siguen intactos y el cliente puede cambiar a Vite sin reescribir lógica de negocio.

### Decisiones que acompañan a la Opción B

- **Service worker:** escrito a mano en `public/sw.js` (unos 110 líneas, cero dependencias). Se descartó Serwist: su plugin se acopla al bundler, y en este proyecto el bundler ya está modificado por el `withPayload` de Payload; dos plugins de build interactuando bajo Next 16 + Turbopack son una fuente de fallos silenciosos, y el service worker es justo la pieza que no puede fallar en silencio (si no se genera, la PWA no instala y la app deja de funcionar sin red). Con el service worker propio, su comportamiento es código del repositorio, revisable y testeable a ojo.
- **Base de datos:** Supabase (Postgres) con el adaptador oficial `@payloadcms/db-postgres`. Supabase aporta el Postgres administrado, backups y Auth; esta app usa sólo la base. El camino de verdad son las migraciones (`pnpm migrate:create` y `pnpm migrate`): el `push` automático queda apagado por defecto porque, contra una base en la nube, puede alterar tablas existentes.
- **Estilos:** Tailwind CSS 4.
- **Tests del dominio:** Vitest.
- **Convention de idioma del repositorio:** identificadores y nombres de fichero en inglés (convención estándar); comentarios de código y textos de interfaz, mensajes de error y documentación en español, que es el idioma del dominio (`paso`, `cuadrilla`, `relevo`, `trabajadera`) y de las personas usuarias.

## Consecuencias

- **Positivas:** un solo repositorio y un solo deploy; `/admin` y la PWA comparten tipos; MCP disponible sin infraestructura extra; dominio testeable en aislamiento.
- **Negativas:** el cliente hereda el peso de Next (hay que medir el bundle); aparece una dependencia fuerte de la versión de Payload (fijar versiones exactas); el modo offline es trabajo propio (caché + cola de sincronización), no un checkbox.
- **Riesgo asumido:** acoplamiento al App Router de Next. Mitigación: `src/domain` y `src/app/(pwa)` no se importan mutuamente; la UI habla con el dominio y con la API REST de Payload, no con el runtime de Next.

## Alternativas revisadas más adelante

- Cliente Vite separado (Opción A/C) si el bundle se dispara o si el admin necesita su propio ciclo de despliegue.
- Supabase Auth en lugar del auth de Payload, si algún día se quiere un login federado con la cuadrilla (hoy el login es el de Payload, con tres roles).
