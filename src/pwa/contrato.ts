/**
 * Contrato de la capa offline de la PWA.
 *
 * Es la frontera compartida entre la app (que consume los datos) y la
 * implementación del almacenamiento (IndexedDB). Permite inyectar un doble en
 * los tests sin tocar el código de la app.
 *
 * Convenciones de claves:
 * - `dato:<clave>` para una lectura cacheada (por ejemplo `dato:pasos`).
 * - `cola` para la cola de escrituras pendientes.
 */

/** Métodos HTTP que la app puede encolar para ejecutar sin conexión. */
export type MetodoEscritura = 'POST' | 'PATCH' | 'DELETE'

/** Escritura pendiente de ejecutar contra la API. */
export interface EscrituraPendiente {
  /** Identificador estable de la escritura (sirve para reintentos). */
  id: string;
  /** Ruta de la API, por ejemplo `/api/relevos/1`. */
  url: string;
  metodo: MetodoEscritura;
  /** Cuerpo de la petición, ya serializado a algo serializable. */
  cuerpo: unknown;
  /** Marca de tiempo en milisegundos. */
  creadoEn: number;
  /** Intentos de envío realizados hasta ahora. */
  intentos: number;
}

/** Escritura que la app encola sin los campos que calcula la capa. */
export type NuevaEscritura = Omit<EscrituraPendiente, 'id' | 'creadoEn' | 'intentos'>

/** Resultado de un intento de sincronización de la cola. */
export interface ResultadoSincronizacion {
  /** Escrituras que el servidor aceptó. */
  sincronizadas: number;
  /** Escrituras que fallaron y siguen encoladas. */
  fallidas: number;
  /** Escrituras que quedan pendientes en total. */
  pendientes: number;
}

/** Lectura cacheada junto a su clave. */
export interface LecturaGuardada<T> {
  clave: string;
  datos: T;
}

/**
 * Adaptador de almacenamiento clave/valor.
 *
 * La implementación real usa IndexedDB; los tests inyectan un doble en
 * memoria. La capa no sabe cuál de los dos está usando.
 */
export interface AdaptadorAlmacen {
  /** Lee un valor; `null` si no existe. */
  leer(clave: string): Promise<unknown | null>;
  /** Escribe (o reemplaza) un valor. */
  escribir(clave: string, valor: unknown): Promise<void>;
  /** Lista las claves que empiezan por el prefijo dado. */
  listar(prefijo: string): Promise<string[]>;
  /** Borra una clave; no falla si no existe. */
  borrar(clave: string): Promise<void>;
}

/**
 * Envía una escritura pendiente. Devuelve `true` cuando el servidor la
 * aceptó. La implementación por defecto usa `fetch`.
 */
export type EnviarEscritura = (escritura: EscrituraPendiente) => Promise<boolean>

/** Opciones de construcción de la capa offline. */
export interface OpcionesCapaOffline {
  /** Reemplaza el envío por `fetch` (tests, entornos sin red). */
  enviar?: EnviarEscritura;
}

/** Superficie pública de la capa offline. */
export interface CapaOffline {
  /** Cachea una lectura para poder usarla sin conexión. */
  guardarLectura(clave: string, datos: unknown): Promise<void>;
  /** Lee una lectura cacheada; `null` si no está. */
  leerLectura<T>(clave: string): Promise<T | null>;
  /** Lista las lecturas cacheadas cuyo prefijo coincide. */
  listarLecturas<T>(prefijo: string): Promise<LecturaGuardada<T>[]>;
  /** Encola una escritura para ejecutarla cuando vuelva la red. */
  encolarEscritura(entrada: NuevaEscritura): Promise<EscrituraPendiente>;
  /** Lista la cola de escrituras pendientes. */
  listarEscriturasPendientes(): Promise<EscrituraPendiente[]>;
  /** Intenta vaciar la cola; las que fallan siguen pendientes. */
  sincronizarPendientes(): Promise<ResultadoSincronizacion>;
  /**
   * Escucha los eventos que piden sincronizar: `online` del navegador y el
   * evento `cuadrilla:sync-pendiente` que emite el service worker.
   * Devuelve la función para dejar de escuchar.
   */
  registrarSincronizacionAutomatica(): () => void;
}

/** Nombre del evento que el service worker emite para pedir sincronización. */
export const EVENTO_SYNC_PENDIENTE = 'cuadrilla:sync-pendiente';

/** Prefijo de las claves de lecturas cacheadas. */
export const PREFIJO_LECTURAS = 'dato:';

/** Clave bajo la que se guarda la cola de escrituras pendientes. */
export const CLAVE_COLA = 'cola';
