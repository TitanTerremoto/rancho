// CSV import — Rancho
//
// Turns the two exports you can download by hand into the same
// NormalizedMembership shape the mock produces, so everything downstream —
// species, homes, the card — stays exactly as it was.
//
//   YouTube Studio → Monetización → Membresías → Descargar
//   Twitch         → Creator Dashboard → subscriber list
//
// Neither export is trusted: names are cleaned, rows missing an identity are
// dropped, and a member listed twice collapses into one.

import { cleanDisplayName, type NormalizedMembership, type Platform } from '../domain/membership'

/** A row that could not become an inhabitant, and why. */
export interface SkippedRow {
  source: Platform
  name: string
  reason: 'sin identidad' | 'excluido' | 'repetido'
}

export interface ImportResult {
  memberships: NormalizedMembership[]
  skipped: SkippedRow[]
}

/** Bots and the ranch's own owner: present in the export, not inhabitants. */
export const DEFAULT_EXCLUDED: readonly string[] = ['twitch:streamlabs', 'twitch:nightbot', 'twitch:guti']

/** RFC 4180 enough for what these two exports actually emit. */
export function parseCsv(text: string): Record<string, string>[] {
  // The BOM is written as an escape on purpose: invisible characters do not
  // belong in source anybody has to read or edit.
  const clean = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  const endField = (): void => {
    row.push(field)
    field = ''
  }
  const endRow = (): void => {
    endField()
    rows.push(row)
    row = []
  }

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i]
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') {
        quoted = false
      } else {
        field += c
      }
      continue
    }
    if (c === '"') quoted = true
    else if (c === ',') endField()
    else if (c === '\n') endRow()
    else field += c
  }
  if (field || row.length) endRow()
  const header = rows.shift()
  if (!header) return []
  const keys = header.map(h => h.trim())
  return rows
    .filter(r => r.some(v => v.trim()))
    .map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])))
}

/**
 * A column, by any of the names the export has been seen to use. YouTube
 * Studio labels the profile link "Enlace al perfil" on one channel and
 * "Vínculo al perfil" on another, so a single spelling is not safe to require.
 */
type Column = readonly string[]

const nameOf = (row: Record<string, string>, column: Column): string | null =>
  column.find(name => name in row) ?? null

const valueOf = (row: Record<string, string>, column: Column): string => {
  const name = nameOf(row, column)
  return name === null ? '' : row[name]
}

/** Fails loudly and usefully when an export changes its column names. */
function requireColumns(rows: Record<string, string>[], needed: Column[], source: string): void {
  if (!rows.length) return
  const missing = needed.filter(column => nameOf(rows[0], column) === null)
  if (missing.length) {
    const wanted = missing.map(c => c.map(n => `"${n}"`).join(' o ')).join(', ')
    const have = Object.keys(rows[0]).map(h => `"${h}"`).join(', ')
    throw new Error(`El export de ${source} no trae ${wanted}. Columnas encontradas: ${have}.`)
  }
}

const YT_NAME: Column = ['Miembro']
const YT_LINK: Column = ['Enlace al perfil', 'Vínculo al perfil']
const YT_LEVEL: Column = ['Nivel actual']
const YT_TENURE: Column = ['Tiempo total como miembro (meses)']
const YT_UPDATE: Column = ['Última actualización']
const YT_UPDATED_AT: Column = ['Marca de tiempo de la última actualización']
const YOUTUBE_COLUMNS = [YT_NAME, YT_LINK, YT_LEVEL, YT_TENURE, YT_UPDATE, YT_UPDATED_AT]

/** Channel id out of the profile link: the only stable identity the export gives. */
function youtubeChannelId(link: string): string | null {
  return /\/channel\/([A-Za-z0-9_-]+)/.exec(link)?.[1] ?? null
}

function isoOrNull(value: string): string | null {
  const d = new Date(value)
  return value && !Number.isNaN(d.getTime()) ? d.toISOString() : null
}

