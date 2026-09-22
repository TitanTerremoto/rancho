# Rancho Pokemon

Un rancho visto desde arriba donde vive un Pokemon por cada suscriptor de Twitch y
cada miembro de YouTube. Entras, buscas tu nombre y descubris cual te toco.

    npm install
    npm run dev     # http://localhost:5173/

## Estado: RANCH-1, prototipo visual

Todos los habitantes son **inventados**. No hay Supabase, ni API de Twitch o YouTube,
ni CSV, ni backend. La ficha lo aclara y la pagina va con `noindex`.

## Parametros de URL

| | |
|---|---|
| `?mock=N` | cuantos habitantes generar (por defecto 100, tope 5000) |
| `?u=nombre` | abrir el rancho sobre ese habitante |
| `?debug=1` | contador de habitantes, visibles, FPS, chunks y especies |

## Como esta armado

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
