#ifndef CHEMVERSE_STATION04_ENGINE_H
#define CHEMVERSE_STATION04_ENGINE_H

#ifdef __cplusplus
extern "C" {
#endif

enum {
  CV_S04_REACTION_COUNT = 12,
  CV_S04_PROFILE_FIELDS = 8,
  CV_S04_EFFECT_FIELDS = 8,
  CV_S04_SOLID_NONE = 0,
  CV_S04_SOLID_IONIC_PRECIPITATE = 1,
  CV_S04_SOLID_METAL_DEPOSITION = 2,
  CV_S04_SOLID_CRYSTAL_PRODUCT = 3,
  CV_S04_GAS_NONE = 0,
  CV_S04_GAS_H2 = 1,
  CV_S04_GAS_CO2 = 2,
  CV_S04_GAS_O2 = 3,
  CV_S04_GAS_NH3 = 4,
  CV_S04_GAS_BUBBLES = 1,
  CV_S04_GAS_PLUME = 2
};

/*
 * Reaction IDs follow REACTIONS.number in src/compound-reactions.mjs (01..12).
 * Profile fields:
 * [electron_count, proton_count, solid_kind, gas_kind, gas_visual_mode,
 *  electron_donor_atomic_number, electron_acceptor_atomic_number, mechanism_flags]
 *
 * Effect fields are normalized display progress, not measured reaction rates:
 * [electron_transfer, proton_transfer, bond_breaking, bond_forming,
 *  solid_nucleation, solid_growth, gas_nucleation, gas_release].
 *
 * This engine deliberately does not invent kinetic constants or atomistic
 * trajectories. The UI labels these curves as staged educational choreography.
 */
const double *cv_s04_profile(int reaction_id);
const double *cv_s04_effects(int reaction_id, double progress);
int cv_s04_validate_profile(int reaction_id);
/*
 * Redox pair fields:
 * [donor_Z, donor_charge_before, donor_charge_after, donor_site_count,
 *  acceptor_Z, acceptor_charge_before, acceptor_charge_after,
 *  acceptor_site_count, total_electrons].
 */
int cv_s04_redox_pair_count(int reaction_id);
const double *cv_s04_redox_pair(int reaction_id, int pair_index);
int cv_s04_engine_version(void);

#ifdef __cplusplus
}
#endif
#endif
