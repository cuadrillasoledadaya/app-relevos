import type { AdaptadorAlmacen } from './contrato';

/**
 * Adaptador de almacenamiento sobre IndexedDB.
 *
 * Sin dependencias: usa la API nativa del navegador. Un único object store
 * guarda los pares clave/valor; los valores se serializan a texto JSON para
 * poder guardarlos tal cual y recuperarlos después.
 *
 * Cuando IndexedDB no está disponible (entorno sin navegador, ventana
 * privada que bloquea la base) el adaptador cae a un almacén en memoria: la
 * app sigue funcionando, sólo que los datos no sobreviven a la recarga.
 */

/** Nombre por defecto de la base de datos local. */
const NOMBRE_BASE = 'cuadrilla-offline';

/** Nombre del object store donde se guardan los valores. */
const NOMBRE_ALMACEN = 'datos';

/** Versión del esquema local. */
const VERSION_BASE = 1;

/** Serializa un valor a texto JSON; `undefined` se guarda como `null`. */
function serializar(valor: unknown): string {
  const texto = JSON.stringify(valor ?? null);

  return texto === undefined ? 'null' : texto;
}

/** Lee un texto JSON guardado; devuelve `null` si no se puede interpretar. */
function deserializar(texto: unknown): unknown {
  if (typeof texto !== 'string') return null;

  try {
    return JSON.parse(texto) as unknown;
  } catch {
    return null;
  }
}

/** Almacén en memoria: sustituye a IndexedDB cuando no se puede usar. */
function crearAlmacenEnMemoria(): AdaptadorAlmacen {
  const mapa = new Map<string, string>();

  return {
    async leer(clave) {
      const texto = mapa.get(clave);

      return texto === undefined ? null : deserializar(texto);
    },
    async escribir(clave, valor) {
      mapa.set(clave, serializar(valor));
    },
    async listar(prefijo) {
      return [...mapa.keys()].filter((clave) => clave.startsWith(prefijo)).sort();
    },
    async borrar(clave) {
      mapa.delete(clave);
    },
  };
}

/** Abre la base local creando el object store si hace falta. */
function abrirBase(nombreBase: string): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    const peticion = indexedDB.open(nombreBase, VERSION_BASE);

    peticion.onupgradeneeded = () => {
      const base = peticion.result;

      if (!base.objectStoreNames.contains(NOMBRE_ALMACEN)) {
        base.createObjectStore(NOMBRE_ALMACEN);
      }
    };

    peticion.onsuccess = () => resolver(peticion.result);
    peticion.onerror = () => rechazar(peticion.error ?? new Error('IndexedDB is not available'));
    peticion.onblocked = () => rechazar(new Error('IndexedDB is blocked'));
  });
}

/** Lee una clave de la base local. */
function leerEnBase(base: IDBDatabase, clave: string): Promise<unknown | null> {
  return new Promise((resolver) => {
    try {
      const peticion = base.transaction(NOMBRE_ALMACEN, 'readonly').objectStore(NOMBRE_ALMACEN).get(clave);

      peticion.onsuccess = () => resolver(deserializar(peticion.result));
      peticion.onerror = () => resolver(null);
    } catch {
      resolver(null);
    }
  });
}

/** Escribe una clave en la base local. */
function escribirEnBase(base: IDBDatabase, clave: string, valor: unknown): Promise<void> {
  return new Promise((resolver) => {
    try {
      const transaccion = base.transaction(NOMBRE_ALMACEN, 'readwrite');
      transaccion.objectStore(NOMBRE_ALMACEN).put(serializar(valor), clave);
      transaccion.oncomplete = () => resolver();
      transaccion.onerror = () => resolver();
      transaccion.onabort = () => resolver();
    } catch {
      resolver();
    }
  });
}

/** Lista las claves que empiezan por el prefijo dado. */
function listarEnBase(base: IDBDatabase, prefijo: string): Promise<string[]> {
  return new Promise((resolver) => {
    try {
      const peticion = base.transaction(NOMBRE_ALMACEN, 'readonly').objectStore(NOMBRE_ALMACEN).getAllKeys();

      peticion.onsuccess = () => {
        const claves = Array.isArray(peticion.result) ? peticion.result : [];

        resolver(
          claves
            .filter((clave): clave is string => typeof clave === 'string')
            .filter((clave) => clave.startsWith(prefijo))
            .sort(),
        );
      };
      peticion.onerror = () => resolver([]);
    } catch {
      resolver([]);
    }
  });
}

/** Borra una clave de la base local. */
function borrarEnBase(base: IDBDatabase, clave: string): Promise<void> {
  return new Promise((resolver) => {
    try {
      const transaccion = base.transaction(NOMBRE_ALMACEN, 'readwrite');
      transaccion.objectStore(NOMBRE_ALMACEN).delete(clave);
      transaccion.oncomplete = () => resolver();
      transaccion.onerror = () => resolver();
      transaccion.onabort = () => resolver();
    } catch {
      resolver();
    }
  });
}

/**
 * Crea un adaptador sobre IndexedDB.
 *
 * La base se abre de forma perezosa (en la primera operación) y, si no se
 * puede abrir, el adaptador usa un almacén en memoria.
 */
export function crearAdaptadorIndexedDB(nombreBase: string = NOMBRE_BASE): AdaptadorAlmacen {
  const memoria = crearAlmacenEnMemoria();
  let apertura: Promise<IDBDatabase | null> | null = null;

  async function obtenerBase(): Promise<IDBDatabase | null> {
    if (typeof indexedDB === 'undefined') return null;

    if (!apertura) {
      apertura = abrirBase(nombreBase).catch(() => null);
    }

    return apertura;
  }

  return {
    async leer(clave) {
      const base = await obtenerBase();

      if (!base) return memoria.leer(clave);

      return leerEnBase(base, clave);
    },
    async escribir(clave, valor) {
      const base = await obtenerBase();

      if (!base) return memoria.escribir(clave, valor);

      return escribirEnBase(base, clave, valor);
    },
    async listar(prefijo) {
      const base = await obtenerBase();

      if (!base) return memoria.listar(prefijo);

      return listarEnBase(base, prefijo);
    },
    async borrar(clave) {
      const base = await obtenerBase();

      if (!base) return memoria.borrar(clave);

      return borrarEnBase(base, clave);
    },
  };
}

/** Instancia por defecto, creada de forma perezosa. */
let instanciaPorDefecto: AdaptadorAlmacen | null = null;

/** Devuelve el adaptador local por defecto (IndexedDB con respaldo en memoria). */
export function adaptadorPorDefecto(): AdaptadorAlmacen {
  if (!instanciaPorDefecto) {
    instanciaPorDefecto = crearAdaptadorIndexedDB();
  }

  return instanciaPorDefecto;
}
