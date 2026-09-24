import { describe, expect, it } from 'vitest'
import { T } from '../../engine/world'
import { caretakerRules, createCaretakers, tickCaretaker } from '../../ranch/world/caretakers'
import { buildSlots, slotCapacity, SPACED } from '../../ranch/world/slots'
import { ZONE_IDS } from '../domain/zones'
import { bayRoutes } from './bayCaretakers'
import { PIERS, PROPS, ZONE_FOCUS, ZONE_LABELS } from './bayLayout'
import { BAY_SEED, BayMap, inland } from './bayMap'

const map = new BayMap()
const slots = buildSlots(map, ZONE_IDS, ZONE_FOCUS, BAY_SEED)

describe('bay map', () => {
  it('is deterministic', () => {
    const again = new BayMap()
    expect(again.solid).toEqual(map.solid)
    expect(again.decor).toEqual(map.decor)
    expect(again.zones).toEqual(map.zones)
  })

  it('puts the sea to the east and the town on the land west of it', () => {
    // Far out east is open water, and deep at that.
    expect(map.vertexTerrain(115, 20)).toBe(T.DEEP)
    expect(map.water[20 * map.w + 115]).toBe(1)
    // The pine grove in the west is dry land.
    expect(map.water[20 * map.w + 10]).toBe(0)
    // And the shoreline really runs between the two, on every row.
    for (let y = 4; y < map.h - 4; y += 7) {
      const shore = [...Array(map.w).keys()].find(x => inland(x + 0.5, y + 0.5) < 0)
      expect(shore, `orilla en la fila ${y}`).toBeGreaterThan(20)
    }
  })

  it('lays the piers over the water as walkable planks', () => {
    for (const pier of PIERS) {
      for (let y = pier.y0; y <= pier.y1; y++) {
        for (let x = pier.x0; x <= pier.x1; x++) {
          expect(map.water[y * map.w + x], `muelle ${x},${y}`).toBe(0)
        }
      }
    }
    // They are habitable, which is the whole point: the dock zone lives there.
    expect(slots.muelle.length).toBeGreaterThan(20)
  })

  it('never puts a prop on a path, and only floats what floats', () => {
    const floats = new Set(['buoy', 'rowboat'])
    for (const prop of PROPS) {
      if (prop.kind === 'arch') continue
      for (let y = prop.at.y0; y <= prop.at.y1; y++) {
        for (let x = prop.at.x0; x <= prop.at.x1; x++) {
          expect(map.isPath(x, y), `${prop.kind} en ${x},${y}`).toBe(false)
          const onWater = map.water[y * map.w + x] === 1
          expect(onWater, `${prop.kind} en ${x},${y}`).toBe(floats.has(prop.kind))
        }
      }
    }
  })

  it('places every zone focus and label inside its own zone', () => {
    for (const zone of ZONE_IDS) {
      for (const [what, point] of [['foco', ZONE_FOCUS[zone]], ['rótulo', ZONE_LABELS[zone]]] as const) {
        expect(map.zoneAt(Math.floor(point.x), Math.floor(point.y)), `${what} de ${zone}`).toBe(zone)
      }
    }
  })
})

describe('bay home slots', () => {
  it('only uses habitable tiles of the right zone, each once', () => {
    const seen = new Set<string>()
    for (const zone of ZONE_IDS) {
      for (const { tx, ty } of slots[zone]) {
        expect(map.zoneAt(tx, ty)).toBe(zone)
        expect(map.isHabitable(tx, ty)).toBe(true)
        const key = `${tx},${ty}`
        expect(seen.has(key)).toBe(false)
        seen.add(key)
      }
    }
  })

  it('holds far more than Sky has members, so nobody is turned away', () => {
    const capacity = slotCapacity(slots)
    const total = ZONE_IDS.reduce((sum, z) => sum + capacity[z], 0)
    expect(total).toBeGreaterThan(3000)
    for (const zone of ZONE_IDS) expect(capacity[zone], zone).toBeGreaterThan(25)
  })

  it('places the roomy homes of every zone before it fills the gaps', () => {
    // buildSlots lists each zone twice over: first the homes it can keep
    // SPACED apart, then the gaps between them. How many fit in that first
    // pass depends on the shape of the zone — about a quarter of its tiles in
    // the open, but only 7 on the piers, which are planks two tiles wide. A
    // fifth is the share every zone clears, the piers included.
    const capacity = slotCapacity(slots)
    for (const zone of ZONE_IDS) {
      const roomy = slots[zone].slice(0, Math.min(40, Math.ceil(capacity[zone] / 5)))
      for (let i = 0; i < roomy.length; i++) {
        for (let j = i + 1; j < roomy.length; j++) {
          const d = Math.max(Math.abs(roomy[i].tx - roomy[j].tx), Math.abs(roomy[i].ty - roomy[j].ty))
          expect(d, `${zone} ${i}-${j}`).toBeGreaterThanOrEqual(SPACED)
        }
      }
    }
  })
})

describe('Sky and Guti on the bay', () => {
  const rules = caretakerRules(map)

  it('are the two people on the map, Sky first', () => {
    expect(bayRoutes().map(route => route.name)).toEqual(['Sky', 'Guti'])
  })

  it('reach their stops without walking into the sea', () => {
    const caretakers = createCaretakers(bayRoutes(), map, 0)
    const dt = 1 / 30
    const visited = caretakers.map(() => new Set<string>())
    for (let t = 0; t < 900; t += dt) {
      caretakers.forEach((caretaker, i) => {
        tickCaretaker(caretaker, t, dt, rules)
        expect(map.isSolid(caretaker.actor.tx, caretaker.actor.ty), caretaker.name).toBe(false)
        if (caretaker.steps.length === 0) visited[i].add(`${caretaker.actor.tx},${caretaker.actor.ty}`)
      })
    }
    caretakers.forEach((caretaker, i) => {
      expect(visited[i].size, `${caretaker.name} paradas`).toBeGreaterThan(2)
    })
  })
})
