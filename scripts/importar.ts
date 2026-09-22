// Import — Rancho
//
// Reads the exports in datos/, decides who lives where, and writes the
// snapshot the page loads. Run it whenever you download fresh lists:
//
//     npm run importar
//
// Assignments are kept in datos/asignaciones.json and never re-rolled: once
// somebody has a Pokémon and a home, they keep both, even if they unsubscribe
// and come back months later. That file is also where you grant a change —
// edit the "especie" of whoever asked, run the import again, done.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { collect, DEFAULT_EXCLUDED, fromTwitch, fromYouTube, membershipKey, parseCsv } from '../src/ranch/data/csvImport'
import { parseSnapshot, type RanchResident } from '../src/ranch/domain/membership'
import { hashString } from '../src/ranch/domain/seededRandom'
import { RANDOM_POOL } from '../src/ranch/domain/species'
import { preferredZone, ZONE_IDS, type ZoneId } from '../src/ranch/domain/zones'
import { RanchMap } from '../src/ranch/world/ranchMap'
import { buildSlots, slotCapacity } from '../src/ranch/world/slots'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DATOS = join(ROOT, 'datos')
const LEDGER = join(DATOS, 'asignaciones.json')
const SNAPSHOT = join(ROOT, 'public', 'snapshot.json')

interface Assignment {
  id: string
  especie: number
  zona: ZoneId
  slot: number
  desde: string
}
interface Ledger {
  version: 1
  habitantes: Record<string, Assignment>
}

const read = (path: string): string | null => (existsSync(path) ? readFileSync(path, 'utf8') : null)

function loadLedger(): Ledger {
  const raw = read(LEDGER)
  if (!raw) return { version: 1, habitantes: {} }
  const parsed = JSON.parse(raw) as Partial<Ledger>
  return { version: 1, habitantes: parsed.habitantes ?? {} }
}

function main(): void {
  const capacity = slotCapacity(buildSlots(new RanchMap()))
  const excludedRaw = read(join(DATOS, 'excluidos.json'))
  const excludedFile = excludedRaw ? (JSON.parse(excludedRaw) as string[] | { claves?: string[] }) : null
  const excluded: string[] = Array.isArray(excludedFile)
    ? excludedFile
    : (excludedFile?.claves ?? [...DEFAULT_EXCLUDED])

  const sources = []
  const yt = read(join(DATOS, 'youtube-miembros.csv'))
  const tw = read(join(DATOS, 'twitch-subs.csv'))
  if (yt) sources.push(fromYouTube(parseCsv(yt)))
  if (tw) sources.push(fromTwitch(parseCsv(tw)))
  if (!sources.length) throw new Error(`No encontré ningún CSV en ${DATOS}`)

  const { memberships, skipped } = collect(sources, excluded)
  const ledger = loadLedger()

  // Slots already spoken for, so a newcomer never lands on somebody's house.
  const taken = new Set<string>()
  const used = Object.fromEntries(ZONE_IDS.map(z => [z, 0])) as Record<ZoneId, number>
  let nextId = 0
  for (const a of Object.values(ledger.habitantes)) {
    taken.add(`${a.zona}:${a.slot}`)
    used[a.zona] = Math.max(used[a.zona], a.slot + 1)
    const n = Number.parseInt(a.id.slice(1), 36)
    if (Number.isFinite(n)) nextId = Math.max(nextId, n + 1)
  }

  function freeSlot(zone: ZoneId): number | null {
    for (let slot = 0; slot < capacity[zone]; slot++) if (!taken.has(`${zone}:${slot}`)) return slot
    return null
  }

  function assign(key: string): Assignment {
    let zone = preferredZone(key)
    let slot = freeSlot(zone)
    if (slot === null) {
      const roomiest = [...ZONE_IDS].sort((a, b) => capacity[b] - used[b] - (capacity[a] - used[a]))[0]
      zone = roomiest
      slot = freeSlot(zone)
      if (slot === null) throw new Error('El Rancho se quedó sin hogares libres')
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
  const snapshot = parseSnapshot({ version: 1, generatedAt: new Date().toISOString(), residents })
  if (snapshot.residents.length !== residents.length) {
    throw new Error(`La validación descartó ${residents.length - snapshot.residents.length} habitantes`)
  }

  mkdirSync(dirname(SNAPSHOT), { recursive: true })
  writeFileSync(SNAPSHOT, JSON.stringify(snapshot, null, 2) + '\n')
  writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + '\n')

  const porPlataforma = (p: string) => residents.filter(r => r.platform === p).length
  const dormidos = Object.keys(ledger.habitantes).length - residents.length
  console.log(`Habitantes: ${residents.length}  (YouTube ${porPlataforma('youtube')} · Twitch ${porPlataforma('twitch')})`)
  console.log(`Nuevos en esta pasada: ${nuevos}`)
  if (dormidos > 0) console.log(`Guardados por si vuelven: ${dormidos}`)
  for (const s of skipped) console.log(`  fuera: ${s.name} (${s.source}, ${s.reason})`)
  console.log(`\nsnapshot  -> ${SNAPSHOT}`)
  console.log(`registro  -> ${LEDGER}`)
}

main()
