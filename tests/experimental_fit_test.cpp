#include "../cpp/experimental_fit.h"
#include <cassert>
#include <cmath>
#include <cstdio>

namespace {
bool near(double actual, double expected, double tolerance = 1.0e-6) {
  return std::fabs(actual - expected) <= tolerance * (1.0 + std::fabs(expected));
}

void setRow(int index, double a, double b, double rate) {
  double *rows = cv_fit_input_buffer();
  rows[index * CV_FIT_INPUT_FIELDS] = a;
  rows[index * CV_FIT_INPUT_FIELDS + 1] = b;
  rows[index * CV_FIT_INPUT_FIELDS + 2] = rate;
}
}

int main() {
  const double expected_k = 0.75;
  const double expected_m = 1.5;
  const double expected_n = 0.5;
  const double a_values[] = {0.10, 0.20, 0.40, 0.15, 0.30, 0.25};
  const double b_values[] = {0.10, 0.10, 0.10, 0.20, 0.20, 0.40};
  for (int i = 0; i < 6; ++i) {
    const double rate = expected_k * std::pow(a_values[i], expected_m) *
      std::pow(b_values[i], expected_n);
    setRow(i, a_values[i], b_values[i], rate);
  }

  const double *fit = cv_fit_initial_rates(6, 25.0);
  assert(fit && cv_fit_last_error() == 0);
  assert(near(fit[0], expected_k, 2.0e-5));
  assert(near(fit[1], expected_m, 2.0e-5));
  assert(near(fit[2], expected_n, 2.0e-5));
  assert(fit[3] > 0.999999);
  assert(fit[4] < 1.0e-6);
  assert(fit[5] < 1.0e-6);
  assert(near(fit[10], 6.0));
  assert(near(fit[11], 25.0));

  /* Small measurement scatter should still recover the parameters approximately. */
  const double noise[] = {1.001, 0.998, 1.003, 0.997, 1.002, 0.999};
  for (int i = 0; i < 6; ++i) {
    const double rate = expected_k * std::pow(a_values[i], expected_m) *
      std::pow(b_values[i], expected_n) * noise[i];
    setRow(i, a_values[i], b_values[i], rate);
  }
  fit = cv_fit_initial_rates(6, 25.0);
  assert(fit && cv_fit_last_error() == 0);
  assert(std::fabs(fit[1] - expected_m) < 0.02);
  assert(std::fabs(fit[2] - expected_n) < 0.02);
  assert(fit[4] > 0.0);
  assert(fit[5] > 0.0);
  assert(fit[6] > 0.0 && fit[7] > 0.0);

  /* Too few experiments cannot estimate residual uncertainty. */
  assert(!cv_fit_initial_rates(3, 25.0));
  assert(cv_fit_last_error() == 2);

  /* Perfectly correlated log concentrations cannot identify both orders. */
  for (int i = 0; i < 4; ++i) {
    const double a = 0.1 * (i + 1);
    const double b = 2.0 * a;
    setRow(i, a, b, 0.2 * a * b);
  }
  assert(!cv_fit_initial_rates(4, 25.0));
  assert(cv_fit_last_error() == 3);

  /* Non-positive measurements are not valid for a logarithmic fit. */
  setRow(0, 0.1, 0.2, 0.0);
  assert(!cv_fit_initial_rates(4, 25.0));
  assert(cv_fit_last_error() == 1);

  assert(!cv_fit_initial_rates(6, -273.15));
  assert(cv_fit_last_error() == 1);
  assert(!cv_fit_initial_rates(CV_FIT_MAX_EXPERIMENTS + 1, 25.0));
  assert(cv_fit_last_error() == 1);

  std::puts("CHEMVERSE experimental fitting engine: all tests passed");
}
