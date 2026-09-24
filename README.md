# Rancho Pokemon

Dos mapas vistos desde arriba donde vive un Pokemon por cada suscriptor de Twitch y
cada miembro de YouTube. Entras, buscas tu nombre y descubris cual te toco.

- **El Rancho de Guti** — `/` — campo, lago, corrales y un granero.
- **La Bahia de Sky** — `/sky/` — pueblo costero: faro, muelles, playa, arrecife.

Son dos sitios distintos con el mismo apartado grafico: mismo motor, mismo arte
base, mismas fichas. Lo unico que cambia es el lugar.

    npm install
    npm run dev     # http://localhost:5173/  y  http://localhost:5173/sky/

## Los habitantes salen de dos CSV

No hay backend, ni API, ni tokens. Bajas las listas a mano, corres el importador y
el sitio sigue siendo estatico.

    # 1. YouTube Studio -> Monetizacion -> Membresias -> Descargar
    #    guardalo como datos/youtube-miembros.csv       (Sky: datos/sky/...)
    # 2. Twitch -> Creator Dashboard -> lista de subs
    #    guardalo como datos/twitch-subs.csv            (Sky: datos/sky/...)
    npm run importar         # el Rancho  -> public/snapshot.json
    npm run importar:sky     # La Bahia   -> public/sky/snapshot.json

Cada lugar tiene su carpeta en `datos/` y su snapshot en `public/`. Nunca se
mezclan: una baja en Twitch de Sky no mueve a nadie del Rancho.

### asignaciones.json

El registro de quien recibio que Pokemon y en que casa vive, uno por lugar
(`datos/asignaciones.json` y `datos/sky/asignaciones.json`). **Nunca se vuelve a
sortear**: quien ya tiene su Pokemon lo conserva, aunque se de de baja y vuelva
meses despues. Los que se fueron quedan guardados por si regresan.

Tambien es donde concedes un cambio. Alguien te pide otro Pokemon: le cambias el
numero de `especie`, corres el importador de nuevo y listo. No hace falta panel de
administracion.

### excluidos.json

Quienes aparecen en los CSV pero no viven ahi: los bots del canal y el dueno, que
ya camina por el mapa. En el Rancho caminan Guti y Sky; en La Bahia, Sky y Guti.

## Parametros de URL

Valen igual en los dos mapas.

| | |
|---|---|
| `?mock=N` | habitantes inventados en vez del snapshot real (tope 5000) |
| `?u=nombre` | abrir el mapa sobre ese habitante |
| `?debug=1` | contador de habitantes, visibles, FPS, chunks y especies |

## Como esta armado

Un lugar es un objeto: sus zonas, su mapa, su arte y su gente. Todo lo demas
—camara, suelo horneado, orden por profundidad, buscador, ficha— esta escrito
contra ese contrato y lo comparten los dos.

- `src/shared/site.ts` — que es un lugar (`SiteDef`) y el reparto de hogares.
- `src/ranch/site.ts` — el Rancho de Guti.  `src/coast/site.ts` — La Bahia de Sky.
- `datos/` — los CSV que bajas, el registro de asignaciones y los excluidos.
- `scripts/importar.ts` — convierte los CSV de un lugar en su snapshot.
- `src/ranch/` — dominio, mapa, arte, render y la capa Vue, compartidos.
  - `domain/` — miembros, especies, zonas, antiguedad, busqueda.
  - `world/` — el mapa disenado, los slots, los habitantes, los cuidadores.
  - `render/` — camara cenital, suelo horneado, escenografia, carteles, escena.
  - `art/` — arte dibujado en codigo.
  - `components/` — buscador y ficha.
- `src/coast/` — solo lo propio de La Bahia: zonas, la costa, el arte del puerto.
- `src/engine/` — motor 2D compartido: actores, sprites, chunks, pathfinding, ruido.
- `public/assets/` — hojas overworld de Pokemon y de entrenadores.

Canvas 2D propio: sin Phaser, sin PixiJS, sin un componente por Pokemon. Vue solo
maneja el buscador, la ficha y la UI.

## Decisiones que sostienen el rendimiento

Culling por viewport, nada se simula fuera de pantalla, sprites cargados en cuanto
hacen falta, carteles cacheados, cero allocations por frame, frame salteado cuando
nada se movio, pausa con `document.hidden`, DPR tope 2.

Medido en Chromium con GPU: 60 FPS con 100 habitantes y con 2000 a zoom normal;
33-37 FPS con los 2000 en pantalla a la vez. El heap se queda en 8-10 MB.

## Verificacion

    npm run typecheck
    npm run lint
    npm test
    npm run build
