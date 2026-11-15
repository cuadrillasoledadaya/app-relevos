# Guía de despliegue en Vercel, paso a paso

Esta guía es para quien nunca desplegó una aplicación en Vercel. No hace falta saber de Vercel: seguí los pasos en orden y, al final, la app queda viva en una dirección web.

La aplicación es una **PWA de gestión de una cuadrilla de costaleros**: Next.js 16 con Payload 3 y la base de datos en Supabase (Postgres).

---

## Antes de empezar: el mapa

| Pieza | Qué es | Dónde vive |
| --- | --- | --- |
| El repo | El código, con su historial | `github.com/cuadrillasoledadaya/app-relevos` |
| La rama | Una versión del código | `main` (la base), `feature/cuadrilla-costaleros` (el trabajo en curso) |
| Los PRs | Las revisiones del trabajo | 24 PRs en cadena, más un PR-tracker |
| Vercel | El sitio donde se publica la app | proyecto `app-relevos`, en `app-relevos.vercel.app` |
| Supabase | La base de datos | proyecto `auvjqkdiadvwdmefmlyf`, región `eu-west-1` |

Dos conceptos que aparecen todo el tiempo y conviene tener claros:

- **Rama de producción** (*Production Branch*): la rama que Vercel publica. Cada vez que se sube algo a esa rama, Vercel construye la app y la vuelve a publicar. Las demás ramas se despliegan igual, pero como **preview** (una URL de prueba aparte), no en la dirección principal.
- **Variables de entorno**: datos que la app lee al arrancar y que **no** viven en el código (la contraseña de la base, el secreto de sesión). Se configuran una vez en Vercel y se aplican en cada despliegue.

---

## Paso 1 — Proteger la rama `main`

`main` es la base de todo. Si alguien (o un error) mete commits directamente ahí, la cadena de PRs se rompe.

En GitHub, con el repo abierto:

1. Arriba a la derecha, entrá en **Configuración** (Settings).
2. En el menú de la izquierda, **Rules** → **Rulesets** → **Rules** → **New ruleset** → **New branch ruleset**.
   - Si la interfaz te muestra la pantalla clásica, es **Settings → Branches → Add rule**.
3. En **Ruleset name** poné `main protegida`.
4. En **Target branches** poné `main`.
5. Marcá **Require a pull request before merging**.
6. Marcá **Require approvals**… **no**. Dejalo apagado: sos la única persona del repo y GitHub no permite aprobar el propio PR, así que te bloquearía todos los merges. En su lugar, activá **Bypass pull request rules** / **Allow administrators to bypass** (en la pantalla clásica: *"Los administradores pueden omitir las reglas requeridas"*).
7. Dejá apagados: *Require status checks to pass*, *Require branches to be up to date*, *Require signed commits*, *Allow force pushes*, *Allow deletions*.
8. **Create**.

Con eso: nadie puede empujar commits directo a `main`, y vos seguís pudiendo mergear tus propios PRs.

---

## Paso 2 — Decidir qué rama se publica

Acá está el detalle que Troyó el primer despliegue.

Vercel publica **la rama de producción**. El repo se creó vacío, así que la primera rama que se subió (`feature/cuadrilla-costaleros`) quedó como rama de producción… y `main` (que es sólo el *esqueleto* del proyecto, el primer commit) **no compila por sí solo**: su `payload.config.ts` importa las colecciones de la base de datos, que se agregan más adelante en la historia. Por eso el primer despliegue falló con:

```
Module not found: Can't resolve './collections/Users'
```

No es un problema de la base de datos: es que el árbol de `main` está incompleto.

**Qué hacer:**

1. En el repo de GitHub: **Settings** → **General** → abajo a la izquierda, en *Default branch*, elegí `main` (esto ya está hecho).
2. En **Vercel** (otro pestaña): tu proyecto → **Settings** → **Git**.
3. En **Production Branch**, elegí `feature/cuadrilla-costaleros` y guardá.

Con eso, Vercel publica la versión del código que sí está completa. Cuando la cadena de PRs esté integrada en `main`, volvés a este paso y dejás `main` como rama de producción.

> **Estado actual:** el proyecto de Vercel se llama `app-relevos` (antes `app-relevos-raal`) y su *Production Branch* sigue siendo `main`, que es la rama que **no** compila. El despliegue vivo se lanzó a mano desde `feature/cuadrilla-costaleros`. Hay que hacer este paso (cambiar la *Production Branch*) para que cada push a esa rama vuelva a publicar: es **lo único que falta** en el panel de Vercel (las variables de entorno y el framework ya están bien).

---

## Paso 3 — Las variables de entorno

En **Vercel** → tu proyecto → **Settings** → **Environment Variables**. Agregá dos, para **Production** (y también para **Preview**, si querés que las previsualizaciones también hablen con la base):

**1. `DATABASE_URL`** — la conexión a la base de datos.

```
postgresql://postgres.auvjqkdiadvwdmefmlyf:<CLAVE>@aws-1-eu-west-1.pooler.supabase.com:5432/postgres
```

Tres cosas que hay que respetar en esa cadena:

- Va por el **pooler** (`aws-1-eu-west-1.pooler.supabase.com`, puerto `5432`, modo sesión), no por la conexión directa. La directa (`db.<ref>.supabase.co`) **no llega desde Vercel**: ese host sólo resuelve por IPv6 y las funciones de Vercel no tienen IPv6 saliente.
- El **identificador del proyecto** va dentro del usuario, con el formato `postgres.<ref>`, y el `<ref>` es `auvjqkdiadvwdmefmlyf` (con `m` en el medio y dos `f` seguidas). Si se escribe mal, el pooler responde `tenant/user postgres.<ref> not found`.
- La contraseña va **URL-codificada**: si contiene `@` (u otros caracteres reservados) se escribe con su código (`%40` en lugar de `@`), porque la `@` está reservada en una URL.

