#include "kinetics_engine.h"

#if defined(__wasm__)
extern "C" void *memset(void *destination, int value, __SIZE_TYPE__ length) {
  volatile unsigned char *bytes = static_cast<volatile unsigned char *>(destination);
  for (__SIZE_TYPE__ index = 0; index < length; ++index) {
    bytes[index] = static_cast<unsigned char>(value);
  }
  return destination;
}
#endif

namespace {
constexpr double R = 8.31446261815324;
constexpr double LN2 = 0.69314718055994530942;
constexpr double SQRT2 = 1.4142135623730950488;
constexpr double INV_SQRT2 = 0.7071067811865475244;
constexpr int MAX_STEPS = 250000;
constexpr int ERR_INVALID = 1, ERR_NUMERIC = 2, ERR_STEP_LIMIT = 3;

struct Model {
  double a0, b0, extent_max, k, m, n;
};

double curve[CV_KINETICS_MAX_SAMPLES * CV_KINETICS_FIELDS_PER_SAMPLE]{};
int last_error = 0;
int last_steps = 0;
double effective_k = 0.0;
int balance_ok = 0;

double absd(double x) { return x < 0.0 ? -x : x; }
double minv(double a, double b) { return a < b ? a : b; }
double maxv(double a, double b) { return a > b ? a : b; }
double clamp(double x, double lo, double hi) { return x < lo ? lo : (x > hi ? hi : x); }
bool finite(double x) { return x == x && x <= 1.0e300 && x >= -1.0e300; }

/* Range-reduced approximations keep the WASM core independent of libc/libm. */
double expFast(double x) {
  if (x > 700.0) return 1.0e300;
  if (x < -745.0) return 0.0;
  const double q = x / LN2;
  const int p = static_cast<int>(q >= 0.0 ? q + 0.5 : q - 0.5);
  const double r = x - static_cast<double>(p) * LN2;
  double term = 1.0, sum = 1.0;
  for (int i = 1; i <= 16; ++i) { term *= r / static_cast<double>(i); sum += term; }
  double scale = 1.0;
  if (p > 0) for (int i = 0; i < p; ++i) scale *= 2.0;
  else for (int i = 0; i > p; --i) scale *= 0.5;
  return sum * scale;
}

double logFast(double x) {
  if (!(x > 0.0) || !finite(x)) return -1.0e300;
  int exponent = 0;
  while (x >= SQRT2) { x *= 0.5; ++exponent; }
  while (x < INV_SQRT2) { x *= 2.0; --exponent; }
  const double y = (x - 1.0) / (x + 1.0), y2 = y * y;
  double term = y, sum = y;
  for (int d = 3; d <= 41; d += 2) { term *= y2; sum += term / static_cast<double>(d); }
  return 2.0 * sum + static_cast<double>(exponent) * LN2;
}

double powerNonnegative(double base, double exponent) {
  if (exponent == 0.0) return 1.0;
  if (base <= 0.0) return 0.0;
  return expFast(exponent * logFast(base));
}

double rateAt(const Model &model, double extent) {
  if (extent >= model.extent_max || model.extent_max <= 0.0) return 0.0;
  const double a = maxv(0.0, model.a0 - extent);
  const double b = maxv(0.0, model.b0 - extent);
  const double value = model.k * powerNonnegative(a, model.m) * powerNonnegative(b, model.n);
  return finite(value) && value > 0.0 ? value : 0.0;
}

double rk4(const Model &model, double x, double dt) {
  const double k1 = rateAt(model, x);
  const double k2 = rateAt(model, clamp(x + 0.5 * dt * k1, 0.0, model.extent_max));
  const double k3 = rateAt(model, clamp(x + 0.5 * dt * k2, 0.0, model.extent_max));
  const double k4 = rateAt(model, clamp(x + dt * k3, 0.0, model.extent_max));
  return clamp(x + dt * (k1 + 2.0*k2 + 2.0*k3 + k4) / 6.0, 0.0, model.extent_max);
}

bool advanceTo(const Model &model, double target, double duration, double max_step,
               double &time, double &extent, double &next_step) {
  const double min_step = maxv(1.0e-14, duration * 1.0e-13);
  while (time < target) {
    if (last_steps >= MAX_STEPS) { last_error = ERR_STEP_LIMIT; return false; }
    double h = minv(minv(next_step, max_step), target - time);
    if (!(h > 0.0) || !finite(h)) { last_error = ERR_NUMERIC; return false; }
    const double full = rk4(model, extent, h);
    const double half1 = rk4(model, extent, 0.5*h);
    const double half = rk4(model, half1, 0.5*h);
    const double error = absd(half - full) / 15.0;
    const double tolerance = 1.0e-13 + 1.0e-9 * model.extent_max;
    if (error <= tolerance || h <= min_step) {
      extent = clamp(half + (half - full) / 15.0, 0.0, model.extent_max);
      time += h;
      if (target - time < 1.0e-12 * maxv(1.0, target)) time = target;
      ++last_steps;
      double factor = error <= 1.0e-30 ? 2.5 : 0.9 * expFast(0.2 * logFast(tolerance / error));
      next_step = minv(max_step, maxv(min_step, h * clamp(factor, 0.25, 2.5)));
    } else {
      const double factor = 0.9 * expFast(0.2 * logFast(tolerance / error));
      next_step = maxv(min_step, h * clamp(factor, 0.1, 0.5));
    }
  }
  return true;
}

void saveSample(int index, double time, double extent, const Model &model, double volume) {
  const int p = index * CV_KINETICS_FIELDS_PER_SAMPLE;
  const double a = maxv(0.0, model.a0 - extent);
  const double b = maxv(0.0, model.b0 - extent);
  const double conversion = model.extent_max > 0.0 ? clamp(extent / model.extent_max, 0.0, 1.0) : 0.0;
  curve[p] = time;
  curve[p+1] = conversion;
  curve[p+2] = extent * volume;
  curve[p+3] = a * volume;
  curve[p+4] = b * volume;
  curve[p+5] = rateAt(model, extent);
}
}

