# AGENTS.md — cómo trabaja un agente de IA en este repositorio

Este repositorio se construye por **unidades de trabajo**, cada una con su propia superficie de edición. Un agente que entra aquí recibe una tarea acotada (un apartado de `odd/tasks/*.md`), escribe **sólo** dentro de la superficie que le han dado y devuelve evidencia de lo que ha hecho. Este documento explica el mapa para que un agente no tenga que adivinarlo.

## Reglas de oro

1. **No escribas fuera de tu superficie de edición.** Si la tarea necesita un fichero que no está en tu superficie, no lo toques: devuélvelo al padre con el motivo.
2. **No hagas commits.** No `git add`, no `git commit`, no `git push`. El padre decide qué se versiona y con qué mensaje.
3. **No inventes requisitos.** Si el comportamiento no está escrito en el repo ni en la tarea, no lo implementes: consúltalo (ver [Hechos que no se pueden inventar](#hechos-que-no-se-pueden-inventar)).
4. **Idioma:** prosa, mensajes de error, textos de interfaz y documentación en español; identificadores, rutas, comandos y código en inglés.
5. **Verifica antes de devolver el trabajo.** Ejecuta los comandos de la sección [Comandos](#comandos-antes-de-proponer-un-cambio) y pega la salida real en tu informe.

## El contrato de dominio vive en `src/domain/`

Todo el vocabulario y toda la lógica de negocio están en `src/domain/`:

| Fichero | Qué define |
| --- | --- |
| `types.ts` | el contrato: `Paso`, `Trabajadera`, `Cuadrilla`, `Costalero`, `Relevo`, `PuntoDeRelevo`, `PlanDeRelevo`, `Regla`, `Hallazgo`, … |
| `errors.ts` | errores de dominio con código estable (`CODIGO_NUMERO_TRABAJADERAS_INVALIDO`) y mensaje en español |
| `paso.ts` | creación de un paso y reparto de sus trabajaderas |
| `motor.ts` | el motor de reglas |
| `reglas.ts` | el catálogo de reglas y su lista activa |
| `planificador.ts` | el generador determinista de relevos |

**Por qué no depende del framework.** `src/domain` es TypeScript puro: no importa React, ni Next.js, ni Payload. Eso se paga tres veces:

- Los tests del dominio corren en milisegundos, sin navegador ni servidor (`tests/domain/`).
- La lógica se puede portar a otro cliente sin reescribir una línea de negocio; el stack es reversible por capas (ver `docs/adr/0001-stack-react-vs-next.md`).
- El motor de reglas y el planificador se pueden auditar y razonar sin levantar la app.

**Regla:** nada dentro de `src/domain` importa de `src/app`, `src/collections` ni de `src/pwa`. Si necesitas un dato que hoy vive en Payload, pásalo como parámetro (el `ContextoReglas` y la `EntradaPlan` ya están hechos para eso).

## Cómo añadir una regla nueva sin tocar el motor

El motor (`src/domain/motor.ts`) no conoce ninguna regla concreta: sólo entiende el contrato `Regla`. Añadir una regla es **registrarla**, no tocar el motor.

1. **Implementa el contrato `ReglaCatalogo`** en `src/domain/reglas.ts`:

   ```ts
   export const MI_REGLA: ReglaCatalogo = {
     id: 'MI_REGLA',                    // identificador estable, en MAYÚSCULAS_CON_GUION_BAJO
     severidad: 'error',                // 'error' bloquea la operación; 'warning' sólo informa
     descripcion: 'Qué invariante protege esta regla.',
     mensaje: 'Mensaje en español para la persona usuaria.',
     evaluar(contexto: ContextoReglas): Hallazgo[] {
       // Devuelve los hallazgos; cada uno con `reglaId`, `severidad`, `mensaje` y `contexto`.
     },
   };
   ```

2. **Regístrala en la lista activa** (`REGLAS_V1` en el mismo fichero, o en otra lista que se pase a `crearMotor`). Es el único punto donde se declara qué reglas están activas.

3. **Escribe el test** en `tests/domain/reglas.spec.ts`: al menos un caso que dispare la regla y uno que no. El test debe comprobar el `reglaId`, la severidad y el mensaje.

4. **No toques `src/domain/motor.ts`.** Si hace falta un tipo nuevo para el contexto, añádelo en `src/domain/types.ts`; el motor se queda como está.

Para el resto del dominio (planificador, creación de pasos) el mismo patrón: función pura en `src/domain`, entrada explícita, salida determinista y test en `tests/domain/`.

## Las dos capas: cliente PWA y API de Payload

| Capa | Dónde | Qué es | Qué habla con |
| --- | --- | --- | --- |
| Cliente (PWA) | `src/app/(pwa)`, `src/pwa` | pantallas, caché y cola offline | la API REST de Payload (`/api/pasos`, `/api/relevos`, …) |
| Servidor (Payload) | `src/collections`, `src/payload.config.ts` | persistencia, roles, acceso y MCP | la base de datos y el panel `/admin` |
| Dominio | `src/domain` | contrato y lógica de negocio | nada: es puro |

Convenciones que se dan por buenas:

- **La UI no reimplementa la lógica de negocio.** Si una pantalla necesita la lógica de relevos, usa `src/domain`; no copies el cálculo ni las reglas dentro de un componente.
- **La UI normaliza, no interpreta.** Los documentos de Payload se convierten al modelo de la interfaz en `src/app/(pwa)/componentes/data.ts`. Es el único sitio donde se interpreta el JSON del servidor.
- **Las colecciones no importan la UI.** `src/collections` define datos y acceso; no conoce rutas ni componentes.
- **El acceso a datos vive en las colecciones.** Las reglas `readCuadrillaData` y `writeCuadrillaData` de `src/collections/Users.ts` son la fuente de verdad de qué puede hacer cada rol.
- **Offline:** la capa de `src/pwa` guarda lecturas y encola escrituras; las pantallas hablan con ella a través de `src/app/(pwa)/componentes/offline-client.ts`.

## Superficie de edición por unidad de trabajo

Cada unidad de trabajo (una tarea de `odd/tasks/*.md`) tiene:

- **Una ruta**: inline (la hace el padre) o delegada a un agente.
- **Una superficie de edición acotada**: la lista exacta de ficheros que se pueden tocar. Las superficies de las unidades que corren en paralelo **son disjuntas**, y por eso varias unidades pueden avanzar a la vez sin pisarse.
- **Una integración común**: todo se valida junto en el mismo repositorio (tests, `tsc` y build).

Como agente:

- Escribe **sólo** dentro de tu superficie. Si crees que hace falta tocar otro fichero, dilo en el informe en lugar de tocarlo.
- Si tu superficie incluye tests, los tests van con el código: la unidad de trabajo incluye su prueba.
- Al terminar, informa de los ficheros cambiados, de la evidencia de los comandos ejecutados y de lo que no hayas podido completar. El padre se encarga del commit, del mensaje y de la reconciliación.

## Comandos antes de proponer un cambio

```bash
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest
pnpm lint        # ESLint
```

Añade `pnpm build` cuando el cambio toque la app, la configuración de Next o la de Payload (`:3000` es el puerto de `pnpm dev`).

Si has tocado una colección de Payload, regenera los tipos antes de validar:

```bash
pnpm generate:types   # genera src/payload-types.ts (fichero generado, no versionado)
```

Si has tocado los iconos de la PWA:

```bash
node scripts/generar-iconos.mjs
```

Un cambio sólo de documentación no necesita `pnpm build`: con `pnpm typecheck` basta.

## Hechos que no se pueden inventar

Estos puntos están **decididos por la cuadrilla o pendientes de decidir**. Un agente no debe rellenarlos por su cuenta:

- **El número de trabajaderas de un paso lo elige la persona usuaria.** Es un entero `>= 1`, sin máximo. No impongas un número por defecto "razonable" ni un tope: el dominio sólo rechaza los valores no enteros o `<= 0`.
- **El identificador de una trabajadera es único en toda la cuadrilla, no sólo dentro del paso.** Las trabajaderas de todos los pasos comparten la tabla `pasos_trabajadoras`, en la que el `id` es la clave primaria. Por eso el dominio genera `trab-<idDelPaso>-<numero>` (`src/domain/paso.ts`, función `idTrabajadera`). Si creás un paso a mano en `/admin` o por MCP, el identificador tiene que ser único en toda la base: repetirlo entre dos pasos hace que la API lo rechace con un 400 `The following field is invalid: id`.
- **El número de relevos por paso y las reglas del relevo todavía no están decididos por el producto.** No escribas cuántos relevos tiene un paso ni qué cuadro horario se aplica: no está definido.
- **Las reglas estrictas de cambio de costaleros más allá de las invariantes estructurales siguen abiertas.** El catálogo v1 tiene ocho invariantes estructurales (siete `error` y una `warning`); las reglas de descanso, simetría o calendario de procesión entran **por registro** cuando la cuadrilla las defina, sin tocar el motor.
- **La aplicación no tiene pantalla de gestión de cuentas.** Las cuentas se dan de alta en `/admin`; no escribas un flujo de "gestión de usuarios" que no existe.
- **El service worker es el de `public/sw.js`**, escrito a mano. No añadas Serwist ni otra librería de PWA sin que se decida (el ADR `docs/adr/0001-stack-react-vs-next.md` lo menciona, pero el código va por delante).

## Convenciones de estilo

- Format: lo fija `.prettierrc.json` (comillas simples, `printWidth` 100). Lo que se comprueba automáticamente es `pnpm lint`.
- Comentarios y documentación del código en español cuando explican el dominio; los identificadores, nombres de fichero y símbolos van en inglés.
- Errores de dominio con **código estable** (`ErrorDeDominio` + `CODIGO_*`): la interfaz y los tests se enganchan al código, no al texto literal.
- Nada de secretos, claves ni datos reales en el repositorio.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
