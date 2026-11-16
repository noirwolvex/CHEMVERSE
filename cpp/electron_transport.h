#ifndef CHEMVERSE_ELECTRON_TRANSPORT_H
#define CHEMVERSE_ELECTRON_TRANSPORT_H

#ifdef __cplusplus
extern "C" {
#endif

enum {
  CV_ELECTRON_HISTOGRAM_BINS = 32,
  CV_ELECTRON_MAX_TRACKS = 24,
  CV_ELECTRON_MAX_SECONDARY_TRACKS = 24,
  CV_ELECTRON_MAX_POINTS = 48,
  CV_ELECTRON_POINT_FIELDS = 5,
  CV_ELECTRON_TRACK_HEADER_FIELDS = 3,
  CV_ELECTRON_SUMMARY_FIELDS = 22
};

/*
 * Monte Carlo electron transport through a homogeneous slab.
 * Energies: keV; distances: nm; density: g/cm^3; tilt: degrees.
 * Atomic mass: g/mol. The engine uses screened-Rutherford angular
 * scattering and a Kanaya-Okayama range-based continuous energy-loss
 * approximation. Secondary electrons are tracked as independent, low-energy
 * surface-emission histories with simplified inelastic stopping and escape;
 * this is not a full dielectric-response or electron-cascade calculation.
 */
const double *cv_electron_simulate(
  int primary_count,
  double atomic_number,
  double atomic_mass_g_mol,
  double density_g_cm3,
  double beam_energy_kev,
  double thickness_nm,
  double beam_tilt_degrees,
  unsigned int random_seed,
  int recorded_track_count,
  int maximum_collisions_per_track);

const double *cv_electron_summary(void);
const double *cv_electron_histogram(void);
const double *cv_electron_tracks(void);
const double *cv_electron_secondary_tracks(void);
int cv_electron_secondary_track_count(void);
int cv_electron_last_error(void);
int cv_electron_engine_version(void);

#ifdef __cplusplus
}
#endif
#endif
