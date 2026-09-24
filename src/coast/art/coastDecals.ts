// Flat ground details — La Bahía
//
// Things that lie on the ground and never cover anyone: the plank decking of
// the piers, the wet sand the tide leaves behind, shells along the tide line,
// tide pools on the reef, and the foam that rides the first tile of water at
// the shore. They are painted once into the baked ground chunks, so they cost
// nothing per frame; patterns hash world coordinates, so a decal split across
// two chunks joins seamlessly.
//
// The blanket, the doormat and the stepping stones are the ranch's, unchanged
// and reused — the same objects appear on both maps, and drawing them twice
// would only make them drift apart.

import { hash2 } from '../../engine/noise'
import { paintDecal as paintRanchDecal } from '../../ranch/art/decalArt'
import type { PixelSink } from '../../shared/site'
import type { DecalDef } from '../world/bayLayout'

const TILE = 16

/** Kinds the ranch already draws, under the same names. */
const SHARED = new Set(['blanket', 'doormat', 'stones'])

/** Planks of a pier, running along its long side, with a shadow on the water. */
function planks(px: PixelSink, x0: number, y0: number, w: number, h: number): void {
  const along = w >= h
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const across = along ? y - y0 : x - x0
      const depth = along ? h : w
      const seam = (along ? y - y0 : x - x0) % 5 === 4
      const edge = across === 0 || across === depth - 1
      const grain = hash2(x, y, 31) < 0.12
      px(x, y, edge ? '#6e4524' : seam ? '#8d5f33' : grain ? '#b98a52' : '#c9955a')
    }
  }
  // Posts at the corners, and one every four tiles along the run.
  const step = along ? TILE * 4 : TILE * 3
  for (let t = 0; t < (along ? w : h); t += step) {
    for (const side of [0, (along ? h : w) - 4]) {
      const px0 = along ? x0 + t : x0 + side
      const py0 = along ? y0 + side : y0 + t
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) px(px0 + x, py0 + y, x === 0 || y === 0 ? '#9a6a3a' : '#4a2c14')
    }
  }
}

/** Sand the tide has just left: darker, with the ripples the water drew. */
function wetSand(px: PixelSink, x0: number, y0: number, w: number, h: number): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      // Fades out inland, so the patch has no hard edge anywhere.
      const fade = (y - y0) / h
      const ripple = Math.sin((x * 0.4 + y * 1.1) * 0.6) > 0.55
      const n = hash2(x, y, 43)
      if (n < fade * 0.8) continue
      px(x, y, ripple ? '#c8a878' : n < 0.25 ? '#d6b98c' : '#cfb083')
    }
  }
}

/** Shells and pebbles scattered along the tide line. */
function shells(px: PixelSink, x0: number, y0: number, w: number, h: number): void {
  for (let y = y0; y < y0 + h; y += 3) {
    for (let x = x0; x < x0 + w; x += 3) {
      const n = hash2(x, y, 57)
      if (n > 0.3) continue
      const color = n < 0.1 ? '#f4ece0' : n < 0.2 ? '#f0c9b0' : '#d9d2c4'
      px(x, y, color)
      px(x + 1, y, color)
      px(x, y + 1, n < 0.15 ? '#c9a894' : '#b8b0a2')
      if (n < 0.06) px(x + 1, y + 1, '#f6e0c8')
    }
  }
}

/** A tide pool: a still, clear puddle left on the rock. */
function tidePool(px: PixelSink, x0: number, y0: number, w: number, h: number): void {
  const cx = x0 + w / 2
  const cy = y0 + h / 2
  const rx = w / 2 - 1
  const ry = h / 2 - 1
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 + (hash2(x, y, 61) - 0.5) * 0.25
      if (d > 1) continue
      if (d > 0.82) px(x, y, '#8a8f8a')
      else if (d > 0.5) px(x, y, '#4f93a8')
      else px(x, y, y < cy ? '#7fc4d4' : '#5aa8bd')
    }
  }
}

/** Surf: a ragged line of white where the water meets the sand. */
export function paintFoam(px: PixelSink, tx: number, ty: number, seed: number): void {
  const x0 = tx * TILE
  const y0 = ty * TILE
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const n = hash2(x0 + x, y0 + y, 71)
      const band = Math.sin((x0 + x) * 0.35 + (y0 + y) * 0.2 + seed % 7) * 0.5 + 0.5
      if (n > 0.25 + band * 0.35) continue
      px(x0 + x, y0 + y, n < 0.1 ? '#ffffff' : '#d8eef4')
    }
  }
}

export function paintCoastDecal(px: PixelSink, decal: DecalDef): void {
  if (SHARED.has(decal.kind)) {
    // Same object, same drawing: the ranch owns it.
    paintRanchDecal(px, decal as Parameters<typeof paintRanchDecal>[1])
    return
  }
  const x0 = decal.at.x0 * TILE
  const y0 = decal.at.y0 * TILE
  const w = (decal.at.x1 - decal.at.x0 + 1) * TILE
  const h = (decal.at.y1 - decal.at.y0 + 1) * TILE
  switch (decal.kind) {
    case 'planks': return planks(px, x0, y0, w, h)
    case 'wetSand': return wetSand(px, x0, y0, w, h)
    case 'shells': return shells(px, x0, y0, w, h)
    case 'tidePool': return tidePool(px, x0, y0, w, h)
  }
}
