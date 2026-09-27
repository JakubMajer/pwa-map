// Vykreslí ikonu PWA: oranžový pin na tmavém podkladu.
// Bez závislostí – rasterizace ručně, PNG přes vestavěné zlib.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [0x0f, 0x11, 0x15] // theme_color aplikace
const PIN = [0xf9, 0x73, 0x16] // oranžová z palety kategorií
const HOLE = [0xff, 0xff, 0xff]

// Geometrie v podílech hrany ikony. Pin se vejde do středových 80 %,
// takže snese i maskable ořez na kruh.
const CX = 0.5
const CY = 0.4 // střed hlavy pinu
const R = 0.145 // poloměr hlavy
const TIP = 0.74 // špička
const HOLE_R = 0.055

// Špička je hrot trojúhelníku, jehož ramena se dotýkají hlavy pinu –
// tím na sebe kruh a hrot navazují bez zlomu.
const d = TIP - CY
const L = Math.sqrt(d * d - R * R)
const T = { x: (R * L) / d, y: (R * R) / d } // dotykový bod vpravo od středu

function sign(ax, ay, bx, by, cx, cy) {
  return (ax - cx) * (by - cy) - (bx - cx) * (ay - cy)
}

function inPin(x, y) {
  const dx = x - CX
  const dy = y - CY
  if (dx * dx + dy * dy <= R * R) return true
  // trojúhelník (špička, levý dotyk, pravý dotyk) v souřadnicích od středu hlavy
  const p = [dx, dy]
  const a = [0, d]
  const b = [-T.x, T.y]
  const c = [T.x, T.y]
  const s1 = sign(p[0], p[1], a[0], a[1], b[0], b[1])
  const s2 = sign(p[0], p[1], b[0], b[1], c[0], c[1])
  const s3 = sign(p[0], p[1], c[0], c[1], a[0], a[1])
  return !((s1 < 0 || s2 < 0 || s3 < 0) && (s1 > 0 || s2 > 0 || s3 > 0))
}

function inHole(x, y) {
  const dx = x - CX
  const dy = y - CY
  return dx * dx + dy * dy <= HOLE_R * HOLE_R
}

const SS = 4 // vzorků na pixel v každé ose = vyhlazené hrany

function render(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1))
  let offset = 0
  for (let py = 0; py < size; py++) {
    raw[offset++] = 0 // filtr řádku: none
    for (let px = 0; px < size; px++) {
      let pin = 0
      let hole = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size
          const y = (py + (sy + 0.5) / SS) / size
          if (inPin(x, y)) pin++
          if (inHole(x, y)) hole++
        }
      }
      const total = SS * SS
      const pinA = pin / total
      const holeA = hole / total
      for (let c = 0; c < 3; c++) {
        const withPin = BG[c] + (PIN[c] - BG[c]) * pinA
        raw[offset++] = Math.round(withPin + (HOLE[c] - withPin) * holeA)
      }
      raw[offset++] = 255
    }
  }
  return raw
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

function png(size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bitová hloubka
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(render(size), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const [size, path] of process.argv.slice(2).map((a) => a.split(':'))) {
  writeFileSync(path, png(Number(size)))
  console.log(`${path} – ${size}×${size}`)
}
