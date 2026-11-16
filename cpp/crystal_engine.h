#ifndef CHEMVERSE_CRYSTAL_ENGINE_H
#define CHEMVERSE_CRYSTAL_ENGINE_H

#ifdef __cplusplus
extern "C" {
#endif

enum {
  CV_CRYSTAL_PROFILE_FIELDS = 8,
  CV_CRYSTAL_MAX_SITES = 24,
  CV_CRYSTAL_FCC = 1,
  CV_CRYSTAL_ROCK_SALT = 2,
  CV_CRYSTAL_ORTHORHOMBIC_PNMA = 3,
  CV_CRYSTAL_ROLE_METAL = 0,
  CV_CRYSTAL_ROLE_CATION = 1,
  CV_CRYSTAL_ROLE_ANION = 2,
  CV_CRYSTAL_ROLE_FRAMEWORK_CENTER = 3,
  CV_CRYSTAL_ROLE_FRAMEWORK_OXYGEN = 4
};

/*
 * Reaction IDs follow REACTIONS.number in src/compound-reactions.mjs.
 * Profile fields: [crystal_kind, space_group_number, a_A, b_A, c_A,
 *                  basis_site_count, formula_units_per_cell, flags].
 * Fractional coordinates describe a conventional crystallographic unit cell.
 * BaSO4 uses the Pnma (62) symmetry operations on a published asymmetric unit.
 */
const double *cv_crystal_profile(int reaction_id);
int cv_crystal_site_count(int reaction_id);
int cv_crystal_site_element(int reaction_id, int site_index);
int cv_crystal_site_role(int reaction_id, int site_index);
double cv_crystal_site_fractional(int reaction_id, int site_index, int axis);
int cv_crystal_validate(int reaction_id);
int cv_crystal_engine_version(void);

#ifdef __cplusplus
}
#endif
#endif
