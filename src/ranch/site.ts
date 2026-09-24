// El Rancho de Guti — the site definition
//
// Everything that makes this place *this place*, gathered in one object: its
// zones, its map, its art, its two caretakers. The scene, the ground baker,
// the slots and the card all read it and know nothing else about the ranch.

import type { SiteDef } from '../shared/site'
import { assignHomes, isZoneId, preferredZone, ZONE_IDS, ZONES } from './domain/zones'
import { buildRanchArt } from './render/ranchArt'
import { caretakerRoutes } from './world/caretakers'
import { ZONE_FOCUS, ZONE_LABELS } from './world/ranchLayout'
import { RANCH_SEED, RanchMap } from './world/ranchMap'

export const ranchSite: SiteDef = {
  key: 'rancho',
  title: 'Rancho Pokémon de Guti',
  place: 'el Rancho',
  sinceLabel: 'En el Rancho desde',
  seed: RANCH_SEED,
  zoneIds: ZONE_IDS,
  zones: ZONES,
  focus: ZONE_FOCUS,
  labels: ZONE_LABELS,
  snapshotUrl: 'snapshot.json',
  isZone: isZoneId,
  preferredZone,
  createMap: () => new RanchMap(),
  createArt: () => buildRanchArt(),
  routes: caretakerRoutes,
  assignHomes,
}
