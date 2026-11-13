#ifndef CHEMVERSE_EXPERIMENTAL_FIT_H
#define CHEMVERSE_EXPERIMENTAL_FIT_H

#ifdef __cplusplus
extern "C" {
#endif

enum {
  CV_FIT_MAX_EXPERIMENTS = 256,
  CV_FIT_INPUT_FIELDS = 3,
  CV_FIT_RESULT_FIELDS = 12
};

/*
 * Initial-rate log-linear fit:
 * ln(rate) = ln(k) + m ln([A]0) + n ln([B]0).
 *
 * Input rows are flattened triples: [A0_M, B0_M, initial_rate_M_per_s].
 * All rows must describe experiments at one common temperature.
 * At least four valid experiments and independent variation in both
 * concentrations are required to estimate residual uncertainty.
 *
 * Result fields:
 * 0 k, 1 m, 2 n, 3 R^2, 4 RMSE in ln(rate),
 * 5 residual standard error in ln(rate), 6 SE(m), 7 SE(n),
 * 8 SE(ln k), 9 delta-method SE(k), 10 experiment count, 11 temperature_C.
 */
double *cv_fit_input_buffer(void);
const double *cv_fit_initial_rates(int row_count, double temperature_c);
int cv_fit_last_error(void);
int cv_fit_engine_version(void);

#ifdef __cplusplus
}
#endif
#endif
