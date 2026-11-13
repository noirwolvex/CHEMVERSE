#include "experimental_fit.h"

namespace {
constexpr int ERR_INVALID = 1;
constexpr int ERR_INSUFFICIENT = 2;
constexpr int ERR_RANK_DEFICIENT = 3;
constexpr int ERR_NUMERIC = 4;

constexpr double LN2 = 0.69314718055994530942;
constexpr double SQRT2 = 1.4142135623730950488;
constexpr double INV_SQRT2 = 0.7071067811865475244;

double input_rows[CV_FIT_MAX_EXPERIMENTS * CV_FIT_INPUT_FIELDS]{};
double result[CV_FIT_RESULT_FIELDS]{};
int last_error = 0;

bool finiteValue(double value) {
  return value == value && value <= 1.0e300 && value >= -1.0e300;
}

double absValue(double value) { return value < 0.0 ? -value : value; }
double maxValue(double a, double b) { return a > b ? a : b; }

double logApprox(double value) {
  if (!(value > 0.0) || !finiteValue(value)) return -1.0e300;
  int exponent = 0;
  while (value >= SQRT2) { value *= 0.5; ++exponent; }
  while (value < INV_SQRT2) { value *= 2.0; --exponent; }
  const double y = (value - 1.0) / (value + 1.0);
  const double y2 = y * y;
  double term = y;
  double sum = y;
  for (int denominator = 3; denominator <= 41; denominator += 2) {
    term *= y2;
    sum += term / static_cast<double>(denominator);
  }
  return 2.0 * sum + static_cast<double>(exponent) * LN2;
}

double expApprox(double value) {
  if (value > 700.0) return 1.0e300;
  if (value < -745.0) return 0.0;
  const double quotient = value / LN2;
  const int power = static_cast<int>(quotient >= 0.0 ? quotient + 0.5 : quotient - 0.5);
  const double remainder = value - static_cast<double>(power) * LN2;
  double term = 1.0;
  double sum = 1.0;
  for (int i = 1; i <= 16; ++i) {
    term *= remainder / static_cast<double>(i);
    sum += term;
  }
  double scale = 1.0;
  if (power > 0) {
    for (int i = 0; i < power; ++i) scale *= 2.0;
  } else {
    for (int i = 0; i > power; --i) scale *= 0.5;
  }
  return sum * scale;
}

double sqrtApprox(double value) {
  if (!(value > 0.0)) return 0.0;
  double guess = value >= 1.0 ? value : 1.0;
  for (int i = 0; i < 40; ++i) guess = 0.5 * (guess + value / guess);
  return guess;
}
}

extern "C" double *cv_fit_input_buffer(void) {
  return input_rows;
}

