/**
 * Genera los iconos PNG de la PWA sin dependencias binarias: dibuja el emblema
 * (viga del paso sobre dos hombros) y lo codifica con un encoder PNG mínimo
 * basado en `zlib` de Node.
 *
 * Uso: node scripts/generar-iconos.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const DESTINO = join(RAIZ, 'public', 'icons')

const TINTA = [0x1b, 0x10, 0x24]
const TINTA_900 = [0x2b, 0x1b, 0x3d]
const ORO = [0xe0, 0xa1, 0x3a]
const HUESO = [0xf2, 0xec, 0xe1]
const HUESO_TENUE = [0xcf, 0xc6, 0xb6]

const tablaCRC = (() => {
  const tabla = new Int32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    tabla[n] = c
  }
  return tabla
})()

function crc32(buffer) {
  let c = 0xffffffff
  for (let i = 0; i < buffer.length; i += 1) {
    c = tablaCRC[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function chunk(tipo, datos) {
  const longitud = Buffer.alloc(4)
  longitud.writeUInt32BE(datos.length)
  const tipoBuf = Buffer.from(tipo, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([tipoBuf, datos])))
  return Buffer.concat([longitud, tipoBuf, datos, crc])
}

function codificarPNG(ancho, alto, rgba) {
  const firma = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(ancho, 0)
  ihdr.writeUInt32BE(alto, 4)
  ihdr[8] = 8 // profundidad de bits
  ihdr[9] = 6 // RGBA
  const crudo = Buffer.alloc(alto * (1 + ancho * 4))
  for (let y = 0; y < alto; y += 1) {
    const base = y * (1 + ancho * 4)
    crudo[base] = 0 // filtro "none"
    rgba.copy(crudo, base + 1, y * ancho * 4, (y + 1) * ancho * 4)
  }
  return Buffer.concat([
    firma,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(crudo, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const dentroDeRectanguloRedondeado = (x, y, ancho, alto, radio) => {
  if (x < 0 || y < 0 || x > ancho || y > alto) return false
  const rx = Math.min(x, ancho - x)
  const ry = Math.min(y, alto - y)
  if (rx >= radio || ry >= radio) return true
  const dx = radio - rx
  const dy = radio - ry
  return dx * dx + dy * dy <= radio * radio
}

const dentroDeCirculo = (x, y, cx, cy, r) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r

/** Devuelve el color del emblema en coordenadas normalizadas, o null. */
function colorEmblema(u, v) {
  if (v >= 0.38 && v <= 0.45 && u >= 0.14 && u <= 0.86) return ORO
  if (dentroDeCirculo(u, v, 0.33, 0.51, 0.055)) return HUESO
  if (dentroDeCirculo(u, v, 0.67, 0.51, 0.055)) return HUESO
  if (u >= 0.295 && u <= 0.365 && v >= 0.565 && v <= 0.8) return HUESO_TENUE
  if (u >= 0.635 && u <= 0.705 && v >= 0.565 && v <= 0.8) return HUESO_TENUE
  return null
}

function renderizar(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4)
  const radio = maskable ? 0 : size * 0.22
  const escala = maskable ? 0.62 : 0.78

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Supersampling 2x2 para suavizar los bordes.
      let r = 0
      let g = 0
      let b = 0
      let a = 0

      for (let sy = 0; sy < 2; sy += 1) {
        for (let sx = 0; sx < 2; sx += 1) {
          const px = x + (sx + 0.5) / 2
          const py = y + (sy + 0.5) / 2

          let color = null
          let alpha = 0

          if (maskable) {
            color = TINTA
            alpha = 255
          } else if (dentroDeRectanguloRedondeado(px, py, size, size, radio)) {
            color = TINTA_900
            alpha = 255
          }

          if (color) {
            // Emblema centrado y escalado.
            const u = (px / size - 0.5) / escala + 0.5
            const v = (py / size - 0.5) / escala + 0.5
            const emblema = colorEmblema(u, v)
            if (emblema) {
              color = emblema
            }
          }

          if (color) {
            r += color[0] * alpha
            g += color[1] * alpha
            b += color[2] * alpha
            a += alpha
          }
        }
      }

      const offset = (y * size + x) * 4
      if (a === 0) {
        rgba[offset] = 0
        rgba[offset + 1] = 0
        rgba[offset + 2] = 0
        rgba[offset + 3] = 0
      } else {
        rgba[offset] = Math.round(r / a)
        rgba[offset + 1] = Math.round(g / a)
        rgba[offset + 2] = Math.round(b / a)
        rgba[offset + 3] = Math.round(a / 4)
      }
    }
  }

  return codificarPNG(size, size, rgba)
}

mkdirSync(DESTINO, { recursive: true })

const iconos = [
  { archivo: 'icon-192.png', size: 192, maskable: false },
  { archivo: 'icon-512.png', size: 512, maskable: false },
  { archivo: 'icon-maskable-512.png', size: 512, maskable: true },
]

for (const icono of iconos) {
  const png = renderizar(icono.size, { maskable: icono.maskable })
  writeFileSync(join(DESTINO, icono.archivo), png)
  console.log(`escrito ${icono.archivo} (${icono.size}x${icono.size}, ${png.length} bytes)`)
}
