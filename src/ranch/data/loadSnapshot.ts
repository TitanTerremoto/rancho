// Where the inhabitants come from — Rancho
//
// By default the page loads the snapshot built by `npm run importar` from the
// exports in datos/. ?mock=N replaces it with invented inhabitants, which is
// how the map gets developed and stress-tested without touching real people.

import { parseSnapshot, type RanchSnapshot } from '../domain/membership'
import type { ZoneId } from '../domain/zones'
import { createMockSnapshot } from './mockSnapshot'
import type { RanchParams } from './urlParams'

export const SNAPSHOT_URL = 'snapshot.json'

export async function loadSnapshot(
  params: RanchParams,
  capacity: Readonly<Record<ZoneId, number>>,
): Promise<RanchSnapshot> {
  if (params.mockRequested) return createMockSnapshot(params.mock, capacity)
  const response = await fetch(SNAPSHOT_URL, { cache: 'no-cache' })
  if (!response.ok) throw new Error(`snapshot.json respondió ${response.status}`)
  // Same gate a fetched snapshot would get from any other source.
  return parseSnapshot(await response.json())
}
