# CHEMVERSE — Interactive Chemistry Laboratory

CHEMVERSE is a browser-based 3D chemistry laboratory. The environment is a rectangular, open-front laboratory with six experiment stations and a first-person player view.

## Current environment

- Rectangular laboratory room with six workbenches in two columns and three rows.
- First-person movement with mouse-look, walking, sprinting and acceleration/deceleration.
- Player collision uses a circular capsule footprint, rounded bench-corner checks and sub-stepped movement to reduce tunnelling.
- The player slides along obstacles, with the blocked movement axis losing velocity instead of pushing the camera through geometry.
- Beakers, flasks, test tubes, reagent bottles, microscopes and burners.
- Storage cabinetry, shelves, safety point, windows and overhead lighting.
- Aim at a workbench from within 7.5 world units and press E, or click while the pointer is locked, to inspect it. Station 03 opens the **Microscopy & Materials Lab** (`microscope.html`) from its physical microscope. Station 05 opens the **Reaction Mixing Lab** and station 06 opens **REACTION 001 — Molecular Reaction Simulation**. The E key is detected independently of the active keyboard language. Stations 01, 02 and 04 keep their existing inspection behavior.

## Run locally

The scene uses native browser ES modules and loads Three.js through an import map. Serve the project through a local HTTP server rather than opening index.html directly.

For example, with Python installed, run: **python -m http.server 8000**

Then open **http://localhost:8000**.

A desktop browser with WebGL and Pointer Lock support is recommended. An internet connection is currently required for the Three.js CDN and external fonts.

## Controls

- **W / A / S / D** or arrow keys: move.
- **Mouse**: look around.
- **Shift**: sprint.
- **E**: interact with the workbench at the centre reticle; station 03 opens the Microscope Lab, station 05 opens the Reaction Mixing Lab and station 06 opens REACTION 001.
- **Left click** while playing: inspect the workbench at the centre reticle.
- **Esc**: release the mouse and pause; click Resume to return.

## Project structure

- **index.html** — application shell, first-person HUD and import map.
- **styles.css** — responsive interface styling.
- **src/main.js** — Three.js room, furniture, equipment, first-person movement, player collision and interaction logic.

## Reaction Mixing Lab — station 05

The eight-bottle rack is a qualitative teaching sandbox: diluted vinegar, sodium bicarbonate, citric acid, red-cabbage indicator, salt solution, sugar solution, sodium carbonate, and calcium chloride. Select two bottles. The simulator animates each virtual bottle pouring into the vessel, then illustrates vigorous CO₂ bubbling, a rising foam plume, spray droplets and a brief light pulse for gas-producing acid–carbonate pairs. Indicator solutions show a swirling colour transition, while calcium carbonate appears as a cloudy white precipitate whose particles settle. The foam burst is a contained visualisation of gas release, not a detonation. All 28 unique two-bottle combinations now use a real-time Canvas particle renderer with rising gas bubbles, moving foam cells, ballistic liquid droplets, rotating flow filaments, suspended pigment clouds and settling precipitate. Acid–carbonate pairs show the strongest CO₂ foam release; precipitating mixtures form a cloudy particle field; indicator pairs show swirling colour blooms; and mixtures without a visible chemical reaction use a physical liquid vortex without invented gas. The vortex and droplets in non-reactive mixtures depict physical fluid movement only; they do not imply gas formation or a new chemical product. These effects are illustrative particle dynamics, not computational fluid dynamics or a measured reaction prediction. Each outcome includes a representative balanced equation, a scientific explanation, and an observation guide. The visual effects are not measured physical predictions. The model does not calculate poured volumes, concentrations, exact pH, reaction rate, gas volume, or product yield, and it is not a real-world mixing guide. The page is `mixing.html`; chemistry classification and tests are in `src/reagent-mixer.mjs` and `tests/reagent-mixer.test.mjs`.


## Microscopy & Materials Lab — station 03

