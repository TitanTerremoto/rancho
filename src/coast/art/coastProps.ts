// Harbour props drawn in code — La Bahía
//
// The pieces the ranch has no equivalent of: the lighthouse, the harbour
// office, the market stalls, the boat shed, and the small gear that makes a
// quay look worked in — buoys, nets, an anchor, barrels, a beached rowboat.
//
// Same recipe as the ranch's buildings, deliberately: handheld 3/4 view (roof
// on top, façade below), short palettes, one highlight and one shade per
// volume, and a 1 px outline at the end. That is what keeps Sky's town and
// Guti's ranch looking like two places in one world rather than two games.

import { Painter } from '../../engine/painter'
import type { Sprite } from '../../engine/sprite'

const WOOD = { outline: '#3b2412', dark: '#6e4524', mid: '#96643a', light: '#be8650', top: '#dcaa72' }

const OUTLINE = '#2a2230'
const SEA_OUTLINE = '#1b2a3a'

/** Lightens (positive) or darkens (negative) a #rrggbb colour. */
function tint(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const mix = (channel: number): number =>
    Math.max(0, Math.min(255, Math.round(amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount))))
  const out = (mix((n >> 16) & 255) << 16) | (mix((n >> 8) & 255) << 8) | mix(n & 255)
  return `#${out.toString(16).padStart(6, '0')}`
}

/** Weathered planking used by everything that stands on the quay. */
function planking(p: Painter, x: number, y: number, w: number, h: number): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      const k = (xx - x) % 5
      p.set(xx, yy, k === 0 ? WOOD.dark : k === 1 ? WOOD.light : WOOD.mid)
    }
  }
}

/**
 * The lighthouse: a banded tower on the headland, with the lantern room and
 * its gallery on top and a keeper's hut at the foot.
 */
export function buildLighthouse(): Sprite {
  const W = 48
  const H = 116
  const p = new Painter(W, H)
  const cx = W / 2
  const white = { base: '#e8e4dc', light: '#f8f6f0', dark: '#bdb9b2' }
  const red = { base: '#cc4a3c', light: '#e4685a', dark: '#9d3328' }

  // Tower: a cone, so each row is a little wider than the one above it.
  const top = 26
  const bottom = H - 16
  for (let y = top; y < bottom; y++) {
    const f = (y - top) / (bottom - top)
    const half = 6.5 + f * 5.5
    const band = Math.floor((y - top) / 13) % 2 === 1
    const skin = band ? red : white
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const across = (x - (cx - half)) / (half * 2)
      p.set(x, y, across < 0.18 ? skin.light : across > 0.74 ? skin.dark : skin.base)
    }
  }

  // Base: a wider stone skirt the tower sits on.
  for (let y = bottom; y < H - 1; y++) {
    const half = 13 + (y - bottom) * 0.35
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const mortar = (y - bottom) % 4 === 3 || (x + Math.floor((y - bottom) / 4) * 3) % 7 === 0
      p.set(x, y, mortar ? '#5f646e' : x < cx - 3 ? '#adb3bd' : '#868c97')
    }
  }

  // Door and two windows up the shaft.
  p.rect(cx - 4, H - 15, 8, 14, '#5c3620')
  p.rect(cx - 3, H - 14, 6, 13, '#7a4a2c')
  p.set(cx + 1, H - 8, '#e8c040')
  for (const wy of [top + 20, top + 46]) {
    p.rect(cx - 3, wy, 6, 7, '#3c5a6e')
    p.rect(cx - 3, wy, 6, 3, '#5b7f95')
    p.frame(cx - 4, wy - 1, 8, 9, white.dark)
  }

  // Gallery: a railed walkway under the lantern.
  p.rect(cx - 12, top - 3, 24, 4, '#6b7280')
  p.hline(cx - 12, top - 3, 24, '#98a0ac')
  for (let x = cx - 11; x < cx + 12; x += 3) p.vline(x, top - 8, 5, '#6b7280')
  p.rect(cx - 12, top - 9, 24, 2, '#98a0ac')

  // Lantern room: glass, the lamp inside, and a little black cap.
  p.rect(cx - 8, top - 22, 16, 13, '#2c3c4a')
  for (let y = top - 21; y < top - 10; y++) {
    for (let x = cx - 7; x < cx + 7; x++) {
      const pane = (x - (cx - 7)) % 5 === 0
      p.set(x, y, pane ? '#2c3c4a' : y < top - 17 ? '#bfe0ea' : '#8fbdd0')
    }
  }
  p.rect(cx - 4, top - 19, 8, 7, '#f6e27a')
  p.rect(cx - 3, top - 18, 6, 5, '#fff6c0')
  p.rect(cx - 10, top - 25, 20, 4, '#3a3f4a')
  p.rect(cx - 6, top - 28, 12, 3, '#3a3f4a')
  p.vline(cx, top - 32, 4, '#3a3f4a')
  p.outline(OUTLINE)
  return p.toSprite({ ax: W / 2, ay: H - 1, castShadow: false })
}

