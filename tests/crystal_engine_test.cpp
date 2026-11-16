#include "../cpp/crystal_engine.h"
#include <cassert>
#include <cmath>
#include <cstdio>

namespace {
bool near(double a, double b, double tolerance = 1.0e-7) {
  return std::fabs(a - b) <= tolerance;
}
}

int main() {
  assert(cv_crystal_engine_version() == 100);
  const int reactions[] = {2, 4, 5, 8, 12};
  const int expectedSites[] = {8, 4, 8, 8, 24};
  const int expectedGroups[] = {225, 225, 225, 225, 62};
  for (int i = 0; i < 5; ++i) {
    const int id = reactions[i];
    const double *profile = cv_crystal_profile(id);
    assert(profile != nullptr);
    assert(static_cast<int>(profile[1]) == expectedGroups[i]);
    assert(cv_crystal_site_count(id) == expectedSites[i]);
    assert(static_cast<int>(profile[5]) == expectedSites[i]);
    assert(cv_crystal_validate(id) == 1);
    for (int site = 0; site < expectedSites[i]; ++site) {
      assert(cv_crystal_site_element(id, site) > 0);
      assert(cv_crystal_site_role(id, site) >= CV_CRYSTAL_ROLE_METAL);
      for (int axis = 0; axis < 3; ++axis) {
        const double coordinate = cv_crystal_site_fractional(id, site, axis);
        assert(coordinate >= 0.0 && coordinate < 1.0);
      }
    }
  }

  const double *agcl = cv_crystal_profile(5);
  assert(near(agcl[2], 5.5491));
  const double *barite = cv_crystal_profile(12);
  assert(near(barite[2], 8.884));
  assert(near(barite[3], 5.458));
  assert(near(barite[4], 7.153));
  int ba = 0, sulfur = 0, oxygen = 0;
  for (int i = 0; i < 24; ++i) {
    const int element = cv_crystal_site_element(12, i);
    if (element == 56) ++ba;
    else if (element == 16) ++sulfur;
    else if (element == 8) ++oxygen;
  }
  assert(ba == 4 && sulfur == 4 && oxygen == 16);
  const double *copper = cv_crystal_profile(4);
  assert(copper[0] == CV_CRYSTAL_FCC && copper[1] == 225);
  assert(near(copper[2], 3.6147));

  assert(cv_crystal_profile(1) == nullptr);
  assert(cv_crystal_profile(13) == nullptr);
  assert(cv_crystal_site_element(5, -1) == 0);
  assert(cv_crystal_site_element(5, 8) == 0);
  assert(cv_crystal_site_fractional(12, 0, 3) < 0.0);
  assert(cv_crystal_validate(1) == 0);
  std::puts("CHEMVERSE crystal engine: all tests passed");
}
