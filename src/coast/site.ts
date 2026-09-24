// La Bahía de Sky — the site definition
//
// The same contract the ranch fills, with a coast town behind it. Everything
// the scene, the ground baker, the slots and the card need to know about this
// place is here; nothing else in the codebase names it.

import type { SiteDef } from '../shared/site'
import { buildCoastArt } from './art/coastArt'
import { assignHomes, isZoneId, preferredZone, ZONE_IDS, ZONES } from './domain/zones'
import { bayRoutes } from './world/bayCaretakers'
import { ZONE_FOCUS, ZONE_LABELS } from './world/bayLayout'
import { BAY_SEED, BayMap } from './world/bayMap'

export const baySite: SiteDef = {
  key: 'bahia',
  title: 'La Bahía Pokémon de Sky',
  place: 'La Bahía',
  sinceLabel: 'En La Bahía desde',
  seed: BAY_SEED,
  zoneIds: ZONE_IDS,
  zones: ZONES,
  focus: ZONE_FOCUS,
  labels: ZONE_LABELS,
  // The bay is published one folder deeper, so its snapshot sits beside it.
  snapshotUrl: 'snapshot.json',
  isZone: isZoneId,
  preferredZone,
  createMap: () => new BayMap(),
  createArt: () => buildCoastArt(),
  routes: bayRoutes,
  assignHomes,
}
