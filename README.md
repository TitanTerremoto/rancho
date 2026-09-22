# Rancho Pokemon

Un rancho visto desde arriba donde vive un Pokemon por cada suscriptor de Twitch y
cada miembro de YouTube. Entras, buscas tu nombre y descubris cual te toco.

    npm install
    npm run dev     # http://localhost:5173/

## Los habitantes salen de dos CSV

No hay backend, ni API, ni tokens. Bajas las listas a mano, corres el importador y
el sitio sigue siendo estatico.

    # 1. YouTube Studio -> Monetizacion -> Membresias -> Descargar
    #    guardalo como datos/youtube-miembros.csv
    # 2. Twitch -> Creator Dashboard -> lista de subs
    #    guardalo como datos/twitch-subs.csv
    npm run importar

Eso escribe `public/snapshot.json`, que es lo unico que lee la pagina, y actualiza
`datos/asignaciones.json`.

### datos/asignaciones.json

El registro de quien recibio que Pokemon y en que casa vive. **Nunca se vuelve a
sortear**: quien ya tiene su Pokemon lo conserva, aunque se de de baja y vuelva
meses despues. Los que se fueron quedan guardados por si regresan.

Tambien es donde concedes un cambio. Alguien te pide otro Pokemon: le cambias el
numero de `especie`, corres el importador de nuevo y listo. No hace falta panel de
administracion.

### datos/excluidos.json

Quienes aparecen en los CSV pero no viven en el Rancho: los bots del canal y vos
mismo, que ya caminas por el mapa como Guti.

## Parametros de URL

| | |
|---|---|
| `?mock=N` | habitantes inventados en vez del snapshot real (tope 5000) |
| `?u=nombre` | abrir el rancho sobre ese habitante |
| `?debug=1` | contador de habitantes, visibles, FPS, chunks y especies |

## Como esta armado

- `datos/` — los CSV que bajas, el registro de asignaciones y los excluidos.
- `scripts/importar.ts` — convierte los CSV en el snapshot.
- `src/ranch/` — el rancho: dominio, mapa, arte, render y la capa Vue.
  - `domain/` — miembros, especies, zonas, antiguedad, busqueda.
  - `world/` — el mapa disenado, los slots, los habitantes, Guti y Sky.
  - `render/` — camara cenital, suelo horneado, escenografia, carteles, escena.
  - `art/` — todo el arte dibujado en codigo.
  - `components/` — buscador y ficha.
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
