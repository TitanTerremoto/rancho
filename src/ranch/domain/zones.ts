// Ranch zones and home assignment — Rancho
//
// Every inhabitant lives in a zone and holds one numbered slot of it. The pair
// (zone, slot) is the persistent "address": the map turns it into a tile, so a
// member finds their Pokémon in the same spot day after day.
//
// `assignHomes` is the rule the server will run when it first sees a member
// (RANCH-2). It is pure and prefix-stable: processing members in arrival order,
// a newcomer never moves anyone who arrived before.

import { assignZoneHomes, preferZone, type ZoneInfo } from '../../shared/site'
import { unitHash } from './seededRandom'

export const ZONE_IDS = ['casa', 'prado', 'lago', 'bosque', 'flores', 'rocas', 'corrales', 'descanso'] as const
export type ZoneId = (typeof ZONE_IDS)[number]

export type { ZoneInfo }

export const ZONES: Record<ZoneId, ZoneInfo> = {
  casa: { name: 'La Casa', where: 'junto a la casa', share: 0.08 },
  prado: { name: 'El Prado', where: 'en el prado', share: 0.2 },
  lago: { name: 'El Lago', where: 'a orillas del lago', share: 0.14 },
  bosque: { name: 'El Bosque', where: 'en el bosque', share: 0.13 },
  flores: { name: 'El Jardín', where: 'entre las flores del jardín', share: 0.13 },
  rocas: { name: 'Las Rocas', where: 'entre las rocas', share: 0.1 },
  corrales: { name: 'Los Corrales', where: 'en los corrales', share: 0.12 },
  descanso: { name: 'El Descanso', where: 'en la zona de descanso', share: 0.1 },
}

export function isZoneId(value: unknown): value is ZoneId {
  return typeof value === 'string' && (ZONE_IDS as readonly string[]).includes(value)
}

export interface Home {
  zone: ZoneId
  slot: number
}

/** Zone a member prefers, from a hash of their internal id weighted by `share`. */
export function preferredZone(id: string): ZoneId {
  return preferZone(unitHash(`zone:${id}`), ZONE_IDS, ZONES) as ZoneId
}

/**
 * Homes for members in arrival order. Each takes the next free slot of its
 * preferred zone; a full zone sends them to the zone with most room left.
 * Members beyond the total capacity get no home (and are not drawn).
 */
export function assignHomes(ids: readonly string[], capacity: Readonly<Record<string, number>>): Map<string, Home> {
  return assignZoneHomes(ids, capacity, ZONE_IDS, preferredZone) as Map<string, Home>
}
