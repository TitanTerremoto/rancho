// Import — Rancho / La Bahía
//
// Reads the exports of one place, decides who lives where, and writes the
// snapshot its page loads. Run it whenever you download fresh lists:
//
//     npm run importar          el Rancho de Guti   (datos/)
//     npm run importar:sky      La Bahía de Sky     (datos/sky/)
//
// Assignments are kept in that place's asignaciones.json and never re-rolled:
// once somebody has a Pokémon and a home, they keep both, even if they
// unsubscribe and come back months later. That file is also where you grant a
// change — edit the "especie" of whoever asked, run the import again, done.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { baySite } from '../src/coast/site'
import { collect, DEFAULT_EXCLUDED, fromTwitch, fromYouTube, membershipKey, parseCsv } from '../src/ranch/data/csvImport'
import { parseSnapshot, type RanchResident } from '../src/ranch/domain/membership'
import { hashString } from '../src/ranch/domain/seededRandom'
import { RANDOM_POOL } from '../src/ranch/domain/species'
import { ranchSite } from '../src/ranch/site'
import { buildSlots, slotCapacity } from '../src/ranch/world/slots'
import type { SiteDef } from '../src/shared/site'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Place {
  site: SiteDef
  /** Folder holding this place's CSV exports and its ledger. */
  datos: string
  /** File the page fetches its inhabitants from. */
  snapshot: string
}

const PLACES: Record<string, Place> = {
  rancho: { site: ranchSite, datos: join(ROOT, 'datos'), snapshot: join(ROOT, 'public', 'snapshot.json') },
  sky: { site: baySite, datos: join(ROOT, 'datos', 'sky'), snapshot: join(ROOT, 'public', 'sky', 'snapshot.json') },
}

interface Assignment {
  id: string
  especie: number
  zona: string
  slot: number
  desde: string
}
interface Ledger {
  version: 1
  habitantes: Record<string, Assignment>
}

const read = (path: string): string | null => (existsSync(path) ? readFileSync(path, 'utf8') : null)

function loadLedger(path: string): Ledger {
  const raw = read(path)
  if (!raw) return { version: 1, habitantes: {} }
  const parsed = JSON.parse(raw) as Partial<Ledger>
  return { version: 1, habitantes: parsed.habitantes ?? {} }
}

function main(): void {
  const which = process.argv[2] ?? 'rancho'
  const place = PLACES[which]
  if (!place) throw new Error(`No conozco el sitio "${which}". Conozco: ${Object.keys(PLACES).join(', ')}.`)
  const { site, datos } = place
  const ledgerPath = join(datos, 'asignaciones.json')

  const capacity = slotCapacity(buildSlots(site.createMap(), site.zoneIds, site.focus, site.seed))
  const excludedRaw = read(join(datos, 'excluidos.json'))
  const excludedFile = excludedRaw ? (JSON.parse(excludedRaw) as string[] | { claves?: string[] }) : null
  const excluded: string[] = Array.isArray(excludedFile)
    ? excludedFile
    : (excludedFile?.claves ?? [...DEFAULT_EXCLUDED])

  const sources = []
  const yt = read(join(datos, 'youtube-miembros.csv'))
  const tw = read(join(datos, 'twitch-subs.csv'))
  if (yt) sources.push(fromYouTube(parseCsv(yt)))
  if (tw) sources.push(fromTwitch(parseCsv(tw)))
  if (!sources.length) throw new Error(`No encontré ningún CSV en ${datos}`)

  const { memberships, skipped } = collect(sources, excluded)
  const ledger = loadLedger(ledgerPath)

  // Slots already spoken for, so a newcomer never lands on somebody's house.
  const taken = new Set<string>()
  const used: Record<string, number> = Object.fromEntries(site.zoneIds.map(z => [z, 0]))
  let nextId = 0
  for (const a of Object.values(ledger.habitantes)) {
    taken.add(`${a.zona}:${a.slot}`)
    used[a.zona] = Math.max(used[a.zona] ?? 0, a.slot + 1)
    const n = Number.parseInt(a.id.slice(1), 36)
    if (Number.isFinite(n)) nextId = Math.max(nextId, n + 1)
  }

  function freeSlot(zone: string): number | null {
    for (let slot = 0; slot < capacity[zone]; slot++) if (!taken.has(`${zone}:${slot}`)) return slot
    return null
  }

  function assign(key: string): Assignment {
    let zone = site.preferredZone(key)
    let slot = freeSlot(zone)
    if (slot === null) {
      zone = [...site.zoneIds].sort((a, b) => capacity[b] - used[b] - (capacity[a] - used[a]))[0]
      slot = freeSlot(zone)
      if (slot === null) throw new Error(`${site.title} se quedó sin hogares libres`)
    }
    taken.add(`${zone}:${slot}`)
    used[zone] = Math.max(used[zone], slot + 1)
    return {
      id: `r${(nextId++).toString(36)}`,
      especie: RANDOM_POOL[hashString(`species:${key}`) % RANDOM_POOL.length],
      zona: zone,
      slot,
      desde: new Date().toISOString(),
    }
  }

  const residents: RanchResident[] = []
  let nuevos = 0
  for (const m of memberships) {
    const key = membershipKey(m)
    let home = ledger.habitantes[key]
    if (!home) {
      home = assign(key)
      ledger.habitantes[key] = home
      nuevos++
    }
    residents.push({
      id: home.id,
      platform: m.platform,
      displayName: m.displayName,
      speciesId: home.especie,
      shiny: false,
      zone: home.zona,
      slot: home.slot,
      firstSeenAt: home.desde,
      memberSince: m.memberSince,
      tenureMonths: m.tenureMonths,
      tier: m.tier,
    })
  }

  // The same gate the browser applies, so a bad snapshot never ships.
  const snapshot = parseSnapshot({ version: 1, generatedAt: new Date().toISOString(), residents }, site.isZone)
  if (snapshot.residents.length !== residents.length) {
    throw new Error(`La validación descartó ${residents.length - snapshot.residents.length} habitantes`)
  }

  mkdirSync(dirname(place.snapshot), { recursive: true })
  mkdirSync(datos, { recursive: true })
  writeFileSync(place.snapshot, JSON.stringify(snapshot, null, 2) + '\n')
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n')

  const porPlataforma = (p: string) => residents.filter(r => r.platform === p).length
  const dormidos = Object.keys(ledger.habitantes).length - residents.length
  console.log(site.title)
  console.log(`Habitantes: ${residents.length}  (YouTube ${porPlataforma('youtube')} · Twitch ${porPlataforma('twitch')})`)
  console.log(`Nuevos en esta pasada: ${nuevos}`)
  if (dormidos > 0) console.log(`Guardados por si vuelven: ${dormidos}`)
  for (const s of skipped) console.log(`  fuera: ${s.name} (${s.source}, ${s.reason})`)
  console.log(`\nsnapshot  -> ${place.snapshot}`)
  console.log(`registro  -> ${ledgerPath}`)
}

main()