/** The harbour office at the head of the piers: planks, shingles, a lamp. */
export function buildDockHouse(): Sprite {
  const W = 48
  const H = 64
  const p = new Painter(W, H)
  const roofTop = 6
  const roofBottom = 30
  for (let y = roofTop; y < roofBottom; y++) {
    const inset = Math.round((roofBottom - y) * 0.3)
    const row = Math.floor((y - roofTop) / 4)
    for (let x = 2 + inset; x <= W - 3 - inset; x++) {
      const seam = (x + (row % 2) * 3) % 6 === 0
      const edge = (y - roofTop) % 4 === 3
      p.set(x, y, edge || seam ? '#2f4f5e' : (x * 3 + y) % 11 === 0 ? '#5d8fa2' : '#417387')
    }
  }
  p.rect(2, roofBottom, W - 4, 2, '#24404e')
  planking(p, 4, roofBottom + 2, W - 8, H - roofBottom - 3)
  p.rect(4, H - 3, W - 8, 2, '#5a3a22')
  // Corner posts and a plaque over the door.
  p.rect(4, roofBottom + 2, 2, H - roofBottom - 5, WOOD.light)
  p.rect(W - 6, roofBottom + 2, 2, H - roofBottom - 5, WOOD.dark)
  p.rect(16, roofBottom + 4, 16, 4, '#e8e2d2')
  p.hline(16, roofBottom + 4, 16, '#f6f2e6')
  // Door and window.
  p.rect(18, H - 20, 12, 19, '#5c3620')
  p.rect(19, H - 18, 10, 17, '#7a4a2c')
  p.set(27, H - 10, '#e8c040')
  p.rect(7, H - 22, 10, 9, '#3c5a6e')
  p.rect(7, H - 22, 10, 3, '#5b7f95')
  p.frame(6, H - 23, 12, 11, '#e8e2d2')
  // A lamp on the corner, because the quay works after dark.
  p.rect(W - 9, H - 26, 2, 8, '#2c3c64')
  p.rect(W - 12, H - 32, 8, 7, '#f6f6f0')
  p.rect(W - 11, H - 31, 6, 5, '#ffeaa0')
  p.outline(OUTLINE)
  return p.toSprite({ ax: W / 2, ay: H - 1 })
}

const STALL_THEMES: { awning: [string, string]; goods: string[] }[] = [
  { awning: ['#d8484a', '#f6ece0'], goods: ['#e0403c', '#f6c73a', '#e87a3a'] },
  { awning: ['#3f8ac0', '#f6ece0'], goods: ['#9fc4d8', '#7fa8bd', '#cfe0e8'] },
  { awning: ['#4f9a54', '#f6ece0'], goods: ['#6cc255', '#e0403c', '#f07aa8'] },
]

