// Membership model — Rancho
//
// Two shapes, one per side of the (future) server:
//
//   NormalizedMembership  what any source produces: the mock today, a Twitch
//                         sync or a YouTube Studio CSV import later. Facts
//                         about the membership only; no Pokémon, no position.
//   RanchResident         what the ranch receives: the membership plus the
//                         server-side assignment (species, zone, slot). The
//                         browser never rolls or recomputes these.
//
// Names are untrusted text: cleaned here and only ever rendered as text.

import { isSpeciesId } from './species'
import { isZoneId } from './zones'

export type Platform = 'twitch' | 'youtube'

export interface NormalizedMembership {
  platform: Platform
  /** Stable id on the platform. Identity is (platform, platformUserId), never the name. */
  platformUserId: string
  displayName: string
  /** Start of the current membership, when the source provides it. */
  memberSince: string | null
  /** Months as a paying member, when the source provides it (YouTube Studio's CSV does). */
  tenureMonths: number | null
  /** Twitch tier ('1000' | '2000' | '3000') or the YouTube level name. */
  tier: string | null
}

export interface RanchResident {
  /** Internal id: not the platform id and not the name. */
  id: string
  platform: Platform
  displayName: string
  speciesId: number
  shiny: boolean
  /** Zone id of whichever place this snapshot belongs to. */
  zone: string
  slot: number
  /** When the ranch first saw this membership: the only date Twitch can honestly back. */
  firstSeenAt: string
  memberSince: string | null
  tenureMonths: number | null
  tier: string | null
}

export interface RanchSnapshot {
  version: 1
  generatedAt: string
  residents: RanchResident[]
}

export const MAX_NAME_LENGTH = 50

// C0/C1 controls, zero-width joiners aside, and bidirectional overrides/isolates
// (which could flip the text around them).
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g

/** Display-safe name: no control or bidi characters, trimmed, bounded length. */
export function cleanDisplayName(raw: string): string {
  const cleaned = raw.replace(UNSAFE_CHARS, '').replace(/\s+/g, ' ').trim()
  const chars = Array.from(cleaned)
  return chars.length > MAX_NAME_LENGTH ? chars.slice(0, MAX_NAME_LENGTH).join('') : cleaned
}

const isIsoDate = (value: unknown): value is string => typeof value === 'string' && !Number.isNaN(Date.parse(value))
const optionalDate = (value: unknown): string | null => (isIsoDate(value) ? value : null)
const optionalMonths = (value: unknown): number | null =>
  Number.isInteger(value) && (value as number) >= 0 ? (value as number) : null
const optionalText = (value: unknown): string | null => (typeof value === 'string' && value ? value.slice(0, 40) : null)

/** Whether a zone id belongs to the place this snapshot is for. */
export type ZoneGuard = (value: unknown) => boolean

function parseResident(raw: unknown, isZone: ZoneGuard): RanchResident | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) return null
  if (r.platform !== 'twitch' && r.platform !== 'youtube') return null
  if (typeof r.displayName !== 'string') return null
  const displayName = cleanDisplayName(r.displayName)
  if (!displayName) return null
  if (!isSpeciesId(r.speciesId) || typeof r.zone !== 'string' || !isZone(r.zone)) return null
  if (!Number.isInteger(r.slot) || (r.slot as number) < 0) return null
  if (!isIsoDate(r.firstSeenAt)) return null
  return {
    id: r.id,
    platform: r.platform,
    displayName,
    speciesId: r.speciesId,
    shiny: r.shiny === true,
    zone: r.zone,
    slot: r.slot as number,
    firstSeenAt: r.firstSeenAt,
    memberSince: optionalDate(r.memberSince),
    tenureMonths: optionalMonths(r.tenureMonths),
    tier: optionalText(r.tier),
  }
}

/**
 * Validates a snapshot from any source. Invalid residents are dropped (and a
 * duplicated id or address keeps its first entry) rather than failing the
 * whole ranch.
 */
export function parseSnapshot(raw: unknown, isZone: ZoneGuard = isZoneId): RanchSnapshot {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const list = Array.isArray(r.residents) ? r.residents : []
  const ids = new Set<string>()
  const addresses = new Set<string>()
  const residents: RanchResident[] = []
  for (const item of list) {
    const resident = parseResident(item, isZone)
    if (!resident) continue
    const address = `${resident.zone}:${resident.slot}`
    if (ids.has(resident.id) || addresses.has(address)) continue
    ids.add(resident.id)
    addresses.add(address)
    residents.push(resident)
  }
  return {
    version: 1,
    generatedAt: isIsoDate(r.generatedAt) ? r.generatedAt : new Date(0).toISOString(),
    residents,
  }
}
