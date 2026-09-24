// Bay layout — La Bahía
//
// The designed composition, as data. Coordinates are tiles (16 px); shapes use
// continuous tile space, so a point at x + 0.5 is the centre of column x.
//
//                       N
//     ┌──────────────────────────┬──────┐
//     │ Pinar          Faro      │      │   the sea takes the east,
//     │              (acantilado)└──┐   │   and bites inland at the bay
//     │        Mercado    Muelles ──┼── │
//     │            Paseo            │   │
//     │      Dunas        Playa  ┌──┘   │
//     │                          │Arrec.│
//     └──────────────────────────┴──────┘
//                       S
//
// Everything else (terrain, decor, solidity, zones, slots) is derived from
// this file by bayMap.ts, so moving a feature here moves it everywhere.

import type { ZoneId } from '../domain/zones'

export const MAP_W = 120
export const MAP_H = 90

export interface Pt {
  x: number
  y: number
}
export interface TileRect {
  x0: number
  y0: number
  x1: number
  y1: number
}

/**
 * The coastline, north to south. The sea lies east of it; the bay is the bite
 * it takes out of the land around y = 40–58.
 */
export const COAST: Pt[] = [
  { x: 92, y: -4 }, { x: 86, y: 8 }, { x: 78, y: 18 }, { x: 72, y: 28 },
  { x: 63, y: 36 }, { x: 54, y: 43 }, { x: 50, y: 50 }, { x: 56, y: 57 },
  { x: 65, y: 64 }, { x: 74, y: 71 }, { x: 84, y: 79 }, { x: 96, y: 94 },
]

/** Beyond this the sea goes dark: far offshore, and nothing lives there. */
export const OPEN_SEA_REACH = 38
/** Width of the sand strip that follows the coastline, in tiles. */
export const BEACH_WIDTH = 4.5

/** The headland the lighthouse stands on: rock instead of grass. */
export const HEADLAND = { x: 74, y: 16, r: 11 }
/** Shallow water full of rocks and tide pools, south-east. */
export const REEF = { cx: 86, cy: 68, rx: 15, ry: 11 }
/** A freshwater pond inland, so the pine grove is not all trees. */
export const POND = { cx: 22, cy: 30, rx: 5, ry: 3.6 }

export interface PathDef {
  points: Pt[]
  /** Half width in tiles. */
  half: number
}

export const PATHS: PathDef[] = [
  // El Paseo: the promenade, always one step inland of the beach.
  {
    points: [
      { x: 70, y: 24 }, { x: 62, y: 32 }, { x: 53, y: 39 }, { x: 45, y: 46 },
      { x: 44, y: 54 }, { x: 51, y: 62 }, { x: 60, y: 69 }, { x: 69, y: 76 }, { x: 77, y: 84 },
    ],
    half: 1.6,
  },
  // Up to the lighthouse.
  { points: [{ x: 66, y: 28 }, { x: 70, y: 22 }, { x: 73, y: 16 }], half: 1.1 },
  // Out onto the two piers.
  { points: [{ x: 48, y: 45 }, { x: 56, y: 45 }], half: 1 },
  { points: [{ x: 47, y: 53 }, { x: 54, y: 54 }], half: 1 },
  // Market square and the road inland to the pine grove.
  { points: [{ x: 45, y: 48 }, { x: 36, y: 47 }, { x: 26, y: 44 }, { x: 16, y: 38 }], half: 1.2 },
  { points: [{ x: 30, y: 45 }, { x: 28, y: 34 }, { x: 24, y: 24 }], half: 1 },
  // Down to the dunes.
  { points: [{ x: 44, y: 56 }, { x: 36, y: 63 }, { x: 28, y: 70 }, { x: 20, y: 76 }], half: 1.1 },
]

/** The open square in front of the market. */
export const PLAZA = { x: 42, y: 49, r: 3.8 }
/** A clearing in the pine grove. */
export const GLADE = { x: 18, y: 20, r: 4 }

/** Wooden piers: walkable planks laid over the water. */
export const PIERS: TileRect[] = [
  { x0: 50, y0: 44, x1: 62, y1: 45 },
  { x0: 49, y0: 53, x1: 58, y1: 54 },
  { x0: 60, y0: 44, x1: 61, y1: 49 },
]

