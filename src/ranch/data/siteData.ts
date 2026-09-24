// What the data layer needs to know about a place — Rancho / La Bahía
//
// Loading a snapshot and inventing a mock one need three things from the site
// and nothing else: where its snapshot lives, which zone ids it accepts, and
// how it hands out homes. Naming that small slice here keeps the data modules
// free of the render and world layers.

import type { Home, SiteDef } from '../../shared/site'

export type { Home }

export type ZoneGuardSite = Pick<SiteDef, 'snapshotUrl' | 'isZone' | 'assignHomes'>