extern "C" const double *cv_kinetics_simulate(
  double amount_a_mmol, double amount_b_mmol, double volume_ml,
  double k_reference, double order_a, double order_b,
  double temperature_c, double reference_temperature_c,
  double activation_energy_kj_mol, int use_arrhenius,
  double duration_seconds, double maximum_step_seconds, int sample_count) {
  last_error = 0; last_steps = 0; effective_k = 0.0; balance_ok = 0;
  for (int i = 0; i < CV_KINETICS_MAX_SAMPLES * CV_KINETICS_FIELDS_PER_SAMPLE; ++i) curve[i] = 0.0;

  const bool amounts_ok = finite(amount_a_mmol) && finite(amount_b_mmol) &&
    amount_a_mmol >= 0.0 && amount_b_mmol >= 0.0 && amount_a_mmol <= 1.0e9 && amount_b_mmol <= 1.0e9;
  const bool volume_ok = finite(volume_ml) && volume_ml >= 1.0e-6 && volume_ml <= 1.0e9;
  const bool orders_ok = finite(order_a) && finite(order_b) && order_a >= 0.0 && order_b >= 0.0 &&
    order_a <= 4.0 && order_b <= 4.0 && order_a + order_b <= 6.0;
  const bool k_ok = finite(k_reference) && k_reference > 0.0 && k_reference <= 1.0e100;
  const bool temp_ok = finite(temperature_c) && finite(reference_temperature_c) &&
    temperature_c > -273.15 && reference_temperature_c > -273.15;
  const bool energy_ok = finite(activation_energy_kj_mol) && activation_energy_kj_mol >= 0.0;
  const bool time_ok = finite(duration_seconds) && duration_seconds > 0.0 && duration_seconds <= 1.0e7;
  const bool step_ok = finite(maximum_step_seconds) && maximum_step_seconds > 0.0;
  const bool samples_ok = sample_count >= 2 && sample_count <= CV_KINETICS_MAX_SAMPLES;
  if (!amounts_ok || !volume_ok || !orders_ok || !k_ok || !temp_ok || !energy_ok ||
      !time_ok || !step_ok || !samples_ok || (use_arrhenius != 0 && use_arrhenius != 1)) {
    last_error = ERR_INVALID; return 0;
  }

  effective_k = k_reference;
  if (use_arrhenius == 1) {
    const double t = temperature_c + 273.15;
    const double tref = reference_temperature_c + 273.15;
    const double exponent = -(activation_energy_kj_mol * 1000.0 / R) * (1.0/t - 1.0/tref);
    effective_k = k_reference * expFast(exponent);
  }
  if (!finite(effective_k) || effective_k < 0.0 || effective_k > 1.0e250) {
    last_error = ERR_NUMERIC; return 0;
  }

  Model model{};
  /* Numerically, mmol/mL equals mol/L. */
  model.a0 = amount_a_mmol / volume_ml;
  model.b0 = amount_b_mmol / volume_ml;
  model.extent_max = minv(model.a0, model.b0);
  model.k = effective_k; model.m = order_a; model.n = order_b;

  const double max_step = minv(maximum_step_seconds, duration_seconds);
  double time = 0.0, extent = 0.0;
  double next_step = minv(max_step, duration_seconds / static_cast<double>(sample_count - 1));
  saveSample(0, 0.0, extent, model, volume_ml);
  for (int i = 1; i < sample_count; ++i) {
    const double target = duration_seconds * static_cast<double>(i) / static_cast<double>(sample_count - 1);
    if (!advanceTo(model, target, duration_seconds, max_step, time, extent, next_step)) return 0;
    saveSample(i, target, extent, model, volume_ml);
  }

  const int last = (sample_count - 1) * CV_KINETICS_FIELDS_PER_SAMPLE;
  const double e = curve[last+2], a = curve[last+3], b = curve[last+4];
  const double tol = 1.0e-8 * maxv(1.0, maxv(amount_a_mmol, amount_b_mmol));
  balance_ok = (absd(amount_a_mmol - a - e) <= tol && absd(amount_b_mmol - b - e) <= tol) ? 1 : 0;
  if (!balance_ok) { last_error = ERR_NUMERIC; return 0; }
  return curve;
}

extern "C" int cv_kinetics_last_error(void) { return last_error; }
extern "C" int cv_kinetics_last_steps(void) { return last_steps; }
extern "C" double cv_kinetics_effective_k(void) { return effective_k; }
extern "C" int cv_kinetics_atom_balance_ok(void) { return balance_ok; }
extern "C" int cv_kinetics_engine_version(void) { return 100; }
