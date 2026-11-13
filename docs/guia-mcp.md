# Guía de MCP para agentes

El backend de la cuadrilla incluye el plugin oficial de Payload para MCP (`@payloadcms/plugin-mcp`), así que **un agente de IA puede leer y operar los datos de la cuadrilla sin montar nada aparte**: el mismo servidor que sirve la PWA y el panel `/admin` expone también el protocolo MCP.

## Endpoint y autenticación

| Dato | Valor |
| --- | --- |
| Endpoint | `POST http://localhost:3000/api/mcp` |
| Cabecera | `Authorization: Bearer <MCP-USER-API-KEY>` |
| Transporte | Streamable HTTP de MCP (las peticiones van por `POST`) |

El plugin registra también una ruta `GET` en `/api/mcp` que siempre responde "método no permitido": es lo esperado, los clientes MCP hablan por `POST`.

La autenticación es **por clave de API**, no por usuario y contraseña. La clave se busca por un índice HMAC y, si existe, la petición se ejecuta **como el usuario dueño de la clave**.

## Crear una API key

1. Arranca la aplicación (`pnpm dev`) y entra en http://localhost:3000/admin.
   En una instalación nueva, la primera cuenta que se registra es administrador automáticamente.
2. En el menú lateral, abre el grupo **MCP** → **API Keys** y pulsa "Create new".
3. Rellena al menos la **label** (por ejemplo `agente-lectura`) y, si conviene, la **description**.
4. En la barra lateral, marca las capacidades de cada colección:

   | Capacidad | Qué habilita |
   | --- | --- |
   | **Find** | leer documentos de la colección |
   | **Update** | modificar documentos |
   | **Create** | crear documentos |
   | **Delete** | borrar documentos |

   Las casillas vienen **desmarcadas** por defecto: una clave sin capacidades marcadas no expone ninguna herramienta de esa colección. Activa sólo lo que el agente vaya a usar.
5. Guarda. El valor de la clave se genera al crear el documento y **sólo se muestra en ese momento**: cópialo y guárdalo en el sitio donde viva la configuración de tu agente. El campo no se puede volver a leer (se almacena cifrado y con índice), así que, si lo pierdes, crea otra clave y borra la perdida.

La clave queda ligada a tu cuenta y no se puede reasignar a otro usuario. Para dar de baja el acceso, borra la clave desde el panel.

## Colecciones expuestas

Las colecciones que el plugin expone están declaradas en `src/payload.config.ts` (`plugins → mcpPlugin({ collections })`):

| Colección | `slug` | Herramientas MCP |
| --- | --- | --- |
| Cuentas | `users` | `findUsers`, `createUsers`, `updateUsers`, `deleteUsers` |
| Cuadrillas | `cuadrillas` | `findCuadrillas`, `createCuadrillas`, `updateCuadrillas`, `deleteCuadrillas` |
| Costaleros | `costaleros` | `findCostaleros`, `createCostaleros`, `updateCostaleros`, `deleteCostaleros` |
| Pasos | `pasos` | `findPasos`, `createPasos`, `updatePasos`, `deletePasos` |
| Relevos | `relevos` | `findRelevos`, `createRelevos`, `updateRelevos`, `deleteRelevos` |
| Puntos de relevo | `puntos-de-relevo` | `findPuntosDeRelevo`, `createPuntosDeRelevo`, `updatePuntosDeRelevo`, `deletePuntosDeRelevo` |

El nombre de cada herramienta es la operación (`find`, `create`, `update`, `delete`) seguida del `slug` de la colección en camelCase. Sólo aparecen las herramientas cuya capacidad esté marcada en la clave.

## La clave hereda el rol de su dueño

La clave se crea ligada a tu usuario y la petición MCP se ejecuta **con ese usuario**, no con un usuario genérico. Por eso el agente tiene exactamente los permisos de tu rol (`src/collections/Users.ts`):

| Rol | Puede leer | Puede escribir |
| --- | --- | --- |
| `admin` | todo | todo |
| `jefe` | todo | todo |
| `costalero` | los datos de la cuadrilla y su propia cuenta | nada |

En la práctica: una clave creada por una cuenta `costalero` puede consultar pero no escribir, aunque la clave tenga marcada la capacidad "Update". Escribe el "Update" con una clave de `jefe` o de `admin`.

## Conectar un cliente MCP

Configuración de ejemplo (formato habitual de los clientes MCP). Sustituye el marcador por el valor real de tu clave y **no guardes la clave en el repositorio**:

```json
{
  "mcpServers": {
    "cuadrilla": {
      "type": "http",
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer <MCP-USER-API-KEY>"
      }
    }
  }
}
```

## Ejemplo 1 — leer el plan de relevos de un paso

El agente pide los relevos de un paso, ordenados por su número y con las relaciones resueltas (cuadrilla entrante, cuadrilla saliente y punto de relevo):

```json
{
  "name": "findRelevos",
  "arguments": {
    "where": "{\"paso\":{\"equals\":\"<ID_DEL_PASO>\"}}",
    "sort": "orden",
    "limit": 50,
    "depth": 1
  }
}
```

| Argumento | Para qué sirve |
| --- | --- |
| `where` | filtro en JSON: `{"paso":{"equals":"<ID_DEL_PASO>"}}` |
| `sort` | campo por el que ordenar, por ejemplo `"orden"` o `"-orden"` |
| `limit` | máximo de documentos devueltos (hasta 100) |
| `depth` | niveles de relaciones a resolver (`1` trae cuadrilla y punto) |

Para ver primero los pasos y sus `trabajadoras`, el agente usa `findPasos` con el mismo estilo de filtro; para saber quién cubre cada puesto, `findCostaleros` y `findCuadrillas`.

## Ejemplo 2 — escribir el estado de un relevo

El agente marca el relevo como iniciado. Los campos del documento se pasan **en el mismo objeto** que el `id`:

```json
{
  "name": "updateRelevos",
  "arguments": {
    "id": "<ID_DEL_RELEVO>",
    "estado": "en_curso"
  }
}
```

Los valores válidos de `estado` son `planificado`, `en_curso`, `completado` y `omitido`. Si sólo se cambia un campo, el resto del relevo se queda como estaba.

## Buenas prácticas

- **Una clave por agente y por permiso.** Un agente que sólo consulta, con clave de sólo lectura; otro que escribe, con clave de `jefe` o `admin` y con "Delete" sin marcar.
- **Nada de secretos en el repo.** La clave vive en la configuración del cliente o en un gestor de secretos, nunca en un fichero versionado.
- **Filtra siempre por paso.** `findRelevos` sin `where` devuelve relevos de todos los pasos; combínalo con `limit`.
- **Antes de escribir, lee.** Un `updateRelevos` con `estado: "completado"` no comprueba las reglas de relevo: el motor de reglas vive en el dominio y evalúa el plan, no el documento.
- **Revoca cuando dejes de usar el agente.** Borrar la clave en el panel invalida el acceso al instante.