- The physical microscope is placed on workbench 03. Aim at station 03 from within interaction range and press **E** to open `microscope.html`.
- Choose among a visible-light microscope, SEM, TEM, AFM and STM. The specimen list changes to show only samples compatible with the selected imaging technique.
- Optical examples include NaCl cubes, sucrose crystals, blue copper sulfate crystals, iodine microcrystals, barium sulfate precipitate, oil-in-water droplets, cellulose fibres and insoluble powder grains.
- Advanced examples include gold, silver and titanium dioxide nanoparticles, carbon nanotube networks, graphene/graphitic surfaces, porous catalyst surfaces and a graphite atomic-lattice signal map.
- Adjust the objective/scan preset, focus and illumination/gain. The viewer includes a scale bar and technique-specific observation notes.
- The optical-mode note describes the approximately 0.2 µm best-case diffraction limit; practical performance varies with wavelength, numerical aperture, contrast and specimen preparation. Zooming does not overcome this limit.
- SEM is a grayscale surface-imaging method; TEM uses electrons transmitted through a suitably thin specimen; AFM maps probe-based surface topography; STM maps tunnelling current and requires a suitable conductive surface.
- The microscopy fields are procedurally rendered scientific illustrations, not captured micrographs, atom photographs, measured particle-size distributions or validated experimental data. AFM/STM atomic-scale patterns represent instrument signals rather than ordinary photographs.

The specimen catalogue and method compatibility are in `src/microscope-samples.mjs`; the interactive canvas viewer is in `src/microscope-lab.js`; compatibility tests are in `tests/microscope-samples.test.mjs`.

## Molecular simulator — first experiment

- Open **Molecular Simulator** from the laboratory header or visit **simulation.html**.
- Station 04 contains 19 balanced educational reactions across six reaction classes, with reactant/product physical states and net ionic equations where applicable.
- The 3D ball-and-stick view shows the reactants, the proton-transfer intermediate (acetate + carbonic acid), and the products (sodium acetate, water and carbon dioxide).
- Orbit the model with the mouse, zoom with the wheel, play/pause, reset, scrub the timeline, move to the previous/next mechanism checkpoint, inspect the C++ event bond-change records, change playback speed and adjust the illustrative temperature setting. Pressing **Start** automatically opens the molecular view in fullscreen; use the fullscreen control or **Esc** to return.
- The element inventory is checked on both sides of every catalogue equation; molecule models include single, double, triple, resonance-style and dashed ionic associations where represented.
- A C++ / WebAssembly core computes reaction extent, the limiting reagent, remaining reactants, product millimoles and an atom-conservation check from the selected initial millimole amounts.
- The default inputs are 10 mmol acetic acid and 8 mmol sodium bicarbonate; at full conversion the bicarbonate is limiting, 2 mmol acetic acid remains and 8 mmol of each product is calculated.
- With supplied k, experimental orders, solution volume, and a documented parameter source, the concentration curve and quantitative readouts follow the integrated C++ kinetic model. The three molecular presentation stages always advance by elapsed presentation time (one third of the selected duration per stage), regardless of the conversion reached by the kinetic model. This separation is intentional: the displayed proton-transfer and product-formation scenes illustrate a reaction pathway and are not independently calculated elementary steps. Kinetic curves and quantitative readouts continue to report the actual modeled conversion. Without valid kinetic inputs, quantitative kinetic values remain unavailable. Temperature changes k only when an activation energy and reference temperature are supplied for the Arrhenius correction; otherwise it affects only schematic vibration.
- Station 04 uses ball-and-stick representations with atom sizes, coordinates and bond patterns intended for teaching. Its cross-fade between reactant and product assemblies is a schematic sequence, not atom-mapped molecular dynamics, quantum chemistry, or an experimentally measured reaction trajectory.

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

## Lab 04 atom-mapped reaction-coordinate engine

Station 04 now loads a separate C++17 / WebAssembly engine for the aqueous strong-acid / strong-base neutralization example:

- **cpp/lab04_atom_engine.h / cpp/lab04_atom_engine.cpp** — bounded C ABI for stable atom IDs, per-atom start/transition/final coordinates, and per-bond start/transition/final bond orders.
- **src/lab04-atom-engine.mjs** — explicit atom map for H₃O⁺ + OH⁻ → 2H₂O. It retains Na⁺ and Cl⁻ as spectator ions and transfers the same mapped hydrogen from one oxygen to the other.
- **wasm/lab04_atom_engine.wasm** — browser module loaded by Station 04; each animation frame samples C++ atom coordinates and bond orders for the Three.js renderer.
- **tests/lab04_atom_engine_test.cpp** and **tests/lab04-atom-engine.test.mjs** — native and JavaScript checks for atom identity, elemental inventory, finite keyframes, and O–H bond changes.

The engine is intentionally described as an **atom-mapped, keyframed reaction-coordinate visualization**. Coordinates are explanatory keyframes and intermediate bond orders are interpolated for display. This is not molecular dynamics, a quantum-chemical calculation, a force-field simulation, or a measured kinetic trajectory. The strong-acid/strong-base aqueous equation and the definition of a reaction mechanism are linked in the Station 04 interface to OpenStax and the IUPAC Gold Book.

