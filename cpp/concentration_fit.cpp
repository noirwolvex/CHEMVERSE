#include "concentration_fit.h"

namespace {
constexpr int ERR_INVALID = 1;
constexpr int ERR_INSUFFICIENT = 2;
constexpr int ERR_RANK_DEFICIENT = 3;
constexpr int ERR_NUMERIC = 4;
constexpr int ERR_NO_CONSUMPTION = 5;

double input_rows[CV_CONCENTRATION_MAX_POINTS * CV_CONCENTRATION_INPUT_FIELDS]{};
double result[CV_CONCENTRATION_RESULT_FIELDS]{};
int last_error = 0;

bool finiteValue(double value) {
  return value == value && value <= 1.0e300 && value >= -1.0e300;
}

double sqrtApprox(double value) {
  if (!(value > 0.0)) return 0.0;
  double guess = value >= 1.0 ? value : 1.0;
  for (int i = 0; i < 48; ++i) guess = 0.5 * (guess + value / guess);
  return guess;
}

struct LinearFit {
  double slope;
  double intercept;
  double r_squared;
  double rmse;
  double initial_rate;
};

bool fitConcentration(int point_count, int concentration_column, LinearFit &fit) {
  double mean_time = 0.0;
  double mean_concentration = 0.0;

  for (int i = 0; i < point_count; ++i) {
    const double time = input_rows[i * CV_CONCENTRATION_INPUT_FIELDS];
    const double concentration = input_rows[i * CV_CONCENTRATION_INPUT_FIELDS + concentration_column];
    mean_time += time;
    mean_concentration += concentration;
  }
  const double inverse_count = 1.0 / static_cast<double>(point_count);
  mean_time *= inverse_count;
  mean_concentration *= inverse_count;

  double time_variance = 0.0;
  double covariance = 0.0;
  double total_sum_squares = 0.0;
  for (int i = 0; i < point_count; ++i) {
    const double time_delta = input_rows[i * CV_CONCENTRATION_INPUT_FIELDS] - mean_time;
    const double concentration =
      input_rows[i * CV_CONCENTRATION_INPUT_FIELDS + concentration_column];
    const double concentration_delta = concentration - mean_concentration;
    time_variance += time_delta * time_delta;
    covariance += time_delta * concentration_delta;
    total_sum_squares += concentration_delta * concentration_delta;
  }

  if (!(time_variance > 1.0e-24) || !finiteValue(time_variance)) return false;
  const double slope = covariance / time_variance;
  const double intercept = mean_concentration - slope * mean_time;
  if (!finiteValue(slope) || !finiteValue(intercept)) return false;

  double residual_sum_squares = 0.0;
  for (int i = 0; i < point_count; ++i) {
    const double time = input_rows[i * CV_CONCENTRATION_INPUT_FIELDS];
    const double concentration =
      input_rows[i * CV_CONCENTRATION_INPUT_FIELDS + concentration_column];
    const double residual = concentration - (intercept + slope * time);
    residual_sum_squares += residual * residual;
  }
  if (!finiteValue(residual_sum_squares) || !finiteValue(total_sum_squares)) return false;

  fit.slope = slope;
  fit.intercept = intercept;
  fit.r_squared = total_sum_squares > 1.0e-24
    ? 1.0 - residual_sum_squares / total_sum_squares
    : __builtin_nan("");
  fit.rmse = sqrtApprox(residual_sum_squares * inverse_count);
  fit.initial_rate = -slope;
  return finiteValue(fit.rmse);
}
}

extern "C" double *cv_concentration_fit_input_buffer(void) {
  return input_rows;
}

extern "C" const double *cv_concentration_fit_initial_rates(
  int point_count, double maximum_relative_rate_disagreement) {
  last_error = 0;
  for (int i = 0; i < CV_CONCENTRATION_RESULT_FIELDS; ++i) result[i] = 0.0;

  if (point_count < 0 || point_count > CV_CONCENTRATION_MAX_POINTS ||
      !finiteValue(maximum_relative_rate_disagreement) ||
      maximum_relative_rate_disagreement < 0.0 ||
      maximum_relative_rate_disagreement > 2.0) {
    last_error = ERR_INVALID;
    return 0;
  }
  if (point_count < 3) {
    last_error = ERR_INSUFFICIENT;
    return 0;
  }

  for (int i = 0; i < point_count; ++i) {
    const double time = input_rows[i * CV_CONCENTRATION_INPUT_FIELDS];
    const double concentration_a = input_rows[i * CV_CONCENTRATION_INPUT_FIELDS + 1];
    const double concentration_b = input_rows[i * CV_CONCENTRATION_INPUT_FIELDS + 2];
    if (!finiteValue(time) || !finiteValue(concentration_a) ||
        !finiteValue(concentration_b) || time < 0.0 ||
        concentration_a <= 0.0 || concentration_b <= 0.0) {
      last_error = ERR_INVALID;
      return 0;
    }
    if (i > 0) {
      const double previous_time = input_rows[(i - 1) * CV_CONCENTRATION_INPUT_FIELDS];
      if (!(time > previous_time)) {
        last_error = ERR_INVALID;
        return 0;
      }
    }
  }

  LinearFit fit_a{}, fit_b{};
  if (!fitConcentration(point_count, 1, fit_a) ||
      !fitConcentration(point_count, 2, fit_b)) {
    last_error = ERR_RANK_DEFICIENT;
    return 0;
  }

  if (!(fit_a.initial_rate > 0.0) || !(fit_b.initial_rate > 0.0)) {
    last_error = ERR_NO_CONSUMPTION;
    return 0;
  }

  const double mean_rate = 0.5 * (fit_a.initial_rate + fit_b.initial_rate);
  if (!(mean_rate > 0.0) || !finiteValue(mean_rate)) {
    last_error = ERR_NUMERIC;
    return 0;
  }
  const double relative_disagreement =
    (fit_a.initial_rate > fit_b.initial_rate
      ? fit_a.initial_rate - fit_b.initial_rate
      : fit_b.initial_rate - fit_a.initial_rate) / mean_rate;
  if (!finiteValue(relative_disagreement)) {
    last_error = ERR_NUMERIC;
    return 0;
  }

  result[0] = fit_a.slope;
  result[1] = fit_a.intercept;
  result[2] = fit_a.r_squared;
  result[3] = fit_a.rmse;
  result[4] = fit_a.initial_rate;
  result[5] = fit_b.slope;
  result[6] = fit_b.intercept;
  result[7] = fit_b.r_squared;
  result[8] = fit_b.rmse;
  result[9] = fit_b.initial_rate;
  result[10] = relative_disagreement;
  result[11] = mean_rate;
  result[12] = static_cast<double>(point_count);
  result[13] = relative_disagreement <= maximum_relative_rate_disagreement ? 1.0 : 0.0;

  return result;
}

extern "C" int cv_concentration_fit_last_error(void) { return last_error; }
extern "C" int cv_concentration_fit_engine_version(void) { return 100; }
