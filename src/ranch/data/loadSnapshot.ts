// Where the inhabitants come from — Rancho / La Bahía
//
// By default the page loads the snapshot built by `npm run importar` from the
// exports in datos/. ?mock=N replaces it with invented inhabitants, which is
// how a map gets developed and stress-tested without touching real people.

import { parseSnapshot, type RanchSnapshot } from '../domain/membership'
import { createMockSnapshot } from './mockSnapshot'
import type { ZoneGuardSite } from './siteData'
import type { RanchParams } from './urlParams'

export async function loadSnapshot(
  site: ZoneGuardSite,
  params: RanchParams,
  capacity: Readonly<Record<string, number>>,
): Promise<RanchSnapshot> {
  if (params.mockRequested) return createMockSnapshot(site, params.mock, capacity)
  const response = await fetch(site.snapshotUrl, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`${site.snapshotUrl} respondió ${response.status}`)
  // Same gate a fetched snapshot would get from any other source.
  return parseSnapshot(await response.json(), site.isZone)
}
