// Bay map — La Bahía
//
// Rasterises bayLayout.ts into the grids everything else reads: terrain per
// tile corner (for the chunk baker), water, paths, solidity, zones and decor.
// Built once at load; pure data, no canvas.
//
// The ranch is land with a lake in it; this is a coast, so the rule that
// decides everything is how far inland a point is. Sea, surf, beach and town
// all fall out of that one number.

import type { ChunkSource } from '../../engine/chunks'
import { fbm, hash2 } from '../../engine/noise'
import { T, type DecorKind, type Terrain } from '../../engine/world'
import type { PixelSink } from '../../shared/site'
import { paintCoastDecal, paintFoam } from '../art/coastDecals'
import { ZONE_IDS, type ZoneId } from '../domain/zones'
import {
  ACCENT_BUSHES, ACCENT_PINES, BEACH_WIDTH, BREAKWATER, COAST, DECALS, GLADE, HEADLAND, MAP_H, MAP_W,
  OPEN_SEA_REACH, PASEO_REACH, PATHS, PIERS, PLAZA, POND, PROPS, REEF, ZONE_REGIONS,
  type DecalDef, type PropDef, type Pt, type TileRect,
} from './bayLayout'

export const BAY_SEED = 4231

/**
 * Decor kinds the bay uses, stored as small ints in the decor grid. The palms
 * and sea rocks are what the ranch never has: they are half of why the two
 * maps read as different places drawn by the same hand.
 */
export const DECOR_KINDS = ['pine', 'tree', 'bush', 'rock', 'boulder', 'palm', 'searock'] as const satisfies readonly DecorKind[]
export type BayDecor = (typeof DECOR_KINDS)[number]

const within = (r: TileRect, x: number, y: number) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1
const inAny = (rects: readonly TileRect[], x: number, y: number) => rects.some(r => within(r, x, y))

function segmentDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2))
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t))
}

/** Where the shoreline sits on this row, by interpolating the coastline. */
function shoreAt(y: number): number {
  const pts = COAST
  if (y <= pts[0].y) return pts[0].x
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    if (y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y || 1)
  }
  return pts[pts.length - 1].x
}

/**
 * Tiles from the shoreline: positive inland, negative out to sea. Every
 * terrain decision below is a threshold on this one value.
 */
export function inland(x: number, y: number): number {
  const wobble = (fbm(x / 7, y / 7, BAY_SEED + 13, 3) - 0.5) * 5
  return shoreAt(y) - x + wobble
}

/** How far a point is inside a path, in tiles (positive = on the path). */
function pathCover(x: number, y: number): number {
  let best = -Infinity
  for (const path of PATHS) {
    for (let i = 1; i < path.points.length; i++) {
      best = Math.max(best, path.half - segmentDistance({ x, y }, path.points[i - 1], path.points[i]))
    }
  }
  return Math.max(best, PLAZA.r - Math.hypot(x - PLAZA.x, y - PLAZA.y))
}

/** Normalised ellipse distance with a wobbly edge (1 = rim). */
function ellipse(e: { cx: number; cy: number; rx: number; ry: number }, x: number, y: number, salt: number): number {
  const d = ((x - e.cx) / e.rx) ** 2 + ((y - e.cy) / e.ry) ** 2
  return d + (fbm(x / 5, y / 5, BAY_SEED + salt, 3) - 0.5) * 0.35
}

export const reefDistance = (x: number, y: number) => ellipse(REEF, x, y, 7)
const pondDistance = (x: number, y: number) => ellipse(POND, x, y, 5)

/** The rocky headland the lighthouse stands on. */
export const onHeadland = (x: number, y: number) =>
  Math.hypot(x - HEADLAND.x, y - HEADLAND.y) + (fbm(x / 6, y / 6, BAY_SEED + 29, 3) - 0.5) * 6 < HEADLAND.r

