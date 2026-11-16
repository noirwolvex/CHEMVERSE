#include "crystal_engine.h"

namespace {
struct Site {
  int atomic_number;
  int role;
  double x;
  double y;
  double z;
};

constexpr double kFccPositions[4][3] = {
  {0.0, 0.0, 0.0},
  {0.0, 0.5, 0.5},
  {0.5, 0.0, 0.5},
  {0.5, 0.5, 0.0}
};
constexpr double kRockSaltCationPositions[4][3] = {
  {0.5, 0.0, 0.0},
  {0.0, 0.5, 0.0},
  {0.0, 0.0, 0.5},
  {0.5, 0.5, 0.5}
};

constexpr double kCuProfile[CV_CRYSTAL_PROFILE_FIELDS] = {
  CV_CRYSTAL_FCC, 225, 3.6147, 3.6147, 3.6147, 4, 4, 0
};
constexpr double kMgOProfile[CV_CRYSTAL_PROFILE_FIELDS] = {
  CV_CRYSTAL_ROCK_SALT, 225, 4.213, 4.213, 4.213, 8, 4, 0
};
constexpr double kAgClProfile[CV_CRYSTAL_PROFILE_FIELDS] = {
  CV_CRYSTAL_ROCK_SALT, 225, 5.5491, 5.5491, 5.5491, 8, 4, 0
};
constexpr double kCaOProfile[CV_CRYSTAL_PROFILE_FIELDS] = {
  CV_CRYSTAL_ROCK_SALT, 225, 4.8105, 4.8105, 4.8105, 8, 4, 0
};
constexpr double kBariteProfile[CV_CRYSTAL_PROFILE_FIELDS] = {
  CV_CRYSTAL_ORTHORHOMBIC_PNMA, 62, 8.884, 5.458, 7.153, 24, 4, 0
};

Site g_barite_sites[CV_CRYSTAL_MAX_SITES]{};
int g_barite_count = 0;
bool g_barite_built = false;

double wrap01(double value) {
  while (value < 0.0) value += 1.0;
  while (value >= 1.0) value -= 1.0;
  return value;
}
double absd(double value) { return value < 0.0 ? -value : value; }

void appendUnique(int atomic_number, int role, double x, double y, double z) {
  x = wrap01(x); y = wrap01(y); z = wrap01(z);
  for (int i = 0; i < g_barite_count; ++i) {
    const Site &site = g_barite_sites[i];
    if (site.atomic_number == atomic_number &&
        absd(site.x - x) < 1.0e-7 &&
        absd(site.y - y) < 1.0e-7 &&
        absd(site.z - z) < 1.0e-7) return;
  }
  if (g_barite_count >= CV_CRYSTAL_MAX_SITES) return;
  g_barite_sites[g_barite_count++] = {atomic_number, role, x, y, z};
}

void expandPnmaSite(int atomic_number, int role,
                    double x, double y, double z) {
  /*
   * Pnma (No. 62), standard setting, eight general-position operations.
   * Special 4c sites produce four unique positions after deduplication.
   */
  const double positions[8][3] = {
    { x,       y,       z       },
    {-x + .5, -y,       z + .5  },
    {-x,       y + .5, -z      },
    { x + .5, -y + .5, -z + .5 },
    {-x,      -y,      -z      },
    { x + .5,  y,      -z + .5 },
    { x,      -y + .5,  z       },
    {-x + .5,  y + .5,  z + .5 }
  };
  for (int i = 0; i < 8; ++i) {
    appendUnique(atomic_number, role,
                 positions[i][0], positions[i][1], positions[i][2]);
  }
}

void buildBarite() {
  if (g_barite_built) return;
  g_barite_built = true;

  /* Barite asymmetric-unit fractional coordinates, room-pressure Pnma. */
  expandPnmaSite(56, CV_CRYSTAL_ROLE_CATION, 0.1846, 0.2500, 0.1581); /* Ba */
  expandPnmaSite(16, CV_CRYSTAL_ROLE_FRAMEWORK_CENTER, 0.4370, 0.7500, 0.1914); /* S */
  expandPnmaSite(8, CV_CRYSTAL_ROLE_FRAMEWORK_OXYGEN, 0.5878, 0.7500, 0.1062); /* O1 */
  expandPnmaSite(8, CV_CRYSTAL_ROLE_FRAMEWORK_OXYGEN, 0.3192, 0.7500, 0.0515); /* O2 */
  expandPnmaSite(8, CV_CRYSTAL_ROLE_FRAMEWORK_OXYGEN, 0.4186, 0.9702, 0.3190); /* O3 */
}

const double *profileFor(int reaction_id) {
  switch (reaction_id) {
    case 2: return kMgOProfile;
    case 4: return kCuProfile;
    case 5: return kAgClProfile;
    case 8: return kCaOProfile;
    case 12: return kBariteProfile;
    default: return nullptr;
  }
}

int fccCount(int reaction_id) {
  return reaction_id == 4 ? 4 : (reaction_id == 2 || reaction_id == 5 ||
         reaction_id == 8 ? 8 : (reaction_id == 12 ? 24 : 0));
}

bool siteAt(int reaction_id, int index, Site &out) {
  if (index < 0 || index >= fccCount(reaction_id)) return false;
  if (reaction_id == 12) {
    buildBarite();
    if (index >= g_barite_count) return false;
    out = g_barite_sites[index];
    return true;
  }
  if (reaction_id == 4) {
    out = {29, CV_CRYSTAL_ROLE_METAL,
      kFccPositions[index][0], kFccPositions[index][1], kFccPositions[index][2]};
    return true;
  }

  const int anion = reaction_id == 5 ? 17 : 8;
  const int cation = reaction_id == 2 ? 12 : (reaction_id == 5 ? 47 : 20);
  if (index < 4) {
    out = {anion, CV_CRYSTAL_ROLE_ANION,
      kFccPositions[index][0], kFccPositions[index][1], kFccPositions[index][2]};
  } else {
    const int offset = index - 4;
    out = {cation, CV_CRYSTAL_ROLE_CATION,
      kRockSaltCationPositions[offset][0],
      kRockSaltCationPositions[offset][1],
      kRockSaltCationPositions[offset][2]};
  }
  return true;
}
}  // namespace