/** A market stall: striped awning, counter, crates of whatever it sells. */
export function buildStall(variant: number): Sprite {
  const theme = STALL_THEMES[variant % STALL_THEMES.length]
  const W = 48
  const H = 52
  const p = new Painter(W, H)
  const [a, b] = theme.awning

  // Posts.
  for (const x of [3, W - 5]) {
    p.rect(x, 12, 2, H - 14, WOOD.mid)
    p.vline(x, 12, H - 14, WOOD.light)
  }
  // Awning: a scalloped stripe roof, deeper at the front.
  for (let y = 4; y < 18; y++) {
    const half = 18 + (y - 4) * 0.5
    for (let x = Math.round(W / 2 - half); x <= Math.round(W / 2 + half); x++) {
      if (x < 1 || x > W - 2) continue
      const stripe = Math.floor((x + 100) / 6) % 2 === 0
      p.set(x, y, y > 15 ? '#8f2f30' : stripe ? a : b)
    }
  }
  for (let x = 1; x < W - 1; x += 6) {
    p.set(x + 2, 18, Math.floor((x + 100) / 6) % 2 === 0 ? a : b)
    p.set(x + 3, 18, Math.floor((x + 100) / 6) % 2 === 0 ? a : b)
  }
  // Counter.
  planking(p, 5, H - 18, W - 10, 14)
  p.hline(5, H - 18, W - 10, WOOD.top)
  p.rect(5, H - 5, W - 10, 4, '#5a3a22')
  // Goods laid out on it: a shallow mound each, lit from the top left.
  theme.goods.forEach((color, i) => {
    const gx = 10 + i * 11
    for (let y = -3; y <= 2; y++) {
      for (let x = -4; x <= 4; x++) {
        if ((x / 4) ** 2 + (y / 3) ** 2 > 1) continue
        const top = y < -1 && x < 1
        p.set(gx + x, H - 21 + y, top ? tint(color, 0.35) : y > 1 ? tint(color, -0.3) : color)
      }
    }
  })
  p.outline(OUTLINE)
  return p.toSprite({ ax: W / 2, ay: H - 1 })
}

/** The boat shed: a long open-fronted hut with a hull resting inside. */
export function buildBoatShed(): Sprite {
  const W = 64
  const H = 56
  const p = new Painter(W, H)
  for (let y = 4; y < 28; y++) {
    const inset = Math.round((28 - y) * 0.12)
    const row = Math.floor((y - 4) / 5)
    for (let x = 2 + inset; x <= W - 3 - inset; x++) {
      const seam = (x + (row % 2) * 4) % 8 === 0
      const edge = (y - 4) % 5 === 4
      p.set(x, y, edge || seam ? '#4e3329' : (x + y) % 11 === 0 ? '#86604c' : '#6d4a3b')
    }
  }
  p.rect(2, 28, W - 4, 2, '#3b261e')
  // Side walls, and the dark opening between them.
  planking(p, 3, 30, 12, H - 32)
  planking(p, W - 15, 30, 12, H - 32)
  p.rect(15, 30, W - 30, H - 32, '#332620')
  // The hull inside, keel up, catching what light reaches the shed.
  for (let y = H - 24; y < H - 5; y++) {
    const f = (y - (H - 24)) / 19
    const half = 3 + f * 13
    for (let x = Math.round(W / 2 - half); x <= Math.round(W / 2 + half); x++) {
      if (x < 16 || x > W - 17) continue
      const rib = (y - (H - 24)) % 5 === 0
      p.set(x, y, rib ? '#7a5030' : x < W / 2 - 2 ? '#d0a066' : x < W / 2 + 4 ? '#b98a52' : '#8d5f33')
    }
  }
  p.rect(3, H - 4, W - 6, 3, '#5a3a22')
  p.outline(OUTLINE)
  return p.toSprite({ ax: W / 2, ay: H - 1 })
}