Build/test commands remain **bash scripts/test-native.sh** and **bash scripts/build-wasm.sh**.

## Microscope Lab 03 — electron transport and AFM interaction engines

The microscope page includes two separate C++17 engines compiled to WebAssembly. The workbench loads them when SEM/TEM or AFM mode is selected.

### SEM / TEM electron transport

- `cpp/electron_transport.cpp` uses a seeded Monte Carlo history for each primary electron. It samples screened-Rutherford-like elastic angular scattering, a continuous energy-loss approximation based on the Kanaya–Okayama projected range, and a simplified near-surface secondary-electron escape event.
- The run reports backscattered, transmitted and absorbed primary counts; secondary yield; depth-binned deposited energy; selected trajectory histories; and an energy-closure residual. Tests cover reproducibility, material trends, thickness/energy trends and energy conservation.
- Default examples are 15 keV / 500 nm for SEM and 200 keV / 80 nm for TEM. Controls let the user change energy, thickness, primary count and beam tilt. Material values in `src/microscope-physics.mjs` are homogeneous effective inputs for teaching comparisons.
- This is not a full electron-cascade or detector simulation. It does not solve detailed dielectric response, plasmon/phonon transport, electron-wave coherence, charging, column optics or detector geometry. Secondary electrons are counted and assigned energy; a full secondary cascade is not tracked. Displayed trajectories are selected primary histories, not captured micrographs.

### AFM tip–sample interaction

- `cpp/afm_interaction.cpp` integrates a driven, damped single-cantilever oscillator in tapping mode. A per-pixel amplitude-feedback loop adjusts the piezo position; the solver returns topography, cantilever deflection, peak interaction force, oscillation amplitude and phase.
- The interaction model combines a softened non-contact van der Waals attraction with DMT/Hertz contact repulsion and adhesion. Contact mode solves an approximate Hertz/DMT indentation for a requested force setpoint.
- The browser builds a deterministic height field from the selected specimen dimensions and scan width, uploads it to WASM, and displays recovered topography or signal channels. The separate tip-trace view animates the cantilever over the solved sample profile.
- This is a single-asperity continuum teaching model, not atomistic AFM. It assumes effective homogeneous Young's modulus, Poisson ratio, Hamaker constant and tip radius. It omits full 3-D viscoelasticity, multiple cantilever modes, lateral friction, thermal noise, feedback electronics, tip wear, chemical bonding and sample damage.

### Rebuild and verify

Run `bash scripts/test-native.sh` for the native C++ suite and `bash scripts/build-wasm.sh` to build all WebAssembly modules. GitHub Actions validates electron energy balance and AFM force/topography outputs, then publishes `wasm/electron_transport.wasm` and `wasm/afm_interaction.wasm` to the development branch. The microscope browser loader expects both files under `./wasm/`.

## AgCl precipitation — Lab 04 atom-resolved stage

- The atom-map uses 4 formula units: **4AgNO3(aq) + 4NaCl(aq) → 4AgCl(s) + 4NaNO3(aq)**. Its 28 mapped atoms conserve Ag4, Cl4, Na4, N4 and O12. Na+ and nitrate remain spectator species in the aqueous phase.
- The visual model keeps nitrate N–O connectivity as a resonance-averaged order of 4/3. Four alternating Ag+/Cl− ions form an initial square face; the other mapped ions then join a finite alternating ionic cluster. It is a small teaching nucleus, not a complete crystal lattice. Solvent water is not explicitly drawn.
- At 25 °C, the interface uses `Ksp(AgCl) = 1.6 × 10⁻¹⁰ M²`. It calculates `Qsp = [Ag⁺][Cl⁻]` from entered moles and the final mixture volume, and allows the cluster keyframes only when `Qsp > Ksp`. Concentrations are used as the dilute-solution approximation to activities. This gate indicates the thermodynamic precipitation condition; it does not calculate the final equilibrium mass, nucleation barrier, activity coefficients, or crystal-growth kinetics.
- Reference: OpenStax, *Chemistry*, section 15.1, “Precipitation and Dissolution”.

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

## Experimental data import and initial-rate fitting — v1

The simulator can import an initial-rate CSV and estimate the empirical rate law using the C++ fitting engine compiled to WebAssembly.

Required CSV columns (case-insensitive):

```csv
experiment_id,temperature_c,concentration_a_mol_l,concentration_b_mol_l,initial_rate_mol_l_s
```