**2. `PAYLOAD_SECRET`** — el secreto con el que la app firma sus sesiones y cookies. Generá uno con:

```bash
openssl rand -base64 32
```

Copiá el resultado y pegalo como valor. No lo compartas ni lo subas al repo.

> En el proyecto de Vercel estas dos variables **ya están cargadas** (`Production`, `Preview` y `Development`). Si recreás el proyecto o las borrás, volvé a pegarlas con estos valores: sin `DATABASE_URL` la app no llega a la base, y sin `PAYLOAD_SECRET` las sesiones no se firman.

> La base de datos **ya tiene el esquema**: la migración base está aplicada (16 tablas, 5 enums, 22 claves foráneas, 69 índices). No hay que migrar nada al desplegar.

---

## Paso 4 — Lanzar el despliegue

1. En **Vercel** → tu proyecto → **Deployments**.
2. Arriba a la derecha, **Redeploy** (o esperá: cada push a la rama de producción dispara un despliegue solo).

Mientras dura, el estado aparece en GitHub: en el commit, al lado de "Checks", o en la pestaña **Commits** de tu repo.

---

## Paso 5 — Comprobar que la app está viva

En una pestaña nueva, estas cuatro direcciones tienen que responder:

| Dirección | Qué tiene que pasar |
| --- | --- |
| `https://app-relevos.vercel.app/` | La PWA carga (la lista de pasos) |
| `https://app-relevos.vercel.app/admin` | El panel de Payload carga y pide iniciar sesión |
| `https://app-relevos.vercel.app/api/pasos` | Responde `403` (sin sesión) — es la señal de que la API habla con la base |
| `https://app-relevos.vercel.app/api/mcp` | Responde `401` (sin clave) |

Las dos últimas son las importantes: si devuelven `403` y `401` en vez de `500`, **la app llegó a la base de datos** y todo está bien.

La primera cuenta que se registre en `/admin` queda como administradora.

---

## Si algo falla

### Leer los logs de un despliegue

Desde el terminal, con la sesión de la CLI de Vercel (si la tenés):

```bash
npx vercel@latest inspect <dpl_id> --logs
```

El `<dpl_id>` está en el estado que Vercel publica en el commit:

```bash
gh api repos/cuadrillasoledadaya/app-relevos/commits/<sha>/status
```

### Errores que ya nos pasó

| Lo que ves | Qué significa | Qué hacer |
| --- | --- | --- |
| `Module not found: Can't resolve './collections/Users'` | La rama publicada no tiene las colecciones: es `main` (el esqueleto) | Cambiá la Production Branch al paso 2 |
| Todo da 404 (`The page could not be found`, `x-vercel-error: NOT_FOUND`), aunque `/sw.js` y `/manifest.webmanifest` sí cargan | El proyecto tiene el framework en **Other**: Vercel publica sólo los archivos de `public/` y ninguna ruta de Next | En Vercel → **Settings → General → Framework Preset → Next.js**, guardá y redesplegá |
| `x-vercel-error: NOT_FOUND` al abrir el dominio | El build de la rama de producción falló, así que no hay nada publicado | Revisá el log del despliegue |
| `500` en `/api/pasos` o `/admin` | La app no llega a la base: revisá `DATABASE_URL` (¿está en el entorno correcto? ¿la contraseña URL-codificada?) | Corregí la variable y redesplegá |
| `tenant/user postgres.<ref> not found` | El `<ref>` del proyecto está mal escrito en la `DATABASE_URL` | Copiá la cadena del paso 3 tal cual |
| `ENETUNREACH` o `Connection terminated` al abrir la app | La `DATABASE_URL` apunta a la conexión directa (IPv6), que Vercel no alcanza | Usá el **pooler** del paso 3 |
| Redirección a `vercel.com/sso-api` ("Protected by Vercel Authentication") | El proyecto tiene activada la protección de Vercel | En Vercel → **Settings → Deployment Protection** → dejá **Vercel Authentication: Disabled** |
| `relation "users" does not exist` | La base no tiene el esquema | No debería pasar: la migración ya está aplicada |

---

## La cadena de PRs, en corto

El trabajo está partido en 24 PRs sobre la rama `feature/cuadrilla-costaleros`, más un **PR-tracker** (el #25, en borrador, que no se mergea nunca).

Se revisan **en orden**, porque cada PR se apoya en el anterior:

1. Abrí el **PR #1** y revisá su diff contra `main`.
2. Si está bien, mergéalo en `main`.
3. Retargeteá el **PR #2** a `main` (en el PR, botón **Edit** → **Base** → `main`) y revisalo.
4. Repetí hasta el #24.

Los PRs están numerados en orden y cada uno dice en su descripción qué entrega, qué depende y qué queda fuera.

Cuando termines, en Vercel volvés al paso 2 y dejás `main` como rama de producción: la app publicada pasa a ser exactamente lo que esté integrado.

---

## Cómo volver a desplegar después de un cambio

Push a la rama de producción y Vercel se encarga:

```bash
git push origin feature/cuadrilla-costaleros
```

Para ver qué se está publicando en cada momento, el dominio de producción es `app-relevos.vercel.app` y cada rama tiene además su URL de preview (aparece en el PR).
