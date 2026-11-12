# CHEMVERSE — Interactive Chemistry Laboratory

CHEMVERSE is a browser-based 3D chemistry laboratory prototype. The first environment is a rectangular, open-front laboratory with six clearly separated experiment stations.

## Current environment

- Rectangular laboratory room with a wide, readable floor plan.
- Six workbenches arranged in two columns and three rows.
- Individual station selection with a small information panel.
- Beakers, flasks, test tubes, reagent bottles, microscopes and burners.
- Storage cabinetry, shelves, safety point, windows and overhead lighting.
- Orbit camera with rotation, zoom, reset and top-view controls.
- Responsive interface for desktop and smaller screens.

## Run locally

The scene uses native browser ES modules and loads Three.js through an import map. Serve the project through a local HTTP server rather than opening index.html directly.

For example, with Python installed, run: **python -m http.server 8000**

Then open **http://localhost:8000**.

## Controls

- Drag: rotate the camera.
- Mouse wheel / trackpad: zoom.
- Click a workbench: inspect its station information.
- Reset button: restore the default camera.
- Top-view button: switch to a plan view.

## Project structure

- **index.html** — application shell and import map.
- **styles.css** — responsive interface styling.
- **src/main.js** — Three.js room, furniture, equipment, camera and interactions.

## Next development stage

The current commit establishes the laboratory environment and station interaction. The next stage can add student movement, experiment objectives, draggable lab equipment, safe experiment logic, scoring and a C++ / WebAssembly simulation core.
