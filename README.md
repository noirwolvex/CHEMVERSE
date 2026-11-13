# CHEMVERSE — Interactive Chemistry Laboratory

CHEMVERSE is a browser-based 3D chemistry laboratory. The environment is a rectangular, open-front laboratory with six experiment stations and a first-person player view.

## Current environment

- Rectangular laboratory room with six workbenches in two columns and three rows.
- First-person movement with mouse-look, walking, sprinting and acceleration/deceleration.
- Player collision uses a circular capsule footprint, rounded bench-corner checks and sub-stepped movement to reduce tunnelling.
- The player slides along obstacles, with the blocked movement axis losing velocity instead of pushing the camera through geometry.
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
- **src/main.js** — Three.js room, furniture, equipment, first-person movement, player collision and interaction logic.

## Molecular simulator — first experiment

- Open **Molecular Simulator** from the laboratory header or visit **simulation.html**.
- The first educational model demonstrates the balanced reaction: CH3COOH + NaHCO3 → CH3COONa + H2O + CO2.
- The 3D ball-and-stick view shows the reactants, the proton-transfer intermediate (acetate + carbonic acid), and the products (sodium acetate, water and carbon dioxide).
- Orbit the model with the mouse, zoom with the wheel, play/pause, reset, scrub the timeline, change playback speed and adjust the illustrative temperature setting.
- The atom inventory is balanced: C3 H5 Na1 O5 on both sides.
- A C++ / WebAssembly core computes reaction extent, the limiting reagent, remaining reactants, product millimoles and an atom-conservation check from the selected initial millimole amounts.
- The default inputs are 10 mmol acetic acid and 8 mmol sodium bicarbonate; at full conversion the bicarbonate is limiting, 2 mmol acetic acid remains and 8 mmol of each product is calculated.
- With supplied k, experimental orders, solution volume, and a documented parameter source, the time slider follows the integrated C++ kinetic curve. Without valid kinetic inputs, the simulator offers an 18-second visual-only sequence: reactants approach (stage 01), acetate and carbonic acid appear during proton transfer (stage 02), then sodium acetate, water, and carbon dioxide appear (stage 03). This visual sequence is not a kinetic calculation; quantitative readouts remain unavailable until valid kinetic data is entered. Temperature changes k only when an activation energy and reference temperature are supplied for the Arrhenius correction; otherwise it affects only schematic vibration.
- Atom sizes, bond lengths, molecular arrangement and transition timing remain schematic. This is not molecular dynamics or quantum chemistry.

## Next development stage

Extend the validated reaction catalogue, add experimentally sourced kinetics and concentration models, then integrate the C++ / WebAssembly chemistry core and an AI explanation assistant that uses the simulation's actual data.


## C++ / WebAssembly chemistry core

- **cpp/chemistry_core.cpp** — stoichiometry, limiting-reagent calculation and atom-conservation validation.
- **cpp/chemistry_core.h** — stable C ABI result structure consumed by JavaScript.
- **wasm/chemistry_core.wasm** — browser-loadable WebAssembly module used by the simulator.
- **tests/chemistry_core_test.cpp** — native tests for balanced inputs, limiting reagents, partial conversion and invalid input.
- **scripts/test-native.sh** — run the C++ test suite with g++.
- **scripts/build-wasm.sh** — compile the core with Clang for wasm32.
- **.github/workflows/chemistry-core.yml** — run native tests and validate WebAssembly exports on GitHub Actions.

Run the native test suite from the repository root with **bash scripts/test-native.sh** (Git Bash or WSL), or compile the source and test file with a local C++17 compiler. Build WebAssembly with **bash scripts/build-wasm.sh** and Clang's wasm32 target. The committed .wasm file is included for static browser use.

## Reaction kinetics engine — v1

The C++ kinetics module is separate from the existing stoichiometry calculator:

- `cpp/kinetics_engine.h` / `cpp/kinetics_engine.cpp` expose a stable C ABI for native and WebAssembly use.
- The v1 model is a constant-volume, well-mixed liquid reaction with 1:1 extent and the empirical rate law `r = k(T)[A]^m[B]^n`.
- Initial amounts (mmol) and solution volume (mL) are converted to molar concentrations. A Runge–Kutta 4 integrator with adaptive step-size control generates the time series.
- The optional Arrhenius correction uses `k(T) = k(Tref) exp[-Ea/R (1/T - 1/Tref)]`. It is enabled only when activation energy is supplied. Without Ea, temperature does not change the calculated rate constant.
- Kinetic orders are independent experimental inputs. They are not inferred from the balanced chemical equation. The rate-constant units must match the selected overall order.
- The interface intentionally leaves `k`, `m`, and `n` blank until experimentally sourced values are available. It does not invent reaction-specific kinetic data. A non-empty source field is a user-entered provenance note only: the application does not automatically verify the DOI/URL, the publication contents, or whether its conditions match the entered parameters.

The model currently assumes a homogeneous liquid phase, fixed volume, and a single 1:1 reaction extent. It does not yet simulate gas–liquid CO2 transfer, acid/base equilibria, ionic-strength effects, the full elementary reaction mechanism, or molecular dynamics. Molecule motion remains an illustrative visualization driven by the calculated conversion, not an atomistic simulation.

Run `bash scripts/test-native.sh` to test both C++ engines. Run `bash scripts/build-wasm.sh` to build the combined browser module. The GitHub Actions workflow validates the native tests, JavaScript syntax, WebAssembly exports, and a deterministic kinetics smoke test.