extern "C" const double *cv_crystal_profile(int reaction_id) {
  return profileFor(reaction_id);
}

extern "C" int cv_crystal_site_count(int reaction_id) {
  if (reaction_id == 12) {
    buildBarite();
    return g_barite_count;
  }
  return fccCount(reaction_id);
}

extern "C" int cv_crystal_site_element(int reaction_id, int site_index) {
  Site site{};
  return siteAt(reaction_id, site_index, site) ? site.atomic_number : 0;
}

extern "C" int cv_crystal_site_role(int reaction_id, int site_index) {
  Site site{};
  return siteAt(reaction_id, site_index, site) ? site.role : -1;
}

extern "C" double cv_crystal_site_fractional(int reaction_id, int site_index, int axis) {
  Site site{};
  if (!siteAt(reaction_id, site_index, site) || axis < 0 || axis > 2) return -1.0;
  if (axis == 0) return site.x;
  if (axis == 1) return site.y;
  return site.z;
}

extern "C" int cv_crystal_validate(int reaction_id) {
  const double *profile = profileFor(reaction_id);
  if (profile == nullptr) return 0;
  const int count = cv_crystal_site_count(reaction_id);
  if (count != static_cast<int>(profile[5])) return 0;

  int ba = 0, sulfur = 0, oxygen = 0, silver = 0, chlorine = 0;
  int magnesium = 0, calcium = 0, copper = 0;
  for (int i = 0; i < count; ++i) {
    Site site{};
    if (!siteAt(reaction_id, i, site) ||
        site.x < 0.0 || site.x >= 1.0 ||
        site.y < 0.0 || site.y >= 1.0 ||
        site.z < 0.0 || site.z >= 1.0) return 0;
    if (site.atomic_number == 56) ++ba;
    else if (site.atomic_number == 16) ++sulfur;
    else if (site.atomic_number == 8) ++oxygen;
    else if (site.atomic_number == 47) ++silver;
    else if (site.atomic_number == 17) ++chlorine;
    else if (site.atomic_number == 12) ++magnesium;
    else if (site.atomic_number == 20) ++calcium;
    else if (site.atomic_number == 29) ++copper;
    else return 0;
    for (int previous = 0; previous < i; ++previous) {
      Site earlier{};
      if (!siteAt(reaction_id, previous, earlier)) return 0;
      if (earlier.atomic_number == site.atomic_number &&
          absd(earlier.x - site.x) < 1.0e-7 &&
          absd(earlier.y - site.y) < 1.0e-7 &&
          absd(earlier.z - site.z) < 1.0e-7) return 0;
    }
  }

  if (reaction_id == 2) return magnesium == 4 && oxygen == 4;
  if (reaction_id == 4) return copper == 4;
  if (reaction_id == 5) return silver == 4 && chlorine == 4;
  if (reaction_id == 8) return calcium == 4 && oxygen == 4;
  if (reaction_id == 12) return ba == 4 && sulfur == 4 && oxygen == 16;
  return 0;
}

extern "C" int cv_crystal_engine_version(void) {
  return 100;
}