/** A mooring buoy: red on the channel side, green on the other. */
export function buildBuoy(variant: number): Sprite {
  const body = variant % 2 === 0
    ? { base: '#d0463c', light: '#ec6a5e', dark: '#9d2f28' }
    : { base: '#3f9a6a', light: '#5cbd88', dark: '#2a704c' }
  const W = 16
  const H = 26
  const p = new Painter(W, H)
  const cx = 8

  // A can buoy: a short cylinder sitting in the water, band around the middle.
  p.shape((x, y) => {
    if (y < 12 || y > 23) return null
    const half = 5.5 - Math.max(0, y - 21) * 1.5
    if (Math.abs(x + 0.5 - cx) > half) return null
    if (y >= 16 && y <= 18) return '#f4f1e8'
    return x < cx - 2 ? body.light : x > cx + 1 ? body.dark : body.base
  })
  // Flat top, seen slightly from above.
  p.shape((x, y) => {
    const d = ((x + 0.5 - cx) / 5.5) ** 2 + ((y + 0.5 - 12) / 2.2) ** 2
    return d <= 1 ? (y < 12 ? body.light : body.base) : null
  }, 0, 8, W, 15)
  // Lattice mast and the light on top.
  p.rect(cx - 1, 4, 2, 8, '#8f959e')
  for (let y = 5; y < 12; y += 2) p.hline(cx - 3, y, 6, '#6b7280')
  p.rect(cx - 3, 1, 6, 4, '#2c2c34')
  p.rect(cx - 2, 2, 4, 2, '#f6e27a')
  p.outline(SEA_OUTLINE)
  return p.toSprite({ ax: cx, ay: H - 1 })
}

/** Fishing net hung out to dry on a frame. */
export function buildNet(variant: number): Sprite {
  const W = 22
  const H = 26
  const p = new Painter(W, H)
  const mesh = variant % 2 === 0 ? '#cfc08a' : '#9fb6a0'
  p.rect(2, 4, 2, H - 5, WOOD.mid)
  p.rect(W - 4, 4, 2, H - 5, WOOD.mid)
  p.rect(2, 3, W - 4, 2, WOOD.light)
  for (let y = 6; y < H - 4; y++) {
    for (let x = 4; x < W - 4; x++) {
      const knot = (x + y) % 3 === 0 || (x - y + 30) % 3 === 0
      if (knot) p.set(x, y, (x + y) % 6 === 0 ? '#8f8258' : mesh)
    }
  }
  // Floats along the bottom edge.
  for (let x = 5; x < W - 5; x += 4) {
    p.set(x, H - 4, '#d0463c')
    p.set(x + 1, H - 4, '#ec6a5e')
  }
  p.outline(WOOD.outline)
  return p.toSprite({ ax: W / 2, ay: H - 1 })
}

/** An anchor propped against the quay wall. */
export function buildAnchor(): Sprite {
  const W = 20
  const H = 26
  const p = new Painter(W, H)
  const iron = { base: '#767d88', light: '#a2a9b4', dark: '#4c525c' }
  const cx = 9.5

  // Ring at the top, then the shank down the middle.
  p.shape((x, y) => {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - 3.5)
    return d < 3.4 && d > 1.6 ? (y < 3 ? iron.light : iron.base) : null
  }, 0, 0, W, 8)
  p.rect(cx - 1.5, 6, 3, 14, iron.base)
  p.vline(cx - 1.5, 6, 14, iron.light)
  p.vline(cx + 1.5, 6, 14, iron.dark)

  // Stock: the crossbar just under the ring.
  p.rect(2, 8, W - 4, 3, iron.base)
  p.hline(2, 8, W - 4, iron.light)
  p.hline(2, 10, W - 4, iron.dark)

  // Crown: a parabola sweeping down from the shank out to both flukes.
  for (let x = 2; x < W - 2; x++) {
    const t = (x + 0.5 - cx) / 7.5
    const y = Math.round(20 - t * t * 5)
    for (let k = 0; k < 3; k++) p.set(x, y + k, k === 0 ? iron.light : k === 1 ? iron.base : iron.dark)
  }
  // Flukes: a solid triangle at each end, pointing up and outward.
  for (let k = 0; k < 5; k++) {
    p.rect(1, 15 + k, 5 - k, 2, k < 2 ? iron.light : iron.base)
    p.rect(W - 6 + k, 15 + k, 5 - k, 2, k < 2 ? iron.base : iron.dark)
  }
  p.outline('#2c3038')
  return p.toSprite({ ax: W / 2, ay: H - 1 })
}