extern "C" const double *cv_fit_initial_rates(int row_count, double temperature_c) {
  last_error = 0;
  for (int i = 0; i < CV_FIT_RESULT_FIELDS; ++i) result[i] = 0.0;

  if (row_count < 0 || row_count > CV_FIT_MAX_EXPERIMENTS ||
      !finiteValue(temperature_c) || temperature_c <= -273.15) {
    last_error = ERR_INVALID;
    return 0;
  }
  if (row_count < 4) {
    last_error = ERR_INSUFFICIENT;
    return 0;
  }

  double log_a[CV_FIT_MAX_EXPERIMENTS]{};
  double log_b[CV_FIT_MAX_EXPERIMENTS]{};
  double log_rate[CV_FIT_MAX_EXPERIMENTS]{};
  double mean_a = 0.0, mean_b = 0.0, mean_rate = 0.0;

  for (int i = 0; i < row_count; ++i) {
    const double concentration_a = input_rows[i * CV_FIT_INPUT_FIELDS];
    const double concentration_b = input_rows[i * CV_FIT_INPUT_FIELDS + 1];
    const double initial_rate = input_rows[i * CV_FIT_INPUT_FIELDS + 2];
    if (!finiteValue(concentration_a) || !finiteValue(concentration_b) ||
        !finiteValue(initial_rate) || concentration_a <= 0.0 ||
        concentration_b <= 0.0 || initial_rate <= 0.0) {
      last_error = ERR_INVALID;
      return 0;
    }
    log_a[i] = logApprox(concentration_a);
    log_b[i] = logApprox(concentration_b);
    log_rate[i] = logApprox(initial_rate);
    if (!finiteValue(log_a[i]) || !finiteValue(log_b[i]) || !finiteValue(log_rate[i])) {
      last_error = ERR_NUMERIC;
      return 0;
    }
    mean_a += log_a[i];
    mean_b += log_b[i];
    mean_rate += log_rate[i];
  }
  const double inverse_count = 1.0 / static_cast<double>(row_count);
  mean_a *= inverse_count;
  mean_b *= inverse_count;
  mean_rate *= inverse_count;

  /*
   * Center predictors to separate the intercept from the two slopes, then
   * use modified Gram-Schmidt QR on the two centered columns. This avoids
   * solving the less stable normal equations directly.
   */
  double column_a[CV_FIT_MAX_EXPERIMENTS]{};
  double column_b[CV_FIT_MAX_EXPERIMENTS]{};
  double centered_rate[CV_FIT_MAX_EXPERIMENTS]{};
  double norm_a_squared = 0.0;
  double norm_b_squared = 0.0;

  for (int i = 0; i < row_count; ++i) {
    column_a[i] = log_a[i] - mean_a;
    column_b[i] = log_b[i] - mean_b;
    centered_rate[i] = log_rate[i] - mean_rate;
    norm_a_squared += column_a[i] * column_a[i];
    norm_b_squared += column_b[i] * column_b[i];
  }

  const double norm_a = sqrtApprox(norm_a_squared);
  const double norm_b = sqrtApprox(norm_b_squared);
  if (!(norm_a > 1.0e-12) || !(norm_b > 1.0e-12)) {
    last_error = ERR_RANK_DEFICIENT;
    return 0;
  }

  double q1[CV_FIT_MAX_EXPERIMENTS]{};
  double q2[CV_FIT_MAX_EXPERIMENTS]{};
  for (int i = 0; i < row_count; ++i) q1[i] = column_a[i] / norm_a;

  double r12 = 0.0;
  for (int i = 0; i < row_count; ++i) r12 += q1[i] * column_b[i];

  double residual_b_squared = 0.0;
  for (int i = 0; i < row_count; ++i) {
    q2[i] = column_b[i] - r12 * q1[i];
    residual_b_squared += q2[i] * q2[i];
  }
  const double r22 = sqrtApprox(residual_b_squared);
  if (!(r22 > 1.0e-10 * norm_b)) {
    last_error = ERR_RANK_DEFICIENT;
    return 0;
  }
  for (int i = 0; i < row_count; ++i) q2[i] /= r22;

  double q1_rate = 0.0, q2_rate = 0.0;
  for (int i = 0; i < row_count; ++i) {
    q1_rate += q1[i] * centered_rate[i];
    q2_rate += q2[i] * centered_rate[i];
  }

  const double order_b = q2_rate / r22;
  const double order_a = (q1_rate - r12 * order_b) / norm_a;
  const double log_k = mean_rate - order_a * mean_a - order_b * mean_b;
  const double k = expApprox(log_k);

  if (!finiteValue(order_a) || !finiteValue(order_b) ||
      !finiteValue(log_k) || !finiteValue(k) || !(k > 0.0)) {
    last_error = ERR_NUMERIC;
    return 0;
  }

  double sse = 0.0;
  double sst = 0.0;
  for (int i = 0; i < row_count; ++i) {
    const double predicted = log_k + order_a * log_a[i] + order_b * log_b[i];
    const double residual = log_rate[i] - predicted;
    const double centered = log_rate[i] - mean_rate;
    sse += residual * residual;
    sst += centered * centered;
  }
  if (!finiteValue(sse) || !finiteValue(sst)) {
    last_error = ERR_NUMERIC;
    return 0;
  }

  const int degrees_of_freedom = row_count - 3;
  const double residual_variance = sse / static_cast<double>(degrees_of_freedom);
  const double sigma = sqrtApprox(residual_variance);
  const double inverse_norm_a = 1.0 / norm_a;
  const double inverse_norm_b = 1.0 / r22;
  const double r12_scaled = r12 / (norm_a * r22);
  const double variance_a = residual_variance *
    (inverse_norm_a * inverse_norm_a + r12_scaled * r12_scaled);
  const double variance_b = residual_variance * inverse_norm_b * inverse_norm_b;
  const double covariance_ab = -residual_variance * r12 / (norm_a * r22 * r22);
  const double variance_log_k = residual_variance * inverse_count +
    mean_a * mean_a * variance_a +
    mean_b * mean_b * variance_b +
    2.0 * mean_a * mean_b * covariance_ab;
  const double standard_error_a = sqrtApprox(maxValue(0.0, variance_a));
  const double standard_error_b = sqrtApprox(maxValue(0.0, variance_b));
  const double standard_error_log_k = sqrtApprox(maxValue(0.0, variance_log_k));
  const double standard_error_k = k * standard_error_log_k;
  const double rmse = sqrtApprox(sse * inverse_count);
  const double r_squared = sst > 1.0e-24 ? 1.0 - sse / sst : (sse <= 1.0e-24 ? 1.0 : 0.0);

  result[0] = k;
  result[1] = order_a;
  result[2] = order_b;
  result[3] = r_squared;
  result[4] = rmse;
  result[5] = sigma;
  result[6] = standard_error_a;
  result[7] = standard_error_b;
  result[8] = standard_error_log_k;
  result[9] = standard_error_k;
  result[10] = static_cast<double>(row_count);
  result[11] = temperature_c;
  return result;
}

extern "C" int cv_fit_last_error(void) { return last_error; }
extern "C" int cv_fit_engine_version(void) { return 100; }