function months(value: string): number | null {
  const n = Number.parseFloat(value.replace(',', '.'))
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null
}

export function fromYouTube(rows: Record<string, string>[]): NormalizedMembership[] {
  requireColumns(rows, YOUTUBE_COLUMNS, 'YouTube')
  const out: NormalizedMembership[] = []
  for (const row of rows) {
    const id = youtubeChannelId(valueOf(row, YT_LINK))
    const displayName = cleanDisplayName(valueOf(row, YT_NAME))
    if (!id || !displayName) continue
    // "Se unió" dates the membership. A return reads "Volvió a unirse" on one
    // channel and "Se volvió a unir" on another, and either way it dates the
    // return, not the join, so the date is left out rather than misreported.
    const joined = valueOf(row, YT_UPDATE).toLowerCase().startsWith('se unió')
    out.push({
      platform: 'youtube',
      platformUserId: id,
      displayName,
      memberSince: joined ? isoOrNull(valueOf(row, YT_UPDATED_AT)) : null,
      tenureMonths: months(valueOf(row, YT_TENURE)),
      tier: valueOf(row, YT_LEVEL) || null,
    })
  }
  return out
}

const TW_USER: Column = ['Username']
const TW_TIER: Column = ['Current Tier']
const TW_TENURE: Column = ['Tenure']
const TWITCH_COLUMNS = [TW_USER, TW_TIER, TW_TENURE]

const TWITCH_TIERS: Record<string, string> = { 'tier 1': '1000', 'tier 2': '2000', 'tier 3': '3000' }

export function fromTwitch(rows: Record<string, string>[]): NormalizedMembership[] {
  requireColumns(rows, TWITCH_COLUMNS, 'Twitch')
  const out: NormalizedMembership[] = []
  for (const row of rows) {
    const login = valueOf(row, TW_USER).trim()
    const displayName = cleanDisplayName(login)
    if (!login || !displayName) continue
    out.push({
      platform: 'twitch',
      // The export has no numeric user id, so the login is the identity.
      platformUserId: login.toLowerCase(),
      displayName,
      // "Subscribe Date" dates the current billing run, not the first one: in
      // this channel's own export it disagrees with Tenure for subscribers of
      // six years, so it is never reported as a join date. Tenure stands alone.
      memberSince: null,
      tenureMonths: months(valueOf(row, TW_TENURE)),
      tier: TWITCH_TIERS[valueOf(row, TW_TIER).trim().toLowerCase()] ?? null,
    })
  }
  return out
}

export const membershipKey = (m: Pick<NormalizedMembership, 'platform' | 'platformUserId'>): string =>
  `${m.platform}:${m.platformUserId}`

/** Higher tier wins a duplicate; Twitch tiers sort, YouTube level names do not. */
function rank(m: NormalizedMembership): number {
  const tier = Number.parseInt(m.tier ?? '', 10)
  return Number.isFinite(tier) ? tier : 0
}

/**
 * One membership per identity, in the order given, minus whoever is excluded.
 * Excluded keys are `platform:id`, case-insensitive.
 */
export function collect(
  sources: readonly NormalizedMembership[][],
  excluded: readonly string[] = DEFAULT_EXCLUDED,
): ImportResult {
  const block = new Set(excluded.map(e => e.toLowerCase()))
  const byKey = new Map<string, NormalizedMembership>()
  const skipped: SkippedRow[] = []
  for (const source of sources) {
    for (const m of source) {
      const key = membershipKey(m)
      if (block.has(key.toLowerCase())) {
        skipped.push({ source: m.platform, name: m.displayName, reason: 'excluido' })
        continue
      }
      const seen = byKey.get(key)
      if (!seen) {
        byKey.set(key, m)
        continue
      }
      skipped.push({ source: m.platform, name: m.displayName, reason: 'repetido' })
      if (rank(m) > rank(seen)) byKey.set(key, m)
    }
  }
  return { memberships: [...byKey.values()], skipped }
}
