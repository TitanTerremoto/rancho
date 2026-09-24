// Bay zones and home assignment — La Bahía
//
// Same contract as the ranch: every inhabitant lives in a zone and holds one
// numbered slot of it, and (zone, slot) is the persistent address. Only the
// places are different — this is a coast town, not a farm.

import { unitHash } from '../../ranch/domain/seededRandom'
import { assignZoneHomes, preferZone, type Home, type ZoneInfo } from '../../shared/site'

export const ZONE_IDS = ['faro', 'muelle', 'playa', 'paseo', 'mercado', 'dunas', 'pinar', 'arrecife'] as const
export type ZoneId = (typeof ZONE_IDS)[number]

export type { ZoneInfo }

export const ZONES: Record<ZoneId, ZoneInfo> = {
  faro: { name: 'El Faro', where: 'al pie del faro', share: 0.08 },
  muelle: { name: 'Los Muelles', where: 'en los muelles', share: 0.12 },
  playa: { name: 'La Playa', where: 'en la playa', share: 0.19 },
  paseo: { name: 'El Paseo', where: 'sobre el paseo marítimo', share: 0.11 },
  mercado: { name: 'El Mercado', where: 'junto al mercado', share: 0.1 },
  dunas: { name: 'Las Dunas', where: 'entre las dunas', share: 0.16 },
  pinar: { name: 'El Pinar', where: 'en el pinar', share: 0.14 },
  arrecife: { name: 'El Arrecife', where: 'en las pozas del arrecife', share: 0.1 },
}

export function isZoneId(value: unknown): value is ZoneId {
  return typeof value === 'string' && (ZONE_IDS as readonly string[]).includes(value)
}

export type { Home }

/** Zone a member prefers, from a hash of their internal id weighted by `share`. */
export function preferredZone(id: string): ZoneId {
  return preferZone(unitHash(`zone:${id}`), ZONE_IDS, ZONES) as ZoneId
}

/** Homes in arrival order; a newcomer never moves anyone who arrived before. */
export function assignHomes(ids: readonly string[], capacity: Readonly<Record<string, number>>): Map<string, Home> {
  return assignZoneHomes(ids, capacity, ZONE_IDS, preferredZone)
}
