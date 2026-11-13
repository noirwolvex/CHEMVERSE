#include "chemistry_core.h"
#if defined(__wasm__)
extern "C" void *memset(void *destination, int value, __SIZE_TYPE__ length) {
  volatile unsigned char *bytes = static_cast<volatile unsigned char *>(destination);
  for (__SIZE_TYPE__ index = 0; index < length; ++index) bytes[index] = static_cast<unsigned char>(value);
  return destination;
}
#endif
namespace {
constexpr double kMaximumInputMmol = 1000000000.0;
constexpr double kBalanceTolerance = 1.0e-9;
CvReactionResult g_result{};
inline double clamp01(double value) { return value < 0.0 ? 0.0 : (value > 1.0 ? 1.0 : value); }
inline double absolute(double value) { return value < 0.0 ? -value : value; }
inline bool finiteAndNonNegative(double value) {
  return value == value && value >= 0.0 && value <= kMaximumInputMmol;
}
inline bool nearlyEqual(double left, double right) {
  const double scale = absolute(left) > absolute(right) ? absolute(left) : absolute(right);
  return absolute(left - right) <= kBalanceTolerance * (scale > 1.0 ? scale : 1.0);
}
bool verifyAtomConservation(double acid_initial, double bicarbonate_initial,
                            double acid_remaining, double bicarbonate_remaining,
                            double extent) {
  const double reactant_c = 2.0 * acid_initial + bicarbonate_initial;
  const double reactant_h = 4.0 * acid_initial + bicarbonate_initial;
  const double reactant_na = bicarbonate_initial;
  const double reactant_o = 2.0 * acid_initial + 3.0 * bicarbonate_initial;
  const double product_c = 2.0 * acid_remaining + bicarbonate_remaining + 3.0 * extent;
  const double product_h = 4.0 * acid_remaining + bicarbonate_remaining + 5.0 * extent;
  const double product_na = bicarbonate_remaining + extent;
  const double product_o = 2.0 * acid_remaining + 3.0 * bicarbonate_remaining + 5.0 * extent;
  return nearlyEqual(reactant_c, product_c) && nearlyEqual(reactant_h, product_h) &&
         nearlyEqual(reactant_na, product_na) && nearlyEqual(reactant_o, product_o);
}
}
extern "C" const CvReactionResult *cv_calculate_reaction(double acetic_acid_mmol,
                                                           double sodium_bicarbonate_mmol,
                                                           double progress) {
  g_result = {};
  if (!finiteAndNonNegative(acetic_acid_mmol) ||
      !finiteAndNonNegative(sodium_bicarbonate_mmol) || !finiteAndNonNegative(progress)) {
    g_result.error_code = 1;
    return &g_result;
  }
  g_result.progress = clamp01(progress);
  const double limiting_amount = acetic_acid_mmol < sodium_bicarbonate_mmol
                                   ? acetic_acid_mmol : sodium_bicarbonate_mmol;
  g_result.extent_mmol = limiting_amount * g_result.progress;
  g_result.acetic_acid_remaining_mmol = acetic_acid_mmol - g_result.extent_mmol;
  g_result.sodium_bicarbonate_remaining_mmol = sodium_bicarbonate_mmol - g_result.extent_mmol;
  g_result.sodium_acetate_mmol = g_result.extent_mmol;
  g_result.water_mmol = g_result.extent_mmol;
  g_result.carbon_dioxide_mmol = g_result.extent_mmol;
  g_result.limiting_reagent = acetic_acid_mmol < sodium_bicarbonate_mmol
                                ? 1 : (sodium_bicarbonate_mmol < acetic_acid_mmol ? 2 : 0);
  g_result.atom_balance_ok = verifyAtomConservation(
      acetic_acid_mmol, sodium_bicarbonate_mmol,
      g_result.acetic_acid_remaining_mmol, g_result.sodium_bicarbonate_remaining_mmol,
      g_result.extent_mmol) ? 1 : 0;
  return &g_result;
}
extern "C" double cv_demo_progress(double elapsed_seconds) {
  if (!(elapsed_seconds == elapsed_seconds) || elapsed_seconds <= 0.0) return 0.0;
  const double t = clamp01(elapsed_seconds / 12.0);
  return t * t * (3.0 - 2.0 * t);
}
extern "C" int cv_reaction_is_balanced(void) { return 1; }
extern "C" int cv_engine_version(void) { return 100; }
