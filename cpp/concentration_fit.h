#ifndef CHEMVERSE_CONCENTRATION_FIT_H
#define CHEMVERSE_CONCENTRATION_FIT_H

#ifdef __cplusplus
extern "C" {
#endif

enum {
  CV_CONCENTRATION_MAX_POINTS = 64,
  CV_CONCENTRATION_INPUT_FIELDS = 3,
  CV_CONCENTRATION_RESULT_FIELDS = 14
};

/*
 * Estimate initial reactant disappearance rates from the first N samples
 * of one concentration-time experiment using ordinary least squares:
 *   [A](t) = intercept_A + slope_A * t
 *   [B](t) = intercept_B + slope_B * t
 *
 * Input rows are flattened triples: [time_s, concentration_A_M, concentration_B_M].
 * Time must be non-negative and strictly increasing. Concentrations must be
 * positive. At least three samples are required.
 *
 * Results:
 * 0 slope_A (M/s), 1 intercept_A (M), 2 R2_A, 3 RMSE_A (M),
 * 4 rate_A = -slope_A (M/s),
 * 5 slope_B (M/s), 6 intercept_B (M), 7 R2_B, 8 RMSE_B (M),
 * 9 rate_B = -slope_B (M/s),
 * 10 relative rate disagreement = |rate_A-rate_B| / mean(rate_A,rate_B),
 * 11 mean initial rate (M/s), 12 point count, 13 rates-consistent flag.
 *
 * The consistency flag is a configurable quality-control gate for this
 * 1:1 reaction model. A result can be returned with flag 0 so the caller
 * can inspect both fitted slopes, but must not silently combine them.
 */
double *cv_concentration_fit_input_buffer(void);
const double *cv_concentration_fit_initial_rates(
  int point_count, double maximum_relative_rate_disagreement);
int cv_concentration_fit_last_error(void);
int cv_concentration_fit_engine_version(void);

#ifdef __cplusplus
}
#endif
#endif
