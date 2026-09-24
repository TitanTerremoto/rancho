// Sky and Guti — La Bahía
//
// The bay is Sky's, so she does the long round of it: her door, the market,
// the quay, the promenade, the beach, and up the headland to the lighthouse.
// Guti comes over from the ranch and keeps to the town side, arriving through
// the arch on the western road.
//
// The walking itself is the ranch's: same pathfinder, same unhurried pace.

import type { CaretakerRoute } from '../../shared/site'

// BASE_URL keeps the sheets findable when the bay is served from a subfolder,
// as it is on GitHub Pages. It is read inside the route builder, not at module
// level, so this file is safe to import from Node too.
const sheet = (file: string): string => `${import.meta.env.BASE_URL}assets/trainers/${file}`

export function bayRoutes(): CaretakerRoute[] {
  return [
    {
      id: 'sky',
      name: 'Sky',
      sheet: sheet('dawnrosa.png'),
      stops: [
        { tx: 38, ty: 45 }, // la puerta de su casa
        { tx: 43, ty: 48 }, // la plaza del mercado
        { tx: 52, ty: 45 }, // la bocana de los muelles
        { tx: 49, ty: 58 }, // el paseo, tramo sur
        { tx: 60, ty: 66 }, // la playa
        { tx: 68, ty: 24 }, // el camino del faro
      ],
    },
    {
      id: 'guti',
      name: 'Guti',
      sheet: sheet('protahombre.png'),
      stops: [
        { tx: 15, ty: 38 }, // llega por el arco del oeste
        { tx: 27, ty: 43 }, // la carretera del pinar
        { tx: 35, ty: 48 }, // el mercado
        { tx: 33, ty: 57 }, // el cobertizo de las barcas
        { tx: 30, ty: 69 }, // las dunas
        { tx: 45, ty: 52 }, // vuelta por la plaza
      ],
    },
  ]
}
