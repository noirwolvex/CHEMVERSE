#ifndef CHEMVERSE_REACTION_MECHANISM_H
#define CHEMVERSE_REACTION_MECHANISM_H

#ifdef __cplusplus
extern "C" {
#endif

enum {
  CV_MECHANISM_ATOM_COUNT = 14,
  CV_MECHANISM_BOND_COUNT = 15,
  CV_MECHANISM_ATOM_FIELDS = 4,
  CV_MECHANISM_SAMPLE_FIELDS =
    CV_MECHANISM_ATOM_COUNT * CV_MECHANISM_ATOM_FIELDS + CV_MECHANISM_BOND_COUNT,
  CV_MECHANISM_STAGE_REACTANTS = 0,
  CV_MECHANISM_STAGE_INTERMEDIATE = 1,
  CV_MECHANISM_STAGE_PRODUCTS = 2,
  CV_MECHANISM_BOND_COVALENT = 0,
  CV_MECHANISM_BOND_IONIC = 1
};

/*
 * Stable atom map for:
 * CH3COOH + NaHCO3 -> CH3COO- + H2CO3 + Na+ -> CH3COO- + H2O + CO2 + Na+.
 *
 * Atom IDs and element codes are stable for the full reaction.
 * cv_mechanism_sample() layout:
 *   atoms: [x, y, z, opacity] for each atom in map order;
 *   bonds: one continuous bond order (0..2) per bond in map order.
 * Ionic interactions are dashed visual associations, never covalent bonds.
 * Coordinates are schematic display coordinates, not molecular dynamics.
 */
int cv_mechanism_atom_count(void);
int cv_mechanism_bond_count(void);
int cv_mechanism_atom_id(int atom_index);
int cv_mechanism_atom_element(int atom_index); /* atomic number: H=1, C=6, O=8, Na=11 */
int cv_mechanism_bond_atom_a(int bond_index);
int cv_mechanism_bond_atom_b(int bond_index);
int cv_mechanism_bond_kind(int bond_index);
int cv_mechanism_stage(double progress);
const double *cv_mechanism_sample(double progress);
int cv_mechanism_validate(void);
int cv_mechanism_engine_version(void);

#ifdef __cplusplus
}
#endif
#endif
