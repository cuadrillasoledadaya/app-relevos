import {
  CLAVE_COLA,
  EVENTO_SYNC_PENDIENTE,
  PREFIJO_LECTURAS,
} from './contrato';
import type {
  AdaptadorAlmacen,
  CapaOffline,
  EnviarEscritura,
  EscrituraPendiente,
  LecturaGuardada,
  MetodoEscritura,
  NuevaEscritura,
  OpcionesCapaOffline,
  ResultadoSincronizacion,
} from './contrato';

/**
 * Capa offline de la PWA.
 *
 * La capa guarda en el almacenamiento local las lecturas que la app necesita
 * para funcionar sin red y mantiene una cola de escrituras (por ejemplo,
 * registrar un relevo) que se envían cuando la conexión vuelve.
 *
 * La capa no sabe dónde vive el almacenamiento: recibe un
 * `AdaptadorAlmacen`, de modo que los tests pueden inyectar un doble en
 * memoria y el navegador usa IndexedDB.
 *
 * Todas las funciones globales (`window`, `fetch`) se comprueban antes de
 * usarlas: en un entorno sin navegador la capa sigue funcionando y sólo
 * deja de poder sincronizar.
 */

/** Envío por defecto: `fetch` con el cuerpo JSON; el éxito es un 2xx. */
export async function enviarPorFetch(escritura: EscrituraPendiente): Promise<boolean> {
  if (typeof fetch !== 'function') return false;

  try {
    const respuesta = await fetch(escritura.url, {
      method: escritura.metodo,
      headers: { 'Content-Type': 'application/json' },
      body: escritura.cuerpo === undefined ? undefined : JSON.stringify(escritura.cuerpo),
    });

    if (typeof respuesta.ok === 'boolean') return respuesta.ok;

    return respuesta.status >= 200 && respuesta.status < 300;
  } catch {
    return false;
  }
}

/** Normaliza un elemento de la cola para tolerar datos guardados por versiones anteriores. */
function normalizarEscritura(valor: unknown, posicion: number): EscrituraPendiente | null {
  if (!valor || typeof valor !== 'object') return null;

  const bruto = valor as Partial<EscrituraPendiente>;
  const metodo: MetodoEscritura =
    bruto.metodo === 'PATCH' || bruto.metodo === 'DELETE' ? bruto.metodo : 'POST';

  return {
    id: typeof bruto.id === 'string' ? bruto.id : `es-recuperada-${posicion}`,
    url: typeof bruto.url === 'string' ? bruto.url : '',
    metodo,
    cuerpo: bruto.cuerpo,
    creadoEn: typeof bruto.creadoEn === 'number' ? bruto.creadoEn : 0,
    intentos: typeof bruto.intentos === 'number' ? bruto.intentos : 0,
  };
}

/** Normaliza la cola guardada: descarta elementos inválidos y completa los campos. */
function normalizarCola(valor: unknown): EscrituraPendiente[] {
  if (!Array.isArray(valor)) return [];

  const cola: EscrituraPendiente[] = [];

  for (const elemento of valor) {
    const escritura = normalizarEscritura(elemento, cola.length);

    if (escritura) cola.push(escritura);
  }

  return cola;
}

/**
 * Crea la capa offline sobre un almacenamiento clave/valor.
 *
 * @param adaptador - Almacén donde se guardan las lecturas y la cola.
 * @param opciones - Permite reemplazar el envío (tests, entornos sin red).
 */