function vertexTerrainAt(vx: number, vy: number): Terrain {
  const sea = inland(vx, vy)
  // Planks are laid over the water later; the pier tiles themselves stay sea.
  if (sea < -OPEN_SEA_REACH) return T.DEEP
  if (sea < 0) {
    const reef = reefDistance(vx, vy)
    // The reef dries out in patches: those sandbars are what makes the zone
    // liveable, and they are why the tide pools read as a place, not as sea.
    if (reef < 0.72 && fbm(vx / 3.5, vy / 3.5, BAY_SEED + 53, 3) > 0.54) return T.SAND
    if (reef < 1) return T.WATER
    return sea < -9 ? T.DEEP : T.WATER
  }
  if (onHeadland(vx, vy)) return sea < BEACH_WIDTH + 2 ? T.SAND : T.GRASS
  if (sea < BEACH_WIDTH) return T.SAND
  const pond = pondDistance(vx, vy)
  if (pond < 1) return T.WATER
  if (pond < 1.5) return T.SAND
  const cover = pathCover(vx, vy)
  if (cover >= 0) return T.SAND
  if (Math.hypot(vx - GLADE.x, vy - GLADE.y) < GLADE.r) return T.GRASS
  // The dunes are sand breaking through the grass, not a lawn.
  if (vy > 58 && vx < 50 && fbm(vx / 5, vy / 5, BAY_SEED + 41, 3) > 0.52) return T.SAND
  if (cover < -2 && fbm(vx / 7, vy / 7, BAY_SEED + 11, 3) > 0.62) return T.TALL
  return T.GRASS
}

export interface PlacedProp extends PropDef {
  /** Feet of the sprite in world pixels: bottom centre of the footprint. */
  x: number
  y: number
}

const PATH_MARGIN_FOR_TREES = 1.2

export class BayMap implements ChunkSource {
  readonly seed = BAY_SEED
  readonly w = MAP_W
  readonly h = MAP_H
  private readonly vertices: Uint8Array
  readonly water: Uint8Array
  readonly path: Uint8Array
  readonly solid: Uint8Array
  /** Walkable tiles that must not become homes (planks, blanket, doormat…). */
  readonly reserved: Uint8Array
  /** Railings along the promenade edge, drawn like the ranch fences. */
  readonly fence: Uint8Array
  /** Index into ZONE_IDS, or -1 (open sea). */
  readonly zones: Int8Array
  /** Index into DECOR_KINDS, or -1. */
  readonly decor: Int8Array
  readonly props: PlacedProp[]
  readonly decals: readonly DecalDef[] = DECALS
  /** Foam tiles where the surf breaks, painted into the ground. */
  readonly foam: { tx: number; ty: number; seed: number }[] = []

  constructor() {
    const { w, h } = this
    const n = w * h
    this.vertices = new Uint8Array((w + 1) * (h + 1))
    for (let vy = 0; vy <= h; vy++) {
      for (let vx = 0; vx <= w; vx++) this.vertices[vy * (w + 1) + vx] = vertexTerrainAt(vx, vy)
    }
    this.water = new Uint8Array(n)
    this.path = new Uint8Array(n)
    this.solid = new Uint8Array(n)
    this.reserved = new Uint8Array(n)
    this.fence = new Uint8Array(n)
    this.zones = new Int8Array(n).fill(-1)
    this.decor = new Int8Array(n).fill(-1)
    this.props = PROPS.map(p => ({
      ...p,
      x: ((p.at.x0 + p.at.x1 + 1) / 2) * 16,
      y: (p.at.y1 + 1) * 16 - 1,
    }))
    this.rasterise()
  }

