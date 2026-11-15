import { describe, expect, it, vi } from 'vitest';

import { crearAdaptadorIndexedDB } from '../../src/pwa/adaptador-indicedb';
import {
  CLAVE_COLA,
  EVENTO_SYNC_PENDIENTE,
  PREFIJO_LECTURAS,
  crearCapaOffline,
} from '../../src/pwa';
import type { AdaptadorAlmacen, EscrituraPendiente } from '../../src/pwa';

/**
 * Doble de almacenamiento en memoria.
 *
 * Serializa los valores igual que lo hace el adaptador real de IndexedDB
 * (texto JSON) para que la capa se comporte en los tests como en el
 * navegador.
 */
function crearAlmacenEnMemoria(): AdaptadorAlmacen {
  const mapa = new Map<string, string>();

  return {
    async leer(clave) {
      const texto = mapa.get(clave);

      if (texto === undefined) return null;

      try {
        return JSON.parse(texto) as unknown;
      } catch {
        return null;
      }
    },
    async escribir(clave, valor) {
      mapa.set(clave, JSON.stringify(valor ?? null));
    },
    async listar(prefijo) {
      return [...mapa.keys()].filter((clave) => clave.startsWith(prefijo)).sort();
    },
    async borrar(clave) {
      mapa.delete(clave);
    },
  };
}

/** Capa con un doble en memoria y un envío simulado. */
function crearCapaDePrueba(enviar?: (escritura: EscrituraPendiente) => Promise<boolean>) {
  return crearCapaOffline(crearAlmacenEnMemoria(), enviar ? { enviar } : {});
}

/** Petición de IndexedDB con los manejadores que usa el adaptador. */
interface PeticionFalsa<T> {
  result?: T;
  onsuccess?: () => void;
  onerror?: () => void;
  onupgradeneeded?: () => void;
}

/**
 * Doble mínimo de IndexedDB.
 *
 * Cubre la parte de la API que usa el adaptador (abrir la base, crear el
 * object store, `get`, `put`, `delete` y `getAllKeys`) sin añadir ninguna
 * dependencia al proyecto.
 */
function crearIndexedDBFalso(opciones: { fallaAlAbrir?: boolean } = {}) {
  const datos = new Map<string, string>();
  const almacenes = new Set<string>();

  const crearPeticion = <T,>(ejecutar: () => T): PeticionFalsa<T> => {
    const peticion: PeticionFalsa<T> = {};

    queueMicrotask(() => {
      try {
        peticion.result = ejecutar();
        peticion.onsuccess?.();
      } catch {
        peticion.onerror?.();
      }
    });

    return peticion;
  };

  const crearTransaccion = () => {
    const transaccion: {
      oncomplete?: () => void;
      onerror?: () => void;
      onabort?: () => void;
      objectStore: (_nombre: string) => unknown;
    } = {
      objectStore: () => ({
        get: (clave: string) => crearPeticion(() => datos.get(clave)),
        put: (valor: string, clave: string) => {
          datos.set(clave, valor);
          queueMicrotask(() => transaccion.oncomplete?.());
        },
        delete: (clave: string) => {
          datos.delete(clave);
          queueMicrotask(() => transaccion.oncomplete?.());
        },
        getAllKeys: () => crearPeticion(() => [...datos.keys()]),
      }),
    };

    return transaccion;
  };

  const base = {
    objectStoreNames: { contains: (nombre: string) => almacenes.has(nombre) },
    createObjectStore: (nombre: string) => {
      almacenes.add(nombre);
    },
    transaction: () => crearTransaccion(),
  };

  const abrir = (): PeticionFalsa<typeof base> => {
    const peticion: PeticionFalsa<typeof base> = {};

    queueMicrotask(() => {
      if (opciones.fallaAlAbrir) {
        peticion.onerror?.();
        return;
      }

      peticion.result = base;
      peticion.onupgradeneeded?.();
      queueMicrotask(() => peticion.onsuccess?.());
    });

    return peticion;
  };

  return { indexedDB: { open: abrir }, datos };
}

