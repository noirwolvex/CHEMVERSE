#include "station04_engine.h"

namespace {
constexpr double kProfiles[CV_S04_REACTION_COUNT][CV_S04_PROFILE_FIELDS] = {
  /* 01 water synthesis */
  {0, 0, CV_S04_SOLID_NONE, CV_S04_GAS_NONE, 0, 0, 0, 0},
  /* 02 magnesium oxidation: 2 Mg -> 2 Mg2+ + 4 e-; O2 accepts 4 e-. */
  {4, 0, CV_S04_SOLID_CRYSTAL_PRODUCT, CV_S04_GAS_NONE, 0, 12, 8, 1},
  /* 03 peroxide decomposition: oxygen release from aqueous solution. */
  {0, 0, CV_S04_SOLID_NONE, CV_S04_GAS_O2, CV_S04_GAS_BUBBLES, 0, 0, 2},
  /* 04 iron/copper redox: Fe donates two electrons to Cu2+; copper deposits. */
  {2, 0, CV_S04_SOLID_METAL_DEPOSITION, CV_S04_GAS_NONE, 0, 26, 29, 1},
  /* 05 silver chloride ionic precipitation. */
  {0, 0, CV_S04_SOLID_IONIC_PRECIPITATE, CV_S04_GAS_NONE, 0, 0, 0, 0},
  /* 06 strong acid/base neutralization: net proton transfer H+ + OH-. */
  {0, 1, CV_S04_SOLID_NONE, CV_S04_GAS_NONE, 0, 0, 0, 4},
  /* 07 methane complete-oxidation model: gas-phase products, not solution bubbles. */
  {0, 0, CV_S04_SOLID_NONE, CV_S04_GAS_CO2, CV_S04_GAS_PLUME, 0, 0, 0},
  /* 08 thermal calcium carbonate decomposition: CO2 evolves from a solid. */
  {0, 0, CV_S04_SOLID_CRYSTAL_PRODUCT, CV_S04_GAS_CO2, CV_S04_GAS_PLUME, 0, 0, 8},
  /* 09 Haber synthesis: gaseous ammonia product, not bubbles in liquid. */
  {0, 0, CV_S04_SOLID_NONE, CV_S04_GAS_NH3, CV_S04_GAS_PLUME, 0, 0, 0},
  /* 10 carbon monoxide oxidation: gas-phase CO2 product. */
  {0, 0, CV_S04_SOLID_NONE, CV_S04_GAS_CO2, CV_S04_GAS_PLUME, 0, 0, 0},
  /* 11 zinc/acid redox: Zn donates two electrons; hydrogen ions form H2. */
  {2, 0, CV_S04_SOLID_NONE, CV_S04_GAS_H2, CV_S04_GAS_BUBBLES, 30, 1, 5},
  /* 12 barium sulfate ionic precipitation. */
  {0, 0, CV_S04_SOLID_IONIC_PRECIPITATE, CV_S04_GAS_NONE, 0, 0, 0, 0}
};

double g_effects[CV_S04_EFFECT_FIELDS]{};
struct RedoxPair { int reaction_id; double fields[9]; };
constexpr RedoxPair kRedoxPairs[3] = {
  /* 2 Mg atoms each lose 2e-; 2 O atoms each gain 2e-. */
  {2, {12, 0, 2, 2, 8, 0, -2, 2, 4}},
  /* Fe0 -> Fe2+ and Cu2+ -> Cu0. */
  {4, {26, 0, 2, 1, 29, 2, 0, 1, 2}},
  /* Zn0 -> Zn2+; two H+ ions each accept one electron. */
  {11, {30, 0, 2, 1, 1, 1, 0, 2, 2}}
};


double clamp01(double value) {
  if (!(value == value)) return 0.0;
  if (value < 0.0) return 0.0;
  if (value > 1.0) return 1.0;
  return value;
}

double smoothStep(double edge0, double edge1, double value) {
  const double t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3.0 - 2.0 * t);
}

bool validReactionId(int reaction_id) {
  return reaction_id >= 1 && reaction_id <= CV_S04_REACTION_COUNT;
}
}  // namespace

extern "C" const double *cv_s04_profile(int reaction_id) {
  if (!validReactionId(reaction_id)) return nullptr;
  return kProfiles[reaction_id - 1];
}

extern "C" const double *cv_s04_effects(int reaction_id, double progress) {
  const double *profile = cv_s04_profile(reaction_id);
  if (profile == nullptr) return nullptr;

  const double p = clamp01(progress);
  g_effects[0] = profile[0] > 0.0 ? smoothStep(0.28, 0.68, p) : 0.0;
  g_effects[1] = profile[1] > 0.0 ? smoothStep(0.30, 0.62, p) : 0.0;
  g_effects[2] = smoothStep(0.22, 0.66, p);
  g_effects[3] = smoothStep(0.40, 0.84, p);
  g_effects[4] = profile[2] > 0.0 ? smoothStep(0.55, 0.73, p) : 0.0;
  g_effects[5] = profile[2] > 0.0 ? smoothStep(0.68, 0.98, p) : 0.0;
  g_effects[6] = profile[3] > 0.0 ? smoothStep(0.52, 0.72, p) : 0.0;
  g_effects[7] = profile[3] > 0.0 ? smoothStep(0.66, 0.98, p) : 0.0;
  return g_effects;
}

extern "C" int cv_s04_validate_profile(int reaction_id) {
  const double *profile = cv_s04_profile(reaction_id);
  if (profile == nullptr) return 0;

  const int electron_count = static_cast<int>(profile[0]);
  const int proton_count = static_cast<int>(profile[1]);
  const int solid_kind = static_cast<int>(profile[2]);
  const int gas_kind = static_cast<int>(profile[3]);
  const int gas_mode = static_cast<int>(profile[4]);
  const int donor = static_cast<int>(profile[5]);
  const int acceptor = static_cast<int>(profile[6]);

  if (profile[0] < 0 || profile[1] < 0 || electron_count != profile[0] ||
      proton_count != profile[1] || (electron_count > 0 && (donor <= 0 || acceptor <= 0)) ||
      solid_kind < CV_S04_SOLID_NONE || solid_kind > CV_S04_SOLID_CRYSTAL_PRODUCT ||
      gas_kind < CV_S04_GAS_NONE || gas_kind > CV_S04_GAS_NH3 ||
      (gas_kind == CV_S04_GAS_NONE && gas_mode != 0) ||
      (gas_kind != CV_S04_GAS_NONE &&
       gas_mode != CV_S04_GAS_BUBBLES && gas_mode != CV_S04_GAS_PLUME)) {
    return 0;
  }
  return 1;
}


extern "C" int cv_s04_redox_pair_count(int reaction_id) {
  for (int i = 0; i < 3; ++i) {
    if (kRedoxPairs[i].reaction_id == reaction_id) return 1;
  }
  return 0;
}

extern "C" const double *cv_s04_redox_pair(int reaction_id, int pair_index) {
  if (pair_index != 0) return nullptr;
  for (int i = 0; i < 3; ++i) {
    if (kRedoxPairs[i].reaction_id == reaction_id) return kRedoxPairs[i].fields;
  }
  return nullptr;
}

extern "C" int cv_s04_engine_version(void) {
  return 100;
}
