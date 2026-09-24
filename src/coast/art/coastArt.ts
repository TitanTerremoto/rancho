// Sprite registry — La Bahía
//
// Builds every drawn sprite the bay needs, once, at start-up. Half of them are
// the ranch's: a bench is a bench, a crate is a crate, and reusing them is
// exactly what makes the two maps look like one world. The other half is the
// harbour gear in coastProps.ts, which the ranch has no use for.
//
// Everything here is painted in code, so there is nothing to await and the
// first frame is already complete. Pokémon and the two trainers are images and
// load separately.

import { buildPropSprites } from '../../engine/props'
import type { Sprite } from '../../engine/sprite'
import { buildTownProps } from '../../engine/townProps'
import { buildArch } from '../../ranch/art/buildingArt'
import { buildBasket, buildCrate, buildFlowerpot, buildReeds } from '../../ranch/art/farmArt'
import { buildFenceSprites } from '../../ranch/art/fenceArt'
import type { SiteArt } from '../../shared/site'
import type { PropKind } from '../world/bayLayout'
import {
  buildAnchor, buildBarrel, buildBoatShed, buildBuoy, buildDockHouse, buildLighthouse, buildNet,
  buildRowboat, buildSeaHouse, buildStall,
} from './coastProps'

/** Width of the entrance arch, in pixels: seven tiles across the road. */
const ARCH_WIDTH = 7 * 16

export function buildCoastArt(): SiteArt {
  const town = buildTownProps()
  const decor = buildPropSprites()
  const props: Record<PropKind, Sprite[]> = {
    lighthouse: [buildLighthouse()],
    house: [buildSeaHouse()],
    dockHouse: [buildDockHouse()],
    stall: [0, 1, 2].map(buildStall),
    boatShed: [buildBoatShed()],
    arch: [buildArch(ARCH_WIDTH, 'BAHIA DE SKY')],
    lamp: [town.lamp],
    bench: [town.bench],
    signpost: [town.sign],
    crate: [0, 1].map(buildCrate),
    barrel: [0, 1].map(buildBarrel),
    buoy: [0, 1].map(buildBuoy),
    net: [0, 1].map(buildNet),
    anchor: [buildAnchor()],
    // The engine already draws a palm; the promenade uses that very sprite,
    // so the hand-placed ones and the scattered ones cannot disagree.
    palm: [decor.palm],
    reeds: [buildReeds()],
    rowboat: [0, 1].map(buildRowboat),
    flowerpot: [0, 1].map(buildFlowerpot),
    basket: [buildBasket()],
  }
  return {
    props,
    animated: new Set<string>(),
    decor,
    fence: buildFenceSprites(),
  }
}
