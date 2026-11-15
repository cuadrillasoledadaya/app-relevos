/**
 * Errores de dominio con mensaje en español, listos para mostrarse en la app.
 * Los códigos son estables: la interfaz y los tests los referencian por código,
 * no por el texto literal.
 */

/** Código de error: el número de trabajaderas pedido no es válido. */
export const CODIGO_NUMERO_TRABAJADERAS_INVALIDO = 'NUMERO_TRABAJADERAS_INVALIDO'

/** Mensaje asociado a `CODIGO_NUMERO_TRABAJADERAS_INVALIDO`. */
export const MENSAJE_NUMERO_TRABAJADERAS_INVALIDO =
  'El número de trabajaderas debe ser un entero mayor o igual a 1.'

/** Código de error: el número de tramos de una trabajadera no es válido. */
export const CODIGO_TRAMOS_INVALIDOS = 'TRAMOS_INVALIDOS'

/** Mensaje asociado a `CODIGO_TRAMOS_INVALIDOS`. */
export const MENSAJE_TRAMOS_INVALIDOS =
  'El número de tramos de una trabajadera debe ser un entero mayor o igual a 1.'

/** Código de error: una trabajadera no tiene costaleros suficientes para cubrir sus puestos. */
export const CODIGO_COSTALEROS_INSUFICIENTES = 'COSTALEROS_INSUFICIENTES'

/** Mensaje asociado a `CODIGO_COSTALEROS_INSUFICIENTES`. */
export const MENSAJE_COSTALEROS_INSUFICIENTES =
  'Una trabajadera no tiene costaleros suficientes para cubrir los cinco puestos.'

/** Error de dominio con código estable y mensaje para la persona usuaria. */
export class ErrorDeDominio extends Error {
  readonly codigo: string

  constructor(codigo: string, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorDeDominio'
    this.codigo = codigo
  }
}