  private rasterise(): void {
    const { w, h } = this
    const blocked = new Uint8Array(w * h)
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const i = ty * w + tx
        const corners = [
          this.vertexTerrain(tx, ty), this.vertexTerrain(tx + 1, ty),
          this.vertexTerrain(tx + 1, ty + 1), this.vertexTerrain(tx, ty + 1),
        ]
        if (corners.filter(c => c === T.WATER || c === T.DEEP).length >= 2) this.water[i] = 1
        const cx = tx + 0.5
        const cy = ty + 0.5
        const cover = pathCover(cx, cy)
        if (cover >= -0.25) this.path[i] = 1
        if (cover >= -PATH_MARGIN_FOR_TREES) blocked[i] = 1
      }
    }
    // The piers: planks over water, walkable, never homes.
    for (const pier of PIERS) {
      for (let y = pier.y0; y <= pier.y1; y++) {
        for (let x = pier.x0; x <= pier.x1; x++) {
          if (!this.inside(x, y)) continue
          const i = y * w + x
          // Planks over the sea: walkable land, and deliberately not a path,
          // because the dock Pokémon live on them rather than pass through.
          this.water[i] = 0
          blocked[i] = 1
        }
      }
    }
    // The breakwater is stone: solid, and it calms the water behind it.
    for (const wall of BREAKWATER) {
      for (let y = wall.y0; y <= wall.y1; y++) {
        for (let x = wall.x0; x <= wall.x1; x++) {
          if (!this.inside(x, y)) continue
          const i = y * w + x
          this.water[i] = 0
          this.solid[i] = 1
          this.decor[i] = DECOR_KINDS.indexOf('boulder')
          blocked[i] = 1
        }
      }
    }
    // Zones need the finished water and path grids, so they come after.
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) this.zones[ty * w + tx] = this.zoneFor(tx + 0.5, ty + 0.5)
    }
    for (const prop of this.props) {
      const { x0, y0, x1, y1 } = prop.at
      for (let y = y0 - 1; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (!this.inside(x, y)) continue
          blocked[y * w + x] = 1
          const blocks = prop.solid ? prop.solid.some(t => t.x === x && t.y === y) : y >= y0
          if (blocks && !prop.walkable) this.solid[y * w + x] = 1
          if (y >= y0) this.reserved[y * w + x] = 1
        }
      }
    }
    for (const decal of this.decals) {
      const { x0, y0, x1, y1 } = decal.at
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (!this.inside(x, y)) continue
          const i = y * w + x
          blocked[i] = 1
          const scenery = decal.kind === 'wetSand' || decal.kind === 'shells' || decal.kind === 'planks'
          if (!scenery) this.reserved[i] = 1
        }
      }
    }
    this.scatterSurf()
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const i = ty * w + tx
        if (this.water[i] || blocked[i] || this.decor[i] >= 0) continue
        if (Math.hypot(tx + 0.5 - GLADE.x, ty + 0.5 - GLADE.y) < GLADE.r + 0.5) continue
        const kind = this.naturalDecor(tx, ty)
        if (kind) {
          this.decor[i] = DECOR_KINDS.indexOf(kind)
          this.solid[i] = 1
        }
      }
    }
    for (const p of ACCENT_PINES) this.place(p, 'pine')
    for (const p of ACCENT_BUSHES) this.place(p, 'bush')
  }

  private place(p: Pt, kind: BayDecor): void {
    if (!this.inside(p.x, p.y)) return
    const i = p.y * this.w + p.x
    if (this.water[i] || this.path[i] || this.reserved[i]) return
    this.decor[i] = DECOR_KINDS.indexOf(kind)
    this.solid[i] = 1
  }

  /** Rocks in the reef, and driftwood pebbles along the tide line. */
  private scatterSurf(): void {
    const { w, h } = this
    for (let ty = 0; ty < h; ty++) {
      for (let tx = 0; tx < w; tx++) {
        const i = ty * w + tx
        const sea = inland(tx + 0.5, ty + 0.5)
        const roll = hash2(tx, ty, BAY_SEED + 3)
        if (this.water[i] && reefDistance(tx + 0.5, ty + 0.5) < 1.1 && roll > 0.68) {
          this.decor[i] = DECOR_KINDS.indexOf(roll > 0.86 ? 'searock' : 'rock')
          this.solid[i] = 1
          continue
        }
        // Foam rides the first tile or two of water at the shoreline.
        if (this.water[i] && sea > -2.2 && hash2(tx, ty, BAY_SEED + 17) > 0.35) {
          this.foam.push({ tx, ty, seed: Math.floor(hash2(tx, ty, BAY_SEED + 23) * 1e6) })
        }
      }
    }
  }

  private naturalDecor(tx: number, ty: number): BayDecor | null {
    const sea = inland(tx + 0.5, ty + 0.5)
    const r = hash2(tx, ty, BAY_SEED + 5)
    // A palm every so often on the back of the beach, and nothing else there.
    if (sea < BEACH_WIDTH + 1) return sea > BEACH_WIDTH - 2 && r > 0.93 ? 'palm' : null
    if (onHeadland(tx + 0.5, ty + 0.5)) return r > 0.9 ? 'boulder' : r > 0.78 ? 'rock' : null
    const region = ZONE_REGIONS.find(([, rect]) => within(rect, tx, ty))?.[0] ?? null
    if (region === 'pinar') {
      const density = fbm(tx / 9, ty / 9, BAY_SEED + 33, 3)
      if (density > 0.44 && r > 0.55) return r > 0.88 ? 'bush' : 'pine'
      return r > 0.96 ? 'bush' : null
    }
    if (region === 'dunas') return r > 0.94 ? 'bush' : null
    return r > 0.965 ? 'bush' : null
  }

  private zoneFor(x: number, y: number): number {
    const sea = inland(x, y)
    const tx = Math.floor(x)
    const ty = Math.floor(y)
    // Out at sea nobody lives, except on the reef and on the piers.
    if (sea < 0) {
      if (inAny(PIERS, tx, ty)) return ZONE_IDS.indexOf('muelle')
      if (reefDistance(x, y) < 1.15) return ZONE_IDS.indexOf('arrecife')
      return -1
    }
    if (inAny(PIERS, tx, ty)) return ZONE_IDS.indexOf('muelle')
    if (onHeadland(x, y)) return ZONE_IDS.indexOf('faro')
    if (sea < BEACH_WIDTH + 1.5) return ZONE_IDS.indexOf('playa')
    // The promenade is a band that follows the water, so it is measured, not
    // boxed: it beats the inland rectangles wherever the two overlap.
    if (sea < PASEO_REACH) return ZONE_IDS.indexOf('paseo')
    const region = ZONE_REGIONS.find(([, r]) => within(r, tx, ty))?.[0] ?? null
    if (region) return ZONE_IDS.indexOf(region)
    return ZONE_IDS.indexOf(ty >= 58 ? 'dunas' : 'pinar')
  }

  /** Flat details of this chunk: the designed decals and the surf. */
  paintGround(px: PixelSink, tx0: number, ty0: number, tx1: number, ty1: number): void {
    for (const decal of this.decals) {
      if (decal.at.x1 < tx0 || decal.at.x0 >= tx1 || decal.at.y1 < ty0 || decal.at.y0 >= ty1) continue
      paintCoastDecal(px, decal)
    }
    for (const f of this.foam) {
      if (f.tx < tx0 || f.tx >= tx1 || f.ty < ty0 || f.ty >= ty1) continue
      paintFoam(px, f.tx, f.ty, f.seed)
    }
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h
  }

  isSolid(tx: number, ty: number): boolean {
    return !this.inside(tx, ty) || this.solid[ty * this.w + tx] === 1 || this.water[ty * this.w + tx] === 1
  }

  isPath(tx: number, ty: number): boolean {
    return this.inside(tx, ty) && this.path[ty * this.w + tx] === 1
  }

  vertexTerrain(vx: number, vy: number): Terrain {
    const x = Math.max(0, Math.min(this.w, vx))
    const y = Math.max(0, Math.min(this.h, vy))
    return this.vertices[y * (this.w + 1) + x] as Terrain
  }

  decorAt(tx: number, ty: number): DecorKind | null {
    if (!this.inside(tx, ty)) {
      // Beyond the edge the pine grove simply continues; the sea stays empty.
      if ((tx + ty) % 2 !== 0) return null
      if (inland(tx + 0.5, ty + 0.5) < BEACH_WIDTH + 2) return null
      return hash2(tx, ty, BAY_SEED + 41) < 0.8 ? 'pine' : 'tree'
    }
    const d = this.decor[ty * this.w + tx]
    return d < 0 ? null : DECOR_KINDS[d]
  }

  /** A Pokémon may stand here: on land, not solid, not on a path, not at sea. */
  isHabitable(tx: number, ty: number): boolean {
    if (!this.inside(tx, ty)) return false
    const i = ty * this.w + tx
    return !this.solid[i] && !this.path[i] && !this.water[i]
  }

  zoneAt(tx: number, ty: number): ZoneId | null {
    if (!this.inside(tx, ty)) return null
    const z = this.zones[ty * this.w + tx]
    return z < 0 ? null : ZONE_IDS[z]
  }

  get pixelWidth(): number {
    return this.w * 16
  }
  get pixelHeight(): number {
    return this.h * 16
  }
}