/** Sustituye `indexedDB` durante la prueba y devuelve la función para restaurarlo. */
function sustituirIndexedDB(valor: unknown): () => void {
  const global = globalThis as { indexedDB?: unknown };
  const original = global.indexedDB;

  global.indexedDB = valor;

  return () => {
    global.indexedDB = original;
  };
}

describe('adaptador local', () => {
  it('guarda los valores como texto JSON en el almacén local', async () => {
    const falso = crearIndexedDBFalso();
    const restaurar = sustituirIndexedDB(falso.indexedDB);

    try {
      const adaptador = crearAdaptadorIndexedDB('prueba');

      await adaptador.escribir('dato:pasos', [{ id: 'p1' }]);

      expect(falso.datos.get('dato:pasos')).toBe('[{"id":"p1"}]');
      await expect(adaptador.leer('dato:pasos')).resolves.toEqual([{ id: 'p1' }]);
      await expect(adaptador.listar('dato:')).resolves.toEqual(['dato:pasos']);

      await adaptador.borrar('dato:pasos');

      await expect(adaptador.leer('dato:pasos')).resolves.toBeNull();
    } finally {
      restaurar();
    }
  });

  it('cae a memoria cuando IndexedDB no está disponible', async () => {
    const restaurar = sustituirIndexedDB(undefined);

    try {
      const adaptador = crearAdaptadorIndexedDB('prueba');

      await adaptador.escribir('dato:pasos', [{ id: 'p1' }]);

      await expect(adaptador.leer('dato:pasos')).resolves.toEqual([{ id: 'p1' }]);
      await expect(adaptador.listar('dato:')).resolves.toEqual(['dato:pasos']);
    } finally {
      restaurar();
    }
  });

  it('cae a memoria cuando la base local no se puede abrir', async () => {
    const falso = crearIndexedDBFalso({ fallaAlAbrir: true });
    const restaurar = sustituirIndexedDB(falso.indexedDB);

    try {
      const adaptador = crearAdaptadorIndexedDB('prueba');

      await adaptador.escribir('dato:pasos', [{ id: 'p1' }]);

      await expect(adaptador.leer('dato:pasos')).resolves.toEqual([{ id: 'p1' }]);
      await expect(adaptador.listar('dato:')).resolves.toEqual(['dato:pasos']);
    } finally {
      restaurar();
    }
  });
});

