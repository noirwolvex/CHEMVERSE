#include "../cpp/concentration_fit.h"
#include <cassert>
#include <cmath>
#include <cstdio>

namespace {
bool near(double actual, double expected, double tolerance = 1.0e-8) {
  return std::fabs(actual - expected) <= tolerance * (1.0 + std::fabs(expected));
}

void setRow(int index, double time, double a, double b) {
  double *rows = cv_concentration_fit_input_buffer();
  rows[index * CV_CONCENTRATION_INPUT_FIELDS] = time;
  rows[index * CV_CONCENTRATION_INPUT_FIELDS + 1] = a;
  rows[index * CV_CONCENTRATION_INPUT_FIELDS + 2] = b;
}

const double *fitFive(double rate_a, double rate_b) {
  const double a0 = 0.40;
  const double b0 = 0.30;
  for (int i = 0; i < 5; ++i) {
    const double time = static_cast<double>(i);
    setRow(i, time, a0 - rate_a * time, b0 - rate_b * time);
  }
  return cv_concentration_fit_initial_rates(5, 0.20);
}
}

int main() {
  /* Exact linear consumption: both 1:1 reactants produce the same initial rate. */
  const double *fit = fitFive(0.01, 0.01);
  assert(fit && cv_concentration_fit_last_error() == 0);
  assert(near(fit[0], -0.01));
  assert(near(fit[1], 0.40));
  assert(near(fit[2], 1.0));
  assert(near(fit[3], 0.0));
  assert(near(fit[4], 0.01));
  assert(near(fit[5], -0.01));
  assert(near(fit[6], 0.30));
  assert(near(fit[7], 1.0));
  assert(near(fit[9], 0.01));
  assert(near(fit[10], 0.0));
  assert(near(fit[11], 0.01));
  assert(near(fit[12], 5.0));
  assert(near(fit[13], 1.0));

  /* A small difference is retained and accepted within the configured tolerance. */
  fit = fitFive(0.01, 0.011);
  assert(fit && near(fit[10], 0.001 / 0.0105));
  assert(near(fit[11], 0.0105));
  assert(near(fit[13], 1.0));

  /* A larger mismatch returns diagnostics but blocks automatic averaging. */
  fit = fitFive(0.01, 0.015);
  assert(fit && near(fit[13], 0.0));
  assert(fit[10] > 0.20);

  /* A noisy but decreasing series still returns regression diagnostics. */
  const double noisy_a[] = {0.400, 0.391, 0.381, 0.370, 0.361};
  const double noisy_b[] = {0.300, 0.291, 0.281, 0.270, 0.261};
  for (int i = 0; i < 5; ++i) setRow(i, static_cast<double>(i), noisy_a[i], noisy_b[i]);
  fit = cv_concentration_fit_initial_rates(5, 0.20);
  assert(fit && fit[2] > 0.99 && fit[7] > 0.99);
  assert(fit[4] > 0.0 && fit[9] > 0.0);

  /* Increasing concentration is not a positive reactant disappearance rate. */
  for (int i = 0; i < 4; ++i) setRow(i, i, 0.1 + 0.01 * i, 0.2 - 0.01 * i);
  assert(!cv_concentration_fit_initial_rates(4, 0.20));
  assert(cv_concentration_fit_last_error() == 5);

  /* Invalid times, duplicate times, invalid concentrations, and sizes are rejected. */
  setRow(0, 0, 0.4, 0.3);
  setRow(1, 1, 0.39, 0.29);
  setRow(2, 1, 0.38, 0.28);
  assert(!cv_concentration_fit_initial_rates(3, 0.20));
  assert(cv_concentration_fit_last_error() == 1);

  setRow(2, -1, 0.38, 0.28);
  assert(!cv_concentration_fit_initial_rates(3, 0.20));
  assert(cv_concentration_fit_last_error() == 1);

  setRow(2, 2, 0.0, 0.28);
  assert(!cv_concentration_fit_initial_rates(3, 0.20));
  assert(cv_concentration_fit_last_error() == 1);

  assert(!cv_concentration_fit_initial_rates(2, 0.20));
  assert(cv_concentration_fit_last_error() == 2);
  assert(!cv_concentration_fit_initial_rates(CV_CONCENTRATION_MAX_POINTS + 1, 0.20));
  assert(cv_concentration_fit_last_error() == 1);
  assert(!cv_concentration_fit_initial_rates(3, -0.01));
  assert(cv_concentration_fit_last_error() == 1);
  assert(!cv_concentration_fit_initial_rates(3, 2.01));
  assert(cv_concentration_fit_last_error() == 1);

  std::puts("CHEMVERSE concentration-time initial-rate engine: all tests passed");
}
