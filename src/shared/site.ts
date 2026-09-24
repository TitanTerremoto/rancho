// What a place is — Rancho / La Bahía
//
// The ranch was the first place; Sky's bay is the second. Everything that is
// really about *a place* — its zones, its map, its art, its caretakers — lives
// behind this one contract, and everything that is about *any* place (the
// camera, the chunk baker, the depth sort, the search box, the card) is
// written against it and shared.
//
// Nothing here knows the names of either place: a site is data, handed to the
// scene at start-up by the entry point that built it.

import type { ChunkSource } from '../engine/chunks'
import type { Sprite } from '../engine/sprite'
import type { DecorKind } from '../engine/world'

export interface Pt {
  x: number
  y: number
}

export interface ZoneInfo {
  /** Name shown on the map and in the card. */
  name: string
  /** "Vive …" phrase for the card. */
  where: string
  /** Share of newcomers that prefer this zone (the table sums to 1). */
  share: number
}

/** Zones by id. Ids are plain strings here: each site names its own. */
export type ZoneTable = Record<string, ZoneInfo>

/** Paints one world pixel, in world coordinates. */
export type PixelSink = (x: number, y: number, color: string) => void

export interface Home {
  zone: string
  slot: number
}

/** A prop standing on the map, already resolved to world pixels. */
export interface PlacedProp {
  kind: string
  /** Feet of the sprite in world pixels. */
  x: number
  y: number
  variant?: number
}

/**
 * The grids the shared render and world code reads. Both maps satisfy it
 * structurally, so neither has to import the other.
 */
export interface SiteMap extends ChunkSource {
  readonly w: number
  readonly h: number
  readonly water: Uint8Array
  readonly path: Uint8Array
  readonly solid: Uint8Array
  /** Walkable tiles that must not become homes (planks, blankets, doormats…). */
  readonly reserved: Uint8Array
  readonly fence: Uint8Array
  /** Index into the site's zone ids, or -1 for nowhere. */
  readonly zones: Int8Array
  readonly props: readonly PlacedProp[]
  inside(tx: number, ty: number): boolean
  isSolid(tx: number, ty: number): boolean
  isPath(tx: number, ty: number): boolean
  /** Whether an inhabitant may stand here at all (its zone is checked by the caller). */
  isHabitable(tx: number, ty: number): boolean
  zoneAt(tx: number, ty: number): string | null
  decorAt(tx: number, ty: number): DecorKind | null
  /** Flat details painted into a freshly baked ground chunk, in the tile range given. */
  paintGround(sink: PixelSink, tx0: number, ty0: number, tx1: number, ty1: number): void
  readonly pixelWidth: number
  readonly pixelHeight: number
}

export interface SiteArt {
  /** Variants per prop kind; `variant` on the prop picks one. */
  props: Record<string, Sprite[]>
  /** Kinds whose variants are animation frames rather than alternatives. */
  animated: ReadonlySet<string>
  decor: Record<DecorKind, Sprite>
  /** Indexed by neighbour mask, 0–15. */
  fence: Sprite[]
}

/** One of the people who walk the map. Everyone else living here is a Pokémon. */
export interface CaretakerRoute {
  id: string
  name: string
  /** Overworld sheet for this person. */
  sheet: string
  stops: { tx: number; ty: number }[]
}

export interface SiteDef {
  /** Short key, used for messages and for the snapshot file name. */
  key: string
  /** Page title and canvas label. */
  title: string
  /** How the place is named inside a sentence: "el Rancho", "La Bahía". */
  place: string
  /** Card label for the arrival date: "En el Rancho desde". */
  sinceLabel: string
  seed: number
  zoneIds: readonly string[]
  zones: ZoneTable
  /** Where each zone gathers first: slots fill outward from here. */
  focus: Record<string, Pt>
  /** Where the zone name is painted when the map is seen as a whole. */
  labels: Record<string, Pt>
  /** Path the page fetches the snapshot from, relative to the page. */
  snapshotUrl: string
  isZone(value: unknown): boolean
  /** Zone a member prefers before capacity is taken into account. */
  preferredZone(id: string): string
  createMap(): SiteMap
  createArt(): SiteArt
  routes(): CaretakerRoute[]
  assignHomes(ids: readonly string[], capacity: Readonly<Record<string, number>>): Map<string, Home>
}

/**
 * Zone a member prefers, from a hash of their internal id weighted by `share`.
 * Shared by both sites: only the table differs.
 */
export function preferZone(unit: number, zoneIds: readonly string[], zones: ZoneTable): string {
  let u = unit
  for (const zone of zoneIds) {
    u -= zones[zone].share
    if (u < 0) return zone
  }
  return zoneIds[zoneIds.length - 1]
}

/**
 * Homes for members in arrival order. Each takes the next free slot of its
 * preferred zone; a full zone sends them to the zone with most room left.
 * Members beyond the total capacity get no home (and are not drawn).
 *
 * Pure and prefix-stable: a newcomer never moves anyone who arrived before.
 */
export function assignZoneHomes(
  ids: readonly string[],
  capacity: Readonly<Record<string, number>>,
  zoneIds: readonly string[],
  prefer: (id: string) => string,
): Map<string, Home> {
  const used: Record<string, number> = Object.fromEntries(zoneIds.map(z => [z, 0]))
  const homes = new Map<string, Home>()
  for (const id of ids) {
    let zone = prefer(id)
    if (used[zone] >= capacity[zone]) {
      let best: string | null = null
      for (const z of zoneIds) {
        const room = capacity[z] - used[z]
        if (room > 0 && (best === null || room > capacity[best] - used[best])) best = z
      }
      if (best === null) continue
      zone = best
    }
    homes.set(id, { zone, slot: used[zone]++ })
  }
  return homes
}