describe('capa offline', () => {
  describe('lecturas cacheadas', () => {
    it('guarda y lee una lectura cacheada', async () => {
      const capa = crearCapaDePrueba();

      await capa.guardarLectura('pasos', [{ id: 'paso-1' }]);

      await expect(capa.leerLectura('pasos')).resolves.toEqual([{ id: 'paso-1' }]);
    });

    it('devuelve null al leer una lectura que no existe', async () => {
      const capa = crearCapaDePrueba();

      await expect(capa.leerLectura('pasos')).resolves.toBeNull();
    });

    it('lista las lecturas cacheadas cuyo prefijo coincide', async () => {
      const capa = crearCapaDePrueba();

      await capa.guardarLectura('paso-1', { id: 'p1' });
      await capa.guardarLectura('paso-2', { id: 'p2' });
      await capa.guardarLectura('cuadrilla-1', { id: 'c1' });

      const lecturas = await capa.listarLecturas<{ id: string }>('paso');

      expect(lecturas.map((lectura) => lectura.clave)).toEqual(['paso-1', 'paso-2']);
      expect(lecturas[0].datos).toEqual({ id: 'p1' });
    });

    it('guarda las lecturas bajo el prefijo documentado y la cola bajo su clave', async () => {
      const almacen = crearAlmacenEnMemoria();
      const capa = crearCapaOffline(almacen);

      await capa.guardarLectura('pasos', [{ id: 'paso-1' }]);
      await capa.encolarEscritura({ url: '/api/relevos', metodo: 'POST', cuerpo: {} });

      await expect(almacen.leer(`${PREFIJO_LECTURAS}pasos`)).resolves.toEqual([
        { id: 'paso-1' },
      ]);
      await expect(almacen.leer(CLAVE_COLA)).resolves.toHaveLength(1);
    });
  });

  describe('cola de escrituras', () => {
    it('encola una escritura con identificador estable y la lista en orden de inserción', async () => {
      const capa = crearCapaDePrueba();

      const primera = await capa.encolarEscritura({
        url: '/api/relevos',
        metodo: 'POST',
        cuerpo: { puntoId: 'punto-1' },
      });
      const segunda = await capa.encolarEscritura({
        url: '/api/relevos/relevo-2',
        metodo: 'PATCH',
        cuerpo: { estado: 'iniciado' },
      });

      expect(typeof primera.id).toBe('string');
      expect(primera.id).not.toBe(segunda.id);
      expect(primera.intentos).toBe(0);
      expect(typeof primera.creadoEn).toBe('number');

      const pendientes = await capa.listarEscriturasPendientes();

      expect(pendientes.map((escritura) => escritura.url)).toEqual([
        '/api/relevos',
        '/api/relevos/relevo-2',
      ]);
      expect(pendientes[0].id).toBe(primera.id);
      expect(pendientes[1].cuerpo).toEqual({ estado: 'iniciado' });
    });

    it('no encola nada duplicado aunque se llame dos veces con la misma entrada', async () => {
      const capa = crearCapaDePrueba();
      const entrada = { url: '/api/relevos', metodo: 'POST' as const, cuerpo: { a: 1 } };

      await capa.encolarEscritura(entrada);
      await capa.encolarEscritura(entrada);

      const pendientes = await capa.listarEscriturasPendientes();

      expect(pendientes).toHaveLength(2);
      expect(pendientes[0].id).not.toBe(pendientes[1].id);
    });
  });

  describe('sincronización', () => {
    it('quita la escritura aceptada y conserva la fallida con su contador de intentos', async () => {
      const enviar = vi.fn(async (escritura: EscrituraPendiente) => escritura.url !== '/api/fallida');
      const capa = crearCapaDePrueba(enviar);

      await capa.encolarEscritura({ url: '/api/aceptada', metodo: 'POST', cuerpo: {} });
      await capa.encolarEscritura({ url: '/api/fallida', metodo: 'POST', cuerpo: {} });

      const resultado = await capa.sincronizarPendientes();

      expect(resultado).toEqual({ sincronizadas: 1, fallidas: 1, pendientes: 1 });

      const pendientes = await capa.listarEscriturasPendientes();

      expect(pendientes).toHaveLength(1);
      expect(pendientes[0].url).toBe('/api/fallida');
      expect(pendientes[0].intentos).toBe(1);
    });

    it('un envío fallido no bloquea el resto de la cola', async () => {
      const enviar = vi.fn(async (escritura: EscrituraPendiente) => {
        if (escritura.url === '/api/fallida') throw new Error('sin red');

        return true;
      });
      const capa = crearCapaDePrueba(enviar);

      await capa.encolarEscritura({ url: '/api/fallida', metodo: 'POST', cuerpo: {} });
      await capa.encolarEscritura({ url: '/api/aceptada', metodo: 'POST', cuerpo: {} });

      const resultado = await capa.sincronizarPendientes();

      expect(resultado).toEqual({ sincronizadas: 1, fallidas: 1, pendientes: 1 });
      expect(enviar).toHaveBeenCalledTimes(2);

      const pendientes = await capa.listarEscriturasPendientes();

      expect(pendientes.map((escritura) => escritura.url)).toEqual(['/api/fallida']);
    });

    it('acumula los intentos de una escritura que sigue fallando', async () => {
      const capa = crearCapaDePrueba(async () => false);

      await capa.encolarEscritura({ url: '/api/fallida', metodo: 'POST', cuerpo: {} });

      await capa.sincronizarPendientes();
      await capa.sincronizarPendientes();

      const pendientes = await capa.listarEscriturasPendientes();

      expect(pendientes[0].intentos).toBe(2);
    });

    it('no falla ni lanza con la cola vacía', async () => {
      const capa = crearCapaDePrueba();

      await expect(capa.sincronizarPendientes()).resolves.toEqual({
        sincronizadas: 0,
        fallidas: 0,
        pendientes: 0,
      });
    });

    it('no envía dos veces la misma escritura cuando llegan dos sincronizaciones a la vez', async () => {
      let abrirPuerta: (() => void) | undefined;
      const puerta = new Promise<void>((resolver) => {
        abrirPuerta = resolver;
      });
      const enviar = vi.fn(async () => {
        await puerta;

        return true;
      });
      const capa = crearCapaDePrueba(enviar);

      await capa.encolarEscritura({ url: '/api/relevos', metodo: 'POST', cuerpo: {} });

      const primera = capa.sincronizarPendientes();
      const segunda = capa.sincronizarPendientes();

      await vi.waitFor(() => expect(enviar).toHaveBeenCalled());
      await new Promise((resolver) => setTimeout(resolver, 10));
      abrirPuerta?.();

      await expect(primera).resolves.toEqual({ sincronizadas: 1, fallidas: 0, pendientes: 0 });
      await expect(segunda).resolves.toEqual({ sincronizadas: 1, fallidas: 0, pendientes: 0 });
      expect(enviar).toHaveBeenCalledTimes(1);
    });

    it('envía con fetch por defecto y acepta las respuestas 2xx', async () => {
      const original = globalThis.fetch;
      const fetchStub = vi.fn(async (_url: string, _opciones?: RequestInit) => ({
        ok: true,
        status: 204,
      }) as Response);
      globalThis.fetch = fetchStub as unknown as typeof fetch;

      try {
        const capa = crearCapaOffline(crearAlmacenEnMemoria());

        await capa.encolarEscritura({
          url: '/api/relevos',
          metodo: 'POST',
          cuerpo: { puntoId: 'punto-1' },
        });

        const resultado = await capa.sincronizarPendientes();

        expect(resultado).toEqual({ sincronizadas: 1, fallidas: 0, pendientes: 0 });
        expect(fetchStub).toHaveBeenCalledTimes(1);
        expect(fetchStub.mock.calls[0][0]).toBe('/api/relevos');
      } finally {
        globalThis.fetch = original;
      }
    });

    it('mantiene la escritura encolada cuando no hay fetch disponible', async () => {
      const original = globalThis.fetch;
      (globalThis as { fetch?: unknown }).fetch = undefined;

      try {
        const capa = crearCapaOffline(crearAlmacenEnMemoria());

        await capa.encolarEscritura({ url: '/api/relevos', metodo: 'POST', cuerpo: {} });

        const resultado = await capa.sincronizarPendientes();

        expect(resultado).toEqual({ sincronizadas: 0, fallidas: 1, pendientes: 1 });
      } finally {
        globalThis.fetch = original;
      }
    });
  });

  describe('sincronización automática', () => {
    it('sincroniza cuando el navegador vuelve a estar en línea', async () => {
      const enviar = vi.fn(async () => true);
      const capa = crearCapaDePrueba(enviar);

      await capa.encolarEscritura({ url: '/api/relevos', metodo: 'POST', cuerpo: {} });

      const parar = capa.registrarSincronizacionAutomatica();

      window.dispatchEvent(new Event('online'));

      await vi.waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
      await vi.waitFor(async () =>
        expect(await capa.listarEscriturasPendientes()).toHaveLength(0),
      );

      parar();
    });

    it('sincroniza con el evento personalizado que emite el service worker', async () => {
      const enviar = vi.fn(async () => true);
      const capa = crearCapaDePrueba(enviar);

      await capa.encolarEscritura({ url: '/api/relevos', metodo: 'POST', cuerpo: {} });

      const parar = capa.registrarSincronizacionAutomatica();

      window.dispatchEvent(new CustomEvent(EVENTO_SYNC_PENDIENTE));

      await vi.waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));

      parar();
    });

    it('deja de sincronizar cuando se cancela la escucha', async () => {
      const enviar = vi.fn(async () => true);
      const capa = crearCapaDePrueba(enviar);

      await capa.encolarEscritura({ url: '/api/relevos', metodo: 'POST', cuerpo: {} });

      const parar = capa.registrarSincronizacionAutomatica();
      parar();

      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new CustomEvent(EVENTO_SYNC_PENDIENTE));

      await new Promise((resolver) => setTimeout(resolver, 20));

      expect(enviar).not.toHaveBeenCalled();
    });
  });
});
