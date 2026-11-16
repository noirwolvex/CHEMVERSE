#ifndef CHEMVERSE_AFM_INTERACTION_H
#define CHEMVERSE_AFM_INTERACTION_H

#ifdef __cplusplus
extern "C" {
#endif

enum {
  CV_AFM_MAX_GRID = 96,
  CV_AFM_MAX_CELLS = CV_AFM_MAX_GRID * CV_AFM_MAX_GRID,
  CV_AFM_OUTPUT_FIELDS = 6,
  CV_AFM_SUMMARY_FIELDS = 12
};

/*
 * Dynamic tapping/contact AFM scan over a supplied sample height field.
 * Heights, scan widths, amplitudes, tip radii and deflections: nm.
 * Spring constant: N/m; resonance: kHz; quality factor: dimensionless.
 * Young's modulus: GPa; Hamaker constant: J; adhesion energy: mJ/m^2.
 * Output per pixel: feedback topography, cantilever deflection, peak force,
 * oscillation amplitude, phase degrees, feedback iterations.
 *
 * Tapping uses a driven damped cantilever with DMT/Hertz contact and
 * non-contact van der Waals interaction. Contact mode uses a DMT/Hertz
 * force-setpoint solution. This is a single-asperity continuum model;
 * it does not solve atomistic tip chemistry or full 3-D elasticity.
 */
double *cv_afm_height_input(void);
const double *cv_afm_scan(
  int grid_size,
  double scan_width_nm,
  double free_amplitude_nm,
  double amplitude_setpoint_ratio,
  double spring_constant_n_m,
  double resonance_frequency_khz,
  double quality_factor,
  double tip_radius_nm,
  double young_modulus_gpa,
  double poisson_ratio,
  double adhesion_energy_mj_m2,
  double hamaker_constant_j,
  int scan_mode,
  double contact_force_setpoint_nn,
  int cycles_per_pixel,
  int steps_per_cycle);

const double *cv_afm_summary(void);
const double *cv_afm_output(void);
int cv_afm_last_error(void);
int cv_afm_engine_version(void);

#ifdef __cplusplus
}
#endif
#endif