- Concentrations must be positive values in mol/L (M).
- Initial rates must be positive values in mol/L/s (M/s), measured or calculated by the experimenter using a consistent reaction-rate definition.
- Every experiment in one fit must have the same temperature in °C. Fit separate datasets for separate temperatures.
- At least four experiments are required. Both initial concentrations must vary independently enough to identify both empirical orders.
- The browser validates the CSV structure and values; the C++ engine then fits `ln(rate) = ln(k) + m ln([A]0) + n ln([B]0)` using centered modified Gram-Schmidt least squares.
- Results include `k`, `m`, `n`, `R²`, log-rate RMSE, and estimated standard errors. The regression diagnostics are calculated in log-rate space.
- Use **Apply fitted parameters** to copy the estimated `k`, `m`, `n`, and the dataset temperature into the simulator. The fit is performed at that temperature; a single-temperature dataset cannot determine activation energy.
- CSV files are limited to 2 MB and 256 experiments in the current browser implementation.

This module implements the method of initial rates. It does not perform Arrhenius fitting across temperatures or independently verify experimental provenance, instrument calibration, or measurement methods. A high `R²` alone does not prove that the assumed power-law model or a proposed reaction mechanism is chemically correct. The estimated standard errors describe the regression under its assumptions and do not include systematic experimental uncertainty.

The fitting ABI and native tests are in `cpp/experimental_fit.h`, `cpp/experimental_fit.cpp`, and `tests/experimental_fit_test.cpp`. CSV parsing and browser tests are in `src/experimental-data.mjs` and `tests/experimental-data.test.mjs`. The browser module is `wasm/experimental_fit.wasm`, built by `scripts/build-wasm.sh`.



## Atom-mapped reaction mechanism engine — v1

The molecular view now uses a dedicated C++ atom-mapping engine instead of fading between separate, duplicated molecule meshes.

