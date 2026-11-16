#include "../cpp/station04_engine.h"
#include <cassert>
#include <cmath>
#include <cstdio>

namespace {
bool near(double a, double b, double tolerance = 1.0e-9) {
  return std::fabs(a - b) <= tolerance;
}
}

int main() {
  assert(cv_s04_engine_version() == 100);
  for (int id = 1; id <= CV_S04_REACTION_COUNT; ++id) {
    assert(cv_s04_profile(id) != nullptr);
    assert(cv_s04_validate_profile(id) == 1);
    const double *start = cv_s04_effects(id, 0.0);
    assert(start != nullptr);
    for (int field = 0; field < CV_S04_EFFECT_FIELDS; ++field) assert(near(start[field], 0.0));
    const double *end = cv_s04_effects(id, 1.0);
    assert(end != nullptr);
    for (int field = 0; field < CV_S04_EFFECT_FIELDS; ++field) {
      assert(end[field] >= 0.0 && end[field] <= 1.0);
    }
  }

  const double *mg = cv_s04_profile(2);
  assert(mg[0] == 4 && mg[2] == CV_S04_SOLID_CRYSTAL_PRODUCT && mg[5] == 12 && mg[6] == 8);
  assert(cv_s04_redox_pair_count(2) == 1);
  const double *mgPair = cv_s04_redox_pair(2, 0);
  assert(mgPair[0] == 12 && mgPair[2] == 2 && mgPair[3] == 2);
  assert(mgPair[4] == 8 && mgPair[6] == -2 && mgPair[7] == 2 && mgPair[8] == 4);
  const double *iron = cv_s04_profile(4);
  assert(iron[0] == 2 && iron[2] == CV_S04_SOLID_METAL_DEPOSITION);
  const double *ironPair = cv_s04_redox_pair(4, 0);
  assert(ironPair[0] == 26 && ironPair[2] == 2 && ironPair[4] == 29 && ironPair[5] == 2 && ironPair[6] == 0 && ironPair[8] == 2);
  assert(iron[5] == 26 && iron[6] == 29);

  assert(cv_s04_redox_pair_count(1) == 0);
  assert(cv_s04_redox_pair(4, 1) == nullptr);
  const double *acid = cv_s04_profile(6);
  assert(acid[0] == 0 && acid[1] == 1);
  const double *zinc = cv_s04_profile(11);
  assert(zinc[0] == 2 && zinc[3] == CV_S04_GAS_H2);
  const double *zincPair = cv_s04_redox_pair(11, 0);
  assert(zincPair[0] == 30 && zincPair[2] == 2 && zincPair[4] == 1 && zincPair[5] == 1 && zincPair[6] == 0 && zincPair[7] == 2 && zincPair[8] == 2);
  assert(zinc[4] == CV_S04_GAS_BUBBLES);

  const double *silver = cv_s04_profile(5);
  const double *barium = cv_s04_profile(12);
  assert(silver[2] == CV_S04_SOLID_IONIC_PRECIPITATE);
  assert(barium[2] == CV_S04_SOLID_IONIC_PRECIPITATE);
  const double *calciumOxide = cv_s04_profile(8);
  assert(calciumOxide[2] == CV_S04_SOLID_CRYSTAL_PRODUCT);

  const double *precipitation = cv_s04_effects(5, 0.90);
  assert(precipitation[4] > 0.99 && precipitation[5] > 0.80);
  const double *gas = cv_s04_effects(11, 0.90);
  assert(gas[6] > 0.99 && gas[7] > 0.80);
  const double *redox = cv_s04_effects(4, 0.50);
  assert(redox[0] > 0.0 && redox[0] < 1.0);

  const double *clampedLow = cv_s04_effects(11, -10.0);
  assert(near(clampedLow[0], 0.0));
  const double *clampedHigh = cv_s04_effects(11, 10.0);
  assert(near(clampedHigh[0], 1.0));

  assert(cv_s04_profile(0) == nullptr);
  assert(cv_s04_profile(13) == nullptr);
  assert(cv_s04_effects(-1, 0.5) == nullptr);
  assert(cv_s04_validate_profile(0) == 0);
  std::puts("CHEMVERSE Station 04 engine: all tests passed");
}