/** A barrel on the quay; the second variant lies on its side. */
export function buildBarrel(variant: number): Sprite {
  const p = new Painter(18, 22)
  if (variant % 2 === 0) {
    p.shape((x, y) => {
      if (y < 3 || y > 20) return null
      const bulge = Math.sin(((y - 3) / 18) * Math.PI) * 1.6
      const half = 5 + bulge
      if (Math.abs(x + 0.5 - 9) > half) return null
      if (y === 3 || y === 4) return '#c9955a'
      const hoop = y === 7 || y === 8 || y === 16 || y === 17
      if (hoop) return '#6b7280'
      const stave = Math.round(x - (9 - half)) % 4 === 0
      return stave ? '#6e4524' : x < 8 ? '#b98a52' : '#8d5f33'
    })
  } else {
    p.shape((x, y) => {
      if (x < 1 || x > 16) return null
      const bulge = Math.sin(((x - 1) / 15) * Math.PI) * 1.4
      const half = 4.5 + bulge
      if (Math.abs(y + 0.5 - 14) > half) return null
      const hoop = x === 4 || x === 5 || x === 12 || x === 13
      if (hoop) return '#6b7280'
      const stave = Math.round(y - (14 - half)) % 4 === 0
      return stave ? '#6e4524' : y < 13 ? '#b98a52' : '#8d5f33'
    })
    p.shape((x, y) => (Math.hypot((x + 0.5 - 2) / 2.2, (y + 0.5 - 14) / 5.2) < 1 ? '#c9955a' : null))
  }
  p.outline(WOOD.outline)
  return p.toSprite({ ax: 9, ay: 21 })
}

/** A rowboat, seen from above like everything else on the water. */
export function buildRowboat(variant: number): Sprite {
  const W = 34
  const H = 22
  const p = new Painter(W, H)
  const hull = variant % 2 === 0
    ? { rim: '#b0452f', shade: '#8d3324' }
    : { rim: '#3f6f9a', shade: '#2c5070' }
  const cy = H / 2

  // A leaf: pointed at both ends, widest just aft of centre.
  const halfAt = (x: number): number => {
    const t = (x + 0.5) / W
    if (t <= 0 || t >= 1) return 0
    return 8.5 * Math.sqrt(Math.sin(Math.PI * t)) * (0.82 + 0.18 * t)
  }
  p.shape((x, y) => {
    const half = halfAt(x)
    const d = Math.abs(y + 0.5 - cy)
    if (half < 1.2 || d > half) return null
    if (d > half - 2) return y < cy ? hull.rim : hull.shade
    // Inside: planking along the keel, lighter where the light falls.
    const plank = Math.round(y - (cy - half)) % 3 === 0
    return plank ? '#8d5f33' : y < cy ? '#d0a066' : '#b98a52'
  })
  // Two thwarts and a pair of oars shipped along the gunwale.
  for (const bx of [12, 22]) {
    const half = halfAt(bx) - 2
    p.rect(bx, cy - half, 2, half * 2, '#a87a48')
    p.vline(bx, cy - half, half * 2, '#c9955a')
  }
  p.rect(7, cy - 5, 18, 1, '#c9955a')
  p.rect(9, cy + 4, 18, 1, '#b98a52')
  p.outline('#3b2412')
  return p.toSprite({ ax: W / 2, ay: H - 1 })
}