export function crearCapaOffline(
  adaptador: AdaptadorAlmacen,
  opciones: OpcionesCapaOffline = {},
): CapaOffline {
  const enviar: EnviarEscritura = opciones.enviar ?? enviarPorFetch;

  /** Contador monótono por capa: hace los identificadores únicos y reproducibles. */
  let contadorEscrituras = 0;

  /** Sincronización en curso, para no enviar dos veces la misma escritura. */
  let sincronizacionEnCurso: Promise<ResultadoSincronizacion> | null = null;

  async function leerCola(): Promise<EscrituraPendiente[]> {
    return normalizarCola(await adaptador.leer(CLAVE_COLA));
  }

  async function guardarCola(cola: EscrituraPendiente[]): Promise<void> {
    await adaptador.escribir(CLAVE_COLA, cola);
  }

  async function guardarLectura(clave: string, datos: unknown): Promise<void> {
    await adaptador.escribir(`${PREFIJO_LECTURAS}${clave}`, datos);
  }

  async function leerLectura<T>(clave: string): Promise<T | null> {
    const valor = await adaptador.leer(`${PREFIJO_LECTURAS}${clave}`);

    if (valor === null || valor === undefined) return null;

    return valor as T;
  }

  async function listarLecturas<T>(prefijo: string): Promise<LecturaGuardada<T>[]> {
    const claves = await adaptador.listar(`${PREFIJO_LECTURAS}${prefijo}`);
    const lecturas: LecturaGuardada<T>[] = [];

    for (const clave of claves) {
      const valor = await adaptador.leer(clave);

      if (valor === null || valor === undefined) continue;

      lecturas.push({ clave: clave.slice(PREFIJO_LECTURAS.length), datos: valor as T });
    }

    return lecturas;
  }

  async function encolarEscritura(entrada: NuevaEscritura): Promise<EscrituraPendiente> {
    const cola = await leerCola();
    const escritura: EscrituraPendiente = {
      id: `es-${contadorEscrituras}-${cola.length}`,
      url: entrada.url,
      metodo: entrada.metodo,
      cuerpo: entrada.cuerpo,
      creadoEn: Date.now(),
      intentos: 0,
    };

    contadorEscrituras += 1;

    await guardarCola([...cola, escritura]);

    return escritura;
  }

  async function listarEscriturasPendientes(): Promise<EscrituraPendiente[]> {
    return leerCola();
  }

  async function sincronizarPendientes(): Promise<ResultadoSincronizacion> {
    if (sincronizacionEnCurso) return sincronizacionEnCurso;

    const sincronizacion = ejecutarSincronizacion();

    sincronizacionEnCurso = sincronizacion;

    try {
      return await sincronizacion;
    } finally {
      if (sincronizacionEnCurso === sincronizacion) {
        sincronizacionEnCurso = null;
      }
    }
  }

  async function ejecutarSincronizacion(): Promise<ResultadoSincronizacion> {
    const cola = await leerCola();
    const restantes: EscrituraPendiente[] = [];
    let sincronizadas = 0;
    let fallidas = 0;

    for (const escritura of cola) {
      let aceptada = false;

      try {
        aceptada = await enviar(escritura);
      } catch {
        aceptada = false;
      }

      if (aceptada) {
        sincronizadas += 1;
        continue;
      }

      fallidas += 1;
      restantes.push({ ...escritura, intentos: escritura.intentos + 1 });
    }

    await guardarCola(restantes);

    return { sincronizadas, fallidas, pendientes: restantes.length };
  }

  function registrarSincronizacionAutomatica(): () => void {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return () => {};
    }

    const alPedirSincronizacion = () => {
      void sincronizarPendientes().catch((error: unknown) => {
        console.error('No se pudo sincronizar la cola de escrituras pendientes', error);
      });
    };

    window.addEventListener('online', alPedirSincronizacion);
    window.addEventListener(EVENTO_SYNC_PENDIENTE, alPedirSincronizacion);

    return () => {
      window.removeEventListener('online', alPedirSincronizacion);
      window.removeEventListener(EVENTO_SYNC_PENDIENTE, alPedirSincronizacion);
    };
  }

  return {
    guardarLectura,
    leerLectura,
    listarLecturas,
    encolarEscritura,
    listarEscriturasPendientes,
    sincronizarPendientes,
    registrarSincronizacionAutomatica,
  };
}