- \`cpp/reaction_mechanism.h\` / \`cpp/reaction_mechanism.cpp\` define a stable map of 14 atoms for \`CH3COOH + NaHCO3\`.
- Each atom has a persistent numeric ID and element identity. The map contains C₃H₅NaO₅ and is checked by \`cv_mechanism_validate()\`.
- The engine samples continuous atom coordinates and bond orders for three presentation states: reactants, acetate + carbonic acid, and acetate + water + carbon dioxide.
- The acid proton keeps one identity as it leaves the acetic-acid oxygen, attaches to the bicarbonate oxygen, and then moves to the second carbonic-acid oxygen to form water.
- Covalent bond records persist through the sequence while their bond order changes. Sodium associations are drawn as dashed ionic contacts, not covalent bonds.
- Click an atom in the 3D view to highlight it. The mechanism timeline reports the programmed bond-order changes for proton transfer and carbonic-acid decomposition.

The acetate carboxylate is drawn using one conventional localized resonance form for readability; the drawing does not imply that the two C–O bonds are physically fixed as single and double bonds. The sodium–acetate dashed line is a schematic ion association, not a claim of a fixed contact pair in solution.

This v1 is an **atom-mapped, scripted mechanism visualization and bond-bookkeeping engine**. The C++ module verifies atom identity, element counts, bond endpoints, and the programmed order changes. Its interpolated coordinates are visual keyframes, not calculated reaction coordinates or molecular-dynamics trajectories. It does not calculate transition states, activation barriers, solvent effects, proton-transfer energetics, or quantum-mechanical electron density. Those require separate validated physical models and suitable input data.

Native coverage is in \`tests/reaction_mechanism_test.cpp\`; the browser module is \`wasm/reaction_mechanism.wasm\`, built through \`scripts/build-wasm.sh\` and published by the chemistry GitHub Actions workflow.

## Concentration-time analyzer — v1

The simulator can now derive initial rates from raw concentration-versus-time measurements before estimating the empirical rate law.

Required CSV columns (case-insensitive):

```csv
experiment_id,time_s,temperature_c,concentration_a_mol_l,concentration_b_mol_l
```

- Each experiment ID groups one time series. Provide at least four independent experiments, with at least three readings per experiment.
- Time is non-negative and measured in seconds. Concentrations must be positive and measured in mol/L (M).
- All experiments in one file must use the same temperature. Analyze different temperatures in separate files.
- Rows may be interleaved; the browser groups samples by experiment and sorts them by time. Duplicate time points within an experiment are rejected.
- CSV files are limited to 2 MB, 64 experiments, and 64 readings per experiment in this version.
- Select the number of early readings (3 through the smallest available series length). The C++/WebAssembly engine applies ordinary least squares separately to [A](t) and [B](t), returning both slopes, intercepts, R² values, and RMSE values.
- Disappearance rates are calculated as `rate_A = -d[A]/dt` and `rate_B = -d[B]/dt`. Because this experiment is represented as a 1:1 reaction, the browser compares the two rates. The default maximum relative disagreement is 20% and can be adjusted; if the measured rates exceed the selected tolerance, the analyzer shows the diagnostics and stops instead of silently averaging them.
- When the rates pass the consistency check, their mean is passed to the existing initial-rate fitter together with the first measured concentrations for each experiment. The resulting `k`, `m`, and `n` can then be applied to the simulator.
- If a time series starts after zero, time is shifted to its first sample for the line fit and the interface warns that delayed acquisition can make the slope less representative of the true initial rate. Start recording as close as possible to mixing.

This is a linear-window estimate, not a full nonlinear fit of the complete concentration-time profile. Inspect the per-species R² values, the selected early-time window, and agreement between both reactants before relying on the derived initial rates. The analyzer does not correct sensor drift, mixing delay, side reactions, or systematic measurement errors.

The C++ ABI and native regression tests are in `cpp/concentration_fit.h`, `cpp/concentration_fit.cpp`, and `tests/concentration_fit_test.cpp`. CSV grouping and validation are in `src/concentration-data.mjs` and `tests/concentration-data.test.mjs`. The browser module is `wasm/concentration_fit.wasm`, built by `scripts/build-wasm.sh`.


## Mechanism timeline and step controller — v1

The molecular view now exposes three presentation checkpoints (reactants, the proton-transfer intermediate, and products) with previous/next controls. A checkpoint move pauses playback and seeks the existing presentation clock; the continuous time slider and normal playback remain available.

The C++ mechanism ABI publishes two event records. Each record provides its progress checkpoint and the indexed bond changes with before/after bond orders. Native tests verify that these event records match the corresponding sampled C++ keyframes; the browser validates the metadata before rendering the event inspector. Ionic associations are explicitly marked as such, and the acetate structure uses the same localized resonance drawing documented above.

The event timeline is an inspection of the scripted atom-map and keyframe bookkeeping. Its checkpoint positions are presentation coordinates, not measured reaction times. The event list does not establish an experimentally verified elementary mechanism, rate-limiting step, transition state, or molecular trajectory.


## Hands-on optical microscope workflow

Station 03 includes manual slide preparation: clean the slide, add mounting medium only for wet-mount specimens, pick and transfer the sample, lower a coverslip, and mount the slide on the stage. The dry crystal and powder examples do not receive an unnecessary liquid-medium step. The optical instrument includes a rotatable 3D model, eye-level viewing transition, revolving 4× / 10× / 40× objectives, movable stage, fine focus and adjustable illumination. The eyepiece view is unlocked only after the slide is mounted. SEM, TEM, AFM and STM remain separate educational imaging methods with their own sample-preparation requirements; the optical slide sequence does not claim to prepare samples for those instruments.

The instrument and slide handling are interactive visual training aids. The specimen fields remain procedural educational illustrations, not captured micrographs or measured experimental results. Optical magnification does not overcome the conventional optical resolving limit (approximately 0.2 µm under ideal conditions).


## Elements, compounds & reactions lab — station 04

Station 04 opens `compounds.html`, a separate educational reaction explorer. It contains twelve balanced examples across synthesis, decomposition, displacement, precipitation, neutralisation, combustion and oxidation. The material library includes fourteen element references and molecular/ionic formula models. The simulator checks atom conservation from stored formulae, renders schematic ball-and-stick reactants and products in Three.js, and calculates ideal stoichiometric extent, limiting reactant, remaining reactants and theoretical products from user-entered initial moles. These amount calculations are based on balanced equations only; they do not predict reaction rate, equilibrium, actual yield, temperature change or molecular dynamics. The 3D rearrangement is an educational visualisation, not a measured trajectory or a quantum-chemical calculation.


## Electron transport and AFM tip–sample physics — station 03

Station 03 contains two independent C++17 engines compiled to WebAssembly. The microscope UI loads them only when the corresponding imaging technique is selected.

### SEM / TEM electron transport

- `cpp/electron_transport.h` / `cpp/electron_transport.cpp` implement deterministic-seed Monte Carlo histories for primary electrons entering a homogeneous specimen slab.
- Inputs are the material's effective atomic number, atomic mass and density, accelerating voltage (keV), specimen thickness (nm), beam incidence angle (degrees), number of primary-electron histories, random seed, recorded track count and collision limit.
- Each primary history advances through screened-Rutherford angular scattering and a continuous energy-loss approximation based on a Kanaya–Okayama range estimate. The model classifies primary electrons as backscattered, transmitted or absorbed and includes a simplified near-surface secondary-electron yield.
- The result reports BSE and transmitted fractions, secondary-electron yield/count, deposited and escaped energy, mean penetration depth, collision statistics, a depth histogram and selected individual primary trajectories. The energy ledger is checked against the incident energy for every run.
- SEM and TEM use different default beam energies and sample thicknesses, but the controls can be adjusted. The displayed trajectories are a deterministic sample of the Monte Carlo histories; they are not every simulated electron.

The transport calculation is an educational, homogeneous-material Monte Carlo approximation. It does **not** yet solve a complete electron cascade, explicit dielectric-loss spectrum, phonon/plasmon generation, space-charge effects, crystal channeling, charging, detailed surface chemistry, or a calibrated secondary/backscatter detector response. The material table uses effective elemental/composition inputs rather than a full compound-mixture transport database. In particular, a particle trajectory and an energy-conservation check do not by themselves validate a real instrument's image contrast.

### AFM cantilever and tip–sample interaction

- `cpp/afm_interaction.h` / `cpp/afm_interaction.cpp` accept a sampled surface-height map (nm), scan width (nm), cantilever free amplitude (nm), amplitude setpoint, spring constant (N/m), resonance frequency (kHz), quality factor, tip radius (nm), effective sample Young's modulus (GPa), Poisson ratio, adhesion energy (mJ/m²), Hamaker constant (J), and contact-force setpoint (nN).
- Tapping mode integrates a driven, damped single-cantilever equation of motion with a fourth-order Runge–Kutta scheme. A per-pixel amplitude-feedback controller adjusts the piezo height toward the selected amplitude ratio.
- Contact mode computes an effective Hertz/DMT contact indentation and the piezo position needed to maintain the requested normal-force setpoint.
- The tip–sample force model includes a long-range van der Waals attraction, short-range adhesion and a repulsive Hertzian contact term using the effective elastic modulus. The numerical solver caps the Hertz contribution at 120 nN to keep the educational integration bounded.
- Each scan pixel records feedback topography, cantilever deflection, peak interaction force, oscillation amplitude, phase and feedback-iteration count. The interface can display the resulting topography, deflection, force or amplitude channel and animate a tip trace across the measured synthetic scan.

The AFM surface generator creates repeatable synthetic height fields from the specimen category, dimensions and a seed. It does not claim to reconstruct an actual measured surface. The cantilever model is a continuum, single-asperity approximation: it does **not** calculate atomistic chemical bonding, full three-dimensional elastic deformation, viscoelasticity, capillary forces, tip wear, probe contamination, thermal drift, instrument noise or a complete multi-mode cantilever. Contact-mode force control is quasi-static; tapping mode is the dynamic oscillator/feedback model. The displayed material parameters are educational effective values and should be replaced with sample- and environment-specific measurements for quantitative research.

### Source files and validation

- `src/microscope-physics.mjs` loads the two WASM modules, supplies specimen-dependent effective material inputs, generates deterministic AFM height maps and decodes the fixed C ABI output layouts.
- `wasm/electron_transport.wasm` and `wasm/afm_interaction.wasm` are the browser modules built by `scripts/build-wasm.sh`.
- `tests/electron_transport_test.cpp` checks reproducibility, outcome accounting, energy closure, material-Z backscatter trends, thickness-dependent transmission and beam-energy penetration trends.
- `tests/afm_interaction_test.cpp` checks finite output, step-height recovery, contact-force setpoint, elastic-stiffness and adhesion trends, amplitude-setpoint stability and bounded indentation.
- `tests/microscope-physics.test.mjs` checks the JavaScript/WASM memory interface, specimen material presets, deterministic surface generation and the returned data channels.
- GitHub Actions builds both WASM modules, runs native C++ and JavaScript tests, validates the WebAssembly exports and smoke-tests energy conservation and AFM force/topography recovery.

Run `bash scripts/test-native.sh` for the native C++ suite and `bash scripts/build-wasm.sh` to build the browser modules with Clang's wasm32 target. The GitHub Actions workflow publishes the validated WASM binaries to the development branch.