/** Sky's house: the ranch farmhouse, reskinned for the coast. */
export function buildSeaHouse(): Sprite {
  const W = 80
  const H = 80
  const p = new Painter(W, H)
  const roof = { base: '#3f6f9a', light: '#5a8fb9', dark: '#2c5070', ridge: '#1f3d57' }
  const wall = { base: '#f0ece0', light: '#fbf8f0', dark: '#cdc5b4', sill: '#8d7a56' }

  p.rect(58, 2, 9, 16, '#8f959e')
  for (let y = 4; y < 18; y += 3) p.hline(58, y, 9, '#6b7280')
  p.rect(57, 1, 11, 3, '#adb3bd')

  const roofTop = 8
  const roofBottom = 44
  for (let y = roofTop; y < roofBottom; y++) {
    const inset = Math.round((roofBottom - y) * 0.42)
    const row = Math.floor((y - roofTop) / 4)
    for (let x = 2 + inset; x <= W - 3 - inset; x++) {
      const seam = (x + (row % 2) * 3) % 6 === 0
      const edge = (y - roofTop) % 4 === 3
      p.set(x, y, edge || seam ? roof.dark : (x * 3 + y) % 13 === 0 ? roof.light : roof.base)
    }
  }
  const ridgeInset = Math.round((roofBottom - roofTop) * 0.42)
  p.rect(2 + ridgeInset, roofTop - 1, W - 4 - 2 * ridgeInset, 2, roof.ridge)
  p.rect(2, roofBottom, W - 4, 2, roof.ridge)

  // Façade: horizontal clapboard, as a seaside cottage has.
  p.rect(4, roofBottom + 2, W - 8, H - roofBottom - 3, wall.base)
  for (let y = roofBottom + 3; y < H - 1; y += 4) p.hline(4, y, W - 8, wall.dark)
  for (let y = roofBottom + 4; y < H - 1; y += 4) p.hline(4, y, W - 8, wall.light)
  p.vline(5, roofBottom + 2, H - roofBottom - 3, wall.light)
  p.vline(W - 6, roofBottom + 2, H - roofBottom - 3, wall.dark)
  p.rect(4, H - 3, W - 8, 2, '#a89c82')

  const dx = W / 2 - 7
  p.rect(dx - 1, H - 25, 16, 24, wall.sill)
  p.rect(dx, H - 23, 14, 22, '#2f6f86')
  p.vline(dx + 7, H - 23, 22, '#215263')
  p.rect(dx + 2, H - 20, 4, 7, '#4c93ab')
  p.rect(dx + 9, H - 20, 4, 7, '#4c93ab')
  p.set(dx + 11, H - 11, '#e8c040')
  p.rect(dx + 4, H - 29, 7, 3, '#f2d98a')

  for (const wx of [11, W - 27]) {
    p.rect(wx - 1, H - 27, 18, 15, wall.sill)
    p.rect(wx + 2, H - 25, 12, 11, '#3c5a6e')
    p.rect(wx + 2, H - 25, 12, 4, '#5b7f95')
    p.vline(wx + 7, H - 25, 11, wall.light)
    p.hline(wx + 2, H - 20, 12, wall.light)
    p.rect(wx - 1, H - 27, 3, 15, '#2f6f86')
    p.rect(wx + 14, H - 27, 3, 15, '#2f6f86')
    p.rect(wx + 1, H - 13, 14, 4, '#96643a')
    p.hline(wx + 1, H - 13, 14, '#be8650')
    for (let x = wx + 2; x < wx + 15; x += 3) {
      p.set(x, H - 14, '#f07aa8')
      p.set(x + 1, H - 14, '#f6f2e6')
    }
  }

  p.outline('#2a2230')
  return p.toSprite({ ax: W / 2, ay: H - 1, castShadow: false })
}
