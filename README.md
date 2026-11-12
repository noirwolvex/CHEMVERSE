# CHEMVERSE — Interactive Chemistry Laboratory

CHEMVERSE is a browser-based 3D chemistry laboratory. The environment is a rectangular, open-front laboratory with six experiment stations and a first-person player view.

## Current environment

- Rectangular laboratory room with a wide, readable floor plan.
- Six workbenches arranged in two columns and three rows.
- First-person movement with mouse-look and keyboard controls.
- One visible right hand wearing a laboratory glove, with a short lab-coat cuff.
- No visible player head, torso, legs or full body.
- Walking hand-bob and sprint movement.
- Collision boundaries around the walls, workbenches, stools and rear storage.
- Beakers, flasks, test tubes, reagent bottles, microscopes and burners.
- Storage cabinetry, shelves, safety point, windows and overhead lighting.
- Aim at a workbench and press E, or click while the pointer is locked, to inspect it.

## Run locally

The scene uses native browser ES modules and loads Three.js through an import map. Serve the project through a local HTTP server rather than opening index.html directly.

For example, with Python installed, run: **python -m http.server 8000**

Then open **http://localhost:8000**.

A desktop browser with WebGL and Pointer Lock support is recommended. An internet connection is currently required for the Three.js CDN and external fonts.

## Controls

- **W / A / S / D** or arrow keys: move.
- **Mouse**: look around.
- **Shift**: sprint.
- **E**: inspect the workbench at the centre reticle.
- **Left click** while playing: inspect the workbench at the centre reticle.
- **Esc**: release the mouse and pause; click Resume to return.

## Project structure

- **index.html** — application shell, first-person HUD and import map.
- **styles.css** — responsive interface styling.
- **src/main.js** — Three.js room, furniture, equipment, player hand, movement, collisions and interactions.

## Next development stage

The next stage can add hand interaction animations, object pickup and placement, experiment objectives, safe experiment logic, scoring and a C++ / WebAssembly chemistry simulation core.
