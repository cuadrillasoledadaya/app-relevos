# Cuadrilla de costaleros

Aplicación web instalable (PWA) para gestionar una cuadrilla de costaleros: los **pasos** que se portan, las **trabajaderas** (los puestos bajo el paso), las **cuadrillas**, los **costaleros** y los **relevos** que deciden quién cubre cada puesto en cada punto del recorrido.

Se usa sobre todo desde el móvil, durante el recorrido, así que tiene que servir aunque no haya cobertura: la acción crítica (empezar un relevo) se guarda en el propio dispositivo y se sincroniza en cuanto vuelve la red.

## Qué resuelve

- **Paso con las trabajaderas que elija la cuadrilla.** El número de trabajaderas de un paso lo elige quien lo crea (mínimo 1). Cada trabajadera queda numerada, ordenada, con lado (izquierda/derecha) y tipo.
- **Plan de relevos.** El planificador genera un relevo por punto de relevo y salta la cuadrilla que relevó justo antes. Intenta cubrir todas las trabajaderas del paso; si a una cuadrilla le faltan costaleros, el puesto queda sin cubrir y lo denuncia la regla `TRABAJADERA_SIN_CUBRIR`. La misma entrada produce siempre el mismo plan.
- **Reglas estrictas de cambio de costaleros.** Un motor de reglas evalúa cada relevo y avisa de las invariantes del relevo: un hallazgo `error` bloquea la operación y un `warning` sólo informa. Las reglas se añaden por registro, sin tocar el motor.
- **Panel de administración y acceso por MCP.** Los datos se gestionan en `/admin` y también se pueden leer y operar desde un agente de IA por MCP (ver [`docs/guia-mcp.md`](docs/guia-mcp.md)).

## Stack

| Pieza | Versión / detalle |
| --- | --- |
| Next.js | 16.3.3 (App Router) |
| Payload CMS | 3.93.0 (panel en `/admin`) |
| Base de datos | Supabase (Postgres), con `@payloadcms/db-postgres` 3.93.0 |
| Tailwind CSS | 4.3.5 |
| Tests | Vitest 4.0.18 |
| Gestor de paquetes | pnpm 11.8.0 |
| Node | `>= 24.22.1` |

El service worker está escrito a mano en `public/sw.js`: no hay ninguna librería de PWA en el bundle. La decisión de stack (React frente a Next.js) y sus alternativas están en el ADR [`docs/adr/0001-stack-react-vs-next.md`](docs/adr/0001-stack-react-vs-next.md).

## Requisitos

- Node `>= 24.22.1`
- pnpm `11.8.0`

## Instalación

```bash
pnpm install
```

La base de datos es **Supabase** (Postgres). Antes de arrancar hay que dejarle la cadena de conexión y el esquema:

