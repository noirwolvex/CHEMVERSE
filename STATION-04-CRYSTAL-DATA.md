# Station 04 — crystallographic reference data and model scope

This note records the crystallographic inputs used by `cpp/crystal_engine.cpp`.
Coordinates are fractional coordinates in the conventional unit cell unless noted
otherwise. The renderer repeats that cell in a small finite supercell; this is a
structure visualization, not a molecular-dynamics or crystal-growth calculation.

## Structures currently represented

| Reaction | Displayed solid | Structure | Space group | Cell / Å | Sites in conventional cell |
|---|---|---|---:|---|---:|
| 02 | MgO | Rock-salt | Fm-3m (225) | a=b=c=4.213 | 4 Mg + 4 O |
| 04 | Cu | Face-centred cubic | Fm-3m (225) | a=b=c=3.6147 | 4 Cu |
| 05 | AgCl | Rock-salt | Fm-3m (225) | a=b=c=5.5491 | 4 Ag + 4 Cl |
| 08 | CaO | Rock-salt | Fm-3m (225) | a=b=c=4.8105 | 4 Ca + 4 O |
| 12 | BaSO4 | Barite, orthorhombic | Pnma (62) | a=8.884, b=5.458, c=7.153 | 4 Ba + 4 S + 16 O |

The MgO and CaO rock-salt structures use the standard fcc anion basis and
four octahedral cation sites. AgCl uses the same topology. Copper uses the
four-site fcc conventional-cell basis. Barite is expanded from one asymmetric
unit using the Pnma symmetry operations; the resulting conventional cell has
Z=4 (24 atoms).

## Data references

- AgCl rock-salt structure and lattice parameter: NIST / National Bureau of
  Standards, *Standard X-ray Diffraction Powder Patterns*:
  https://www.govinfo.gov/content/pkg/GOVPUB-C13-ea820f58bfa0fbf67e79ae1ebca44ce4/pdf/GOVPUB-C13-ea820f58bfa0fbf67e79ae1ebca44ce4.pdf
- Barite unit-cell dimensions and fractional asymmetric-unit coordinates:
  University of Wisconsin soil-science mineral data:
  https://soilsfacstaff.cals.wisc.edu/facstaff/barak/virtual_museum/barite/barite_data.html
- Pnma (No. 62) symmetry setting and general positions:
  International Tables for Crystallography, space-group data:
  https://onlinelibrary.wiley.com/iucr/itc/Ac/ch2o3v0001/sgtable2o3o062/
- Copper fcc crystal structure and lattice data:
  Copper Development Association, physical properties:
  https://archive.copper.org/resources/properties/atomic_properties.php
- MgO and CaO rock-salt lattice parameters:
  Rutgers University, *Glasses and Ceramics* lecture reference:
  https://glass.rutgers.edu/sites/default/files/uploads/COM-lecture%20figs%20reduced.pdf

## Interpretation and limitations

- The unit-cell coordinates and symmetry are crystallographic reference data.
  The three-by-three-by-three display is a finite repeated-cell visualization.
- The visual nucleation/growth slider currently reveals successive displayed
  cell layers. It is not a prediction of nucleation rate, morphology, particle
  size distribution, solubility, surface energy, or temperature-dependent growth.
- Electron particles visualise balanced oxidation-state bookkeeping and the
  explicitly encoded donor/acceptor sites. They do not represent quantum
  orbitals, electron-density maps, or a calculated microscopic trajectory.
- Ionic coordination links are visual associations, not covalent bonds.
  Sulfate S–O links are drawn within the polyatomic sulfate group.
- The model does not include defects, vacancies, dopants, surfaces, hydration,
  polymorph changes, thermal expansion, or experimental uncertainty.
