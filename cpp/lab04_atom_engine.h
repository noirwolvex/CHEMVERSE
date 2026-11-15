#ifndef CHEMVERSE_LAB04_ATOM_ENGINE_H
#define CHEMVERSE_LAB04_ATOM_ENGINE_H

#ifdef __cplusplus
extern "C" {
#endif

enum {
  CV_LAB04_ATOM_MAX_ATOMS = 64,
  CV_LAB04_ATOM_MAX_BONDS = 128,
  CV_LAB04_ATOM_INPUT_FIELDS = 11,
  CV_LAB04_BOND_INPUT_FIELDS = 6,
  CV_LAB04_ATOM_OUTPUT_FIELDS = 4,
  CV_LAB04_ATOM_ENGINE_VERSION = 100
};

/*
 * Input atom record (11 doubles):
 *   atomic_number, stable_atom_id,
 *   start_x, start_y, start_z,
 *   transition_x, transition_y, transition_z,
 *   final_x, final_y, final_z.
 *
 * Input bond record (6 doubles):
 *   atom_a, atom_b, kind (0=covalent, 1=ionic),
 *   start_order, transition_order, final_order.
 *
 * Output sample:
 *   atoms: x, y, z, opacity for every stable atom identity;
 *   bonds: interpolated bond order for every input bond.
 *
 * This is an atom-mapped, keyframed reaction-coordinate renderer. It is not
 * molecular dynamics, quantum chemistry, or a force-field integration.
 */
int cv_lab04_atom_engine_configure(int atom_count, int bond_count);
double *cv_lab04_atom_engine_atom_input(void);
double *cv_lab04_atom_engine_bond_input(void);
int cv_lab04_atom_engine_atom_count(void);
int cv_lab04_atom_engine_bond_count(void);
const double *cv_lab04_atom_engine_sample(double progress);
int cv_lab04_atom_engine_validate(void);
int cv_lab04_atom_engine_last_error(void);
int cv_lab04_atom_engine_version(void);

#ifdef __cplusplus
}
#endif
#endif