/** Stone breakwater guarding the bay mouth. */
export const BREAKWATER: TileRect[] = [
  { x0: 64, y0: 40, x1: 78, y1: 41 },
  { x0: 76, y0: 41, x1: 77, y1: 47 },
]

export type PropKind =
  | 'lighthouse' | 'house' | 'dockHouse' | 'stall' | 'boatShed' | 'arch'
  | 'lamp' | 'bench' | 'crate' | 'barrel' | 'buoy' | 'net' | 'anchor'
  | 'palm' | 'reeds' | 'rowboat' | 'flowerpot' | 'signpost' | 'basket'

export interface PropDef {
  kind: PropKind
  /** Footprint in tiles; the sprite stands on its bottom edge, centred. */
  at: TileRect
  variant?: number
  /** Decorative only: does not block movement. */
  walkable?: boolean
  /** Tiles that block, when not the whole footprint. */
  solid?: Pt[]
}

const one = (kind: PropKind, x: number, y: number, variant?: number): PropDef => ({ kind, at: { x0: x, y0: y, x1: x, y1: y }, variant })
const bench = (x: number, y: number): PropDef => ({ kind: 'bench', at: { x0: x, y0: y - 1, x1: x, y1: y } })

export const PROPS: PropDef[] = [
  // El Faro, sobre el acantilado
  { kind: 'lighthouse', at: { x0: 71, y0: 9, x1: 73, y1: 14 } },
  one('lamp', 69, 17),
  one('signpost', 69, 27),
  // La casa de Sky, mirando al mar
  { kind: 'house', at: { x0: 36, y0: 40, x1: 40, y1: 43 } },
  one('flowerpot', 35, 43, 0),
  one('flowerpot', 41, 44, 1),
  // Los Muelles: la caseta del puerto y el aparejo de trabajo
  { kind: 'dockHouse', at: { x0: 43, y0: 39, x1: 45, y1: 41 } },
  one('buoy', 63, 45),
  one('buoy', 59, 50, 1),
  one('buoy', 55, 56),
  one('net', 49, 46),
  one('net', 51, 56, 1),
  one('barrel', 52, 43),
  one('barrel', 53, 43, 1),
  one('barrel', 50, 55),
  one('anchor', 48, 55),
  { kind: 'rowboat', at: { x0: 57, y0: 47, x1: 58, y1: 48 } },
  { kind: 'rowboat', at: { x0: 53, y0: 55, x1: 54, y1: 56 }, variant: 1 },
  // El Mercado
  { kind: 'stall', at: { x0: 36, y0: 51, x1: 38, y1: 52 }, variant: 0 },
  { kind: 'stall', at: { x0: 38, y0: 54, x1: 40, y1: 55 }, variant: 1 },
  { kind: 'stall', at: { x0: 46, y0: 49, x1: 48, y1: 50 }, variant: 2 },
  one('crate', 41, 53),
  one('crate', 41, 55, 1),
  one('crate', 35, 50),
  one('basket', 47, 54),
  { kind: 'boatShed', at: { x0: 30, y0: 52, x1: 33, y1: 54 } },
  // El Paseo marítimo
  bench(56, 33),
  bench(46, 41),
  bench(45, 60),
  bench(55, 69),
  one('lamp', 58, 31),
  one('lamp', 47, 40),
  one('lamp', 44, 57),
  one('lamp', 58, 71),
  one('palm', 64, 32),
  one('palm', 49, 39),
  one('palm', 47, 63),
  one('palm', 61, 73),
  one('signpost', 42, 44),
  // Entrada del pueblo, por el oeste
  { kind: 'arch', at: { x0: 10, y0: 37, x1: 16, y1: 37 }, solid: [{ x: 10, y: 37 }, { x: 16, y: 37 }] },
  // Las Dunas
  one('reeds', 32, 68),
  one('reeds', 26, 73),
  one('reeds', 38, 71),
  one('basket', 29, 65),
  bench(24, 75),
  // El Pinar
  one('reeds', 19, 33),
  one('reeds', 28, 29),
  one('lamp', 26, 36),
]

export type DecalKind = 'planks' | 'wetSand' | 'blanket' | 'tidePool' | 'doormat' | 'stones' | 'shells'