1. Creá el proyecto en [supabase.com](https://supabase.com) (o usá el que ya tengas).
2. En **Project Settings → Database**, copiá la cadena de conexión. Para migraciones usá la conexión **directa** (puerto `5432`); para el tráfico de la app podés usar la **agrupada** (puerto `6543`).
3. Poné la cadena en `.env` como `DATABASE_URL` y definí `PAYLOAD_SECRET` (ver [Variables de entorno](#variables-de-entorno)).
4. Creá y aplicá las migraciones:

```bash
pnpm migrate:create   # genera el fichero de migración en src/migrations
pnpm migrate          # aplica las migraciones pendientes
```

El `.env` de este proyecto se arma con el ejemplo de la sección [Variables de entorno](#variables-de-entorno).

Arrancá el servidor de desarrollo:

```bash
pnpm dev
```

En desarrollo, `DATABASE_PUSH=true` sincroniza el esquema automáticamente. Contra una base en la nube es preferible el camino de migraciones: `push` puede alterar tablas existentes.

| Dirección | Qué es |
| --- | --- |
| http://localhost:3000 | la PWA (lista de pasos) |
| http://localhost:3000/admin | panel de administración de Payload |
| http://localhost:3000/api/mcp | servidor MCP |

En una instalación nueva, **la primera cuenta que se registra es administrador automáticamente** (`src/collections/Users.ts`). Los roles son `admin`, `jefe` y `costalero`.

## Variables de entorno

| Variable | Obligatoria | Valor por defecto | Para qué sirve |
| --- | --- | --- | --- |
| `PAYLOAD_SECRET` | sí, en producción | hay un valor de reserva en `src/payload.config.ts` pensado para desarrollo: en producción hay que definirla siempre | firma las sesiones y las cookies de Payload |
| `DATABASE_URL` | sí | — | cadena de conexión de Supabase: `postgresql://postgres.<ref>:<clave>@aws-1-<region>.pooler.supabase.com:5432/postgres` |
| `DATABASE_SCHEMA` | no | `public` | esquema de Postgres donde viven las tablas |
| `DATABASE_SSL` | no | activo | `false` desactiva SSL (sólo para un Postgres local sin TLS; Supabase lo exige) |
| `DATABASE_PUSH` | no | apagado | `true` sincroniza el esquema en desarrollo sin migraciones |

Ejemplo para copiar en un `.env`. La clave de la base de datos está en Supabase, en **Project Settings → Database**:

```bash
# Conexión por el pooler (puerto 5432, modo sesión): la que usan las migraciones
# y la app. El host de este proyecto es aws-1-eu-west-1.pooler.supabase.com:
# la conexión directa (db.<ref>.supabase.co) sólo resuelve por IPv6 y no se
# alcanza desde Vercel.
DATABASE_URL=postgresql://postgres.auvjqkdiadvwdmefmlyf:<CLAVE>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres

# Firma las sesiones y las cookies de Payload. Obligatoria en producción.
PAYLOAD_SECRET=cambiame-por-una-cadena-larga-y-aleatoria

# Esquema de Postgres donde viven las tablas. Supabase usa "public".
DATABASE_SCHEMA=public

# SSL está activo por defecto. Poné "false" sólo para un Postgres local sin TLS.
DATABASE_SSL=true

# "true" sincroniza el esquema automáticamente en desarrollo, sin migraciones.
# Contra una base en la nube es preferible el camino de migraciones.
DATABASE_PUSH=false
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `pnpm dev` | servidor de desarrollo en el puerto 3000 |
| `pnpm build` | build de producción |
| `pnpm start` | sirve el build de producción |
| `pnpm test` | suite de Vitest |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm generate:types` | genera `src/payload-types.ts` a partir de las colecciones (es un fichero generado: no está en el repositorio hasta que se ejecuta) |
| `pnpm generate:importmap` | regenera el import map del panel de administración |
| `pnpm migrate:create` | genera un fichero de migración en `src/migrations` a partir del esquema de las colecciones |
| `pnpm migrate` | aplica las migraciones pendientes en la base de datos |
| `node scripts/generar-iconos.mjs` | regenera los iconos PNG de la PWA |

Para desplegar: `pnpm build` y `pnpm start` (con `PAYLOAD_SECRET` definido y `NODE_ENV=production`). El `Dockerfile` que viene de la plantilla necesita `output: 'standalone'` en `next.config.ts`, que hoy no está activado: usa el build de Next directamente hasta que se decida esa vía.

## Rutas de la aplicación

| Ruta | Qué hay |
| --- | --- |
| `/` | lista de pasos |
| `/pasos/[id]` | detalle de un paso: mapa de trabajaderas y línea de relevos |
| `/relevos` | todos los relevos, agrupados por paso |
| `/admin` | panel de administración de Payload |
| `/api/mcp` | servidor MCP |

## Cómo está montado el proyecto

```text
src/
  app/
    (pwa)/        pantallas de la PWA: /, /pasos/[id], /relevos
    (payload)/    panel de administración y rutas API de Payload
  collections/    colecciones de Payload: users, cuadrillas, costaleros, pasos,
                  relevos y puntos-de-relevo (con sus reglas de acceso)
  domain/        contrato de dominio y lógica de negocio en TypeScript puro
  pwa/           capa offline: caché en IndexedDB y cola de sincronización
  payload.config.ts
docs/
  adr/0001-stack-react-vs-next.md   decisión de stack (React vs Next.js)
  guia-mcp.md                       guía de uso del servidor MCP
public/
  manifest.webmanifest, sw.js, icons/
scripts/generar-iconos.mjs
tests/
  domain/     motor de reglas, catálogo de reglas, planificador y creación de pasos
  pwa/        capa offline
```

Dos capas bien separadas:

- **Cliente (PWA)** — `src/app/(pwa)` y `src/pwa`. Lee los datos por la API REST de Payload (`/api/pasos`, `/api/relevos`, …), normaliza los documentos en `src/app/(pwa)/componentes/data.ts` y guarda en caché o encola escrituras a través de la capa offline.
- **Servidor (Payload)** — `src/collections` y `src/payload.config.ts`. Define la persistencia, los roles y las reglas de acceso, y expone los datos por REST, GraphQL y MCP.

En medio, `src/domain` es el contrato de negocio: TypeScript puro, sin React, sin Next y sin Payload.

## Tests

```bash
pnpm test
```

Vitest recorre `tests/**/*.spec.ts`:

- `tests/domain/` — motor de reglas, catálogo de reglas, planificador de relevos y creación de pasos.
- `tests/pwa/` — capa offline: caché, cola de escrituras y sincronización.

El dominio no necesita navegador ni servidor: los tests son deterministas y arrancan en milisegundos. Si añades una regla, un caso del planificador o un paso del dominio, su test va en `tests/domain/`.

## MCP para agentes

El backend incluye el plugin oficial de Payload (`@payloadcms/plugin-mcp`), de modo que un agente de IA puede leer y operar los datos sin montar nada aparte:

- Endpoint: `POST http://localhost:3000/api/mcp`
- Cabecera: `Authorization: Bearer <MCP-USER-API-KEY>`
- Colecciones expuestas: `users`, `cuadrillas`, `costaleros`, `pasos`, `relevos` y `puntos-de-relevo`

La guía completa (cómo crear la clave, qué herramientas aparecen y ejemplos) está en [`docs/guia-mcp.md`](docs/guia-mcp.md).

## Documentación relacionada

| Documento | Para qué sirve |
| --- | --- |
| [`docs/adr/0001-stack-react-vs-next.md`](docs/adr/0001-stack-react-vs-next.md) | por qué Next.js y no React + Vite, y qué se revertiría si cambia |
| [`docs/guia-mcp.md`](docs/guia-mcp.md) | cómo conectar un agente de IA por MCP |
| [`docs/guia-despliegue.md`](docs/guia-despliegue.md) | cómo desplegar en Vercel paso a paso, para quien nunca lo hizo |
| [`AGENTS.md`](AGENTS.md) | cómo trabaja un agente de IA en este repositorio |

## Qué no está decidido todavía

No cuentes con estas cosas como si fueran funciones del producto:

- **El número de trabajaderas lo elige la cuadrilla.** No hay un número fijo ni un máximo impuesto en el código: se valida que sea un entero mayor o igual a 1.
- **El número de relevos por paso y sus reglas concretas todavía no los ha decidido el producto.** No están escritos en el código como decisiones firmes: no los inventes ni los des por cerrados.
- **Las reglas estrictas de cambio de costaleros más allá de las invariantes estructurales siguen por definir.** El producto está estudiando el caso real y el catálogo de reglas va a ser bastante más largo: las ocho invariantes estructurales actuales (siete `error` y una `warning`) son sólo la base, y el catálogo crece por registro, sin tocar el motor.
- **La aplicación no tiene pantalla de gestión de cuentas.** Las cuentas se dan de alta y editan desde `/admin`.
