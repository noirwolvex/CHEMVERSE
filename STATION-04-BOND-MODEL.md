# Station 04 — Bond-order and bond-length display model

## Implemented representation

Material bond tuples are stored as:

`[atomIndexA, atomIndexB, bondOrder, referenceLengthAngstrom]`

- Order 1, 2, and 3 means single, double, and triple covalent bond.
- Fractional orders represent resonance-delocalized groups in a simplified Lewis/resonance-average model: nitrate and carbonate use approximately 4/3; sulfate uses 1.5.
- Order 0 means an ionic association / formula-unit contact, not a covalent bond. Such contacts are not drawn as ordinary covalent sticks. Ionic crystal connectivity is handled by the crystal renderer.

The 3D renderer draws separate parallel sticks for integer bond orders. A fractional resonance order draws a full stick and a lower-opacity additional stick, so the display does not imply one fixed localized double bond for every equivalent N–O, C–O, or S–O connection.

## Length behaviour and units

During the reaction timeline, atom centres move between the stored reactant and product coordinates. Bond sticks remain attached to those centres, so their *displayed geometric length* changes continuously with the interpolated atom positions. The overlay reports this length in scene units (`u`) and a relative display change; it does **not** report the interpolated geometry as an experimental distance in Ångström.

Where available, `referenceLengthAngstrom` stores a reference equilibrium bond length in Å for chemistry reference and inspection. Examples include H–H 0.7414 Å, O=O 1.208 Å, O–H in water 0.958 Å, N≡N 1.098 Å, C≡O in CO 1.128 Å, and C–H in methane 1.087 Å. Values for resonance groups are approximate representative values; they are not an optimized geometry for every ionic environment.

The displayed atom coordinates remain educational scene coordinates, not a geometry optimization. This work does not calculate bond order from electron density, solve molecular orbitals, predict transition states, or perform quantum-chemical molecular dynamics. The reaction timeline is a deterministic visual interpolation, not a physically predicted bond-vibration or reaction trajectory.

## Validation

The chemistry data tests validate atom indices, supported bond-order range (0–3), and positive optional reference lengths. Representative tests cover single/double/triple, resonance-average, and ionic-contact cases.

## References

- NIST Computational Chemistry Comparison and Benchmark Database (CCCBDB), geometry and bond-length comparison pages: https://cccbdb.nist.gov/geomcalc1x.asp
- NIST CCCBDB experimental-reference bond lengths include O=O 1.208 Å, N≡N 1.098 Å, H–H 0.741 Å, CO 1.128 Å, HCl 1.275 Å, and H₂O O–H 0.958 Å: https://cccbdb.nist.gov/bondlengthmodel2x.asp?basis=18&method=10 and https://cccbdb.nist.gov/bondlengthmodel2x.asp?basis=25&method=63
- CCCBDB notes that experimental values for some species may be equilibrium `r_e` or vibrationally averaged `r_0`; calculated and experimental definitions must be compared carefully: https://cccbdb.nist.gov/geomcalc1x.asp