export interface DecalDef {
  kind: DecalKind
  at: TileRect
  variant?: number
}

export const DECALS: DecalDef[] = [
  // The piers are planks laid over water.
  { kind: 'planks', at: { x0: 50, y0: 44, x1: 62, y1: 45 } },
  { kind: 'planks', at: { x0: 49, y0: 53, x1: 58, y1: 54 } },
  { kind: 'planks', at: { x0: 60, y0: 44, x1: 61, y1: 49 } },
  { kind: 'doormat', at: { x0: 38, y0: 44, x1: 38, y1: 44 } },
  // Where the tide reaches, the sand stays dark.
  { kind: 'wetSand', at: { x0: 58, y0: 60, x1: 70, y1: 66 } },
  { kind: 'wetSand', at: { x0: 66, y0: 24, x1: 74, y1: 30 } },
  { kind: 'shells', at: { x0: 61, y0: 67, x1: 63, y1: 68 } },
  { kind: 'shells', at: { x0: 53, y0: 60, x1: 54, y1: 61 } },
  { kind: 'blanket', at: { x0: 56, y0: 63, x1: 57, y1: 64 } },
  { kind: 'stones', at: { x0: 34, y0: 47, x1: 34, y1: 47 } },
  { kind: 'stones', at: { x0: 49, y0: 60, x1: 49, y1: 60 } },
  // The reef: shallow pools left behind between the sandbars.
  { kind: 'tidePool', at: { x0: 80, y0: 66, x1: 82, y1: 67 } },
  { kind: 'tidePool', at: { x0: 86, y0: 69, x1: 88, y1: 70 } },
  { kind: 'tidePool', at: { x0: 91, y0: 66, x1: 92, y1: 67 } },
]

/** Round pines placed by hand inland (decor 'pine'). */
export const ACCENT_PINES: Pt[] = [
  { x: 12, y: 14 }, { x: 30, y: 18 }, { x: 8, y: 26 }, { x: 34, y: 28 }, { x: 16, y: 44 },
  { x: 26, y: 50 }, { x: 10, y: 52 }, { x: 36, y: 34 }, { x: 22, y: 58 }, { x: 14, y: 62 },
]
/** Round bushes placed by hand (decor 'bush'). */
export const ACCENT_BUSHES: Pt[] = [
  { x: 42, y: 40 }, { x: 34, y: 58 }, { x: 40, y: 62 }, { x: 28, y: 62 }, { x: 18, y: 68 },
  { x: 44, y: 34 }, { x: 52, y: 36 }, { x: 24, y: 40 }, { x: 12, y: 32 }, { x: 38, y: 24 },
]

/** Where each zone gathers first: slots fill outward from here. */
export const ZONE_FOCUS: Record<ZoneId, Pt> = {
  faro: { x: 71, y: 14 },
  muelle: { x: 56, y: 45 },
  playa: { x: 61, y: 62 },
  paseo: { x: 52, y: 60 },
  mercado: { x: 33, y: 51 },
  dunas: { x: 32, y: 75 },
  pinar: { x: 29, y: 22 },
  arrecife: { x: 85, y: 69 },
}

/**
 * Zones for the land the coast does not already claim, first match wins.
 * The headland, the beach, the promenade strip, the piers and the reef are
 * decided by distance in bayMap.ts, because they follow the water and no
 * rectangle describes them honestly.
 */
export const ZONE_REGIONS: [ZoneId, TileRect][] = [
  ['mercado', { x0: 26, y0: 41, x1: 50, y1: 59 }],
  ['dunas', { x0: 0, y0: 58, x1: 119, y1: 89 }],
  ['pinar', { x0: 0, y0: 0, x1: 44, y1: 57 }],
]
/** Tiles inland of the beach that still count as promenade. */
export const PASEO_REACH = 13

/** Map labels shown in the overview. */
export const ZONE_LABELS: Record<ZoneId, Pt> = {
  faro: { x: 71, y: 7 },
  muelle: { x: 56, y: 44 },
  playa: { x: 69, y: 70 },
  paseo: { x: 49, y: 57 },
  mercado: { x: 33, y: 45 },
  dunas: { x: 31, y: 69 },
  pinar: { x: 29, y: 16 },
  arrecife: { x: 82, y: 65 },
}
