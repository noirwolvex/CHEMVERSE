#include "reaction_mechanism.h"

namespace {
constexpr int kAtomicNumbers[CV_MECHANISM_ATOM_COUNT] = {
  6, 6, 8, 8, 1, 1, 1, 1, 11, 6, 8, 8, 8, 1
};

constexpr int kAtomIds[CV_MECHANISM_ATOM_COUNT] = {
  1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008,
  2001, 2002, 2003, 2004, 2005, 2006
};

/*
 * Atom order:
 * 0 AC-C1, 1 AC-C2, 2 AC-O1, 3 AC-O2, 4 AC-Hacid,
 * 5..7 AC-Hmethyl-1..3, 8 BC-Na, 9 BC-C,
 * 10 BC-O1, 11 BC-O2 (initially sodium-associated),
 * 12 BC-O3 (initially hydroxyl), 13 BC-H.
 *
 * Coordinates are illustrative ball-and-stick layout coordinates.
 * The same atom index is used in every keyframe: no atom is duplicated.
 */
constexpr double kReactants[CV_MECHANISM_ATOM_COUNT][3] = {
  {-2.7980,  0.0200,  0.0000},
  {-1.5924,  0.0200,  0.0000},
  {-1.0380,  0.7064,  0.0000},
  {-1.0380, -0.6664,  0.0000},
  {-0.2724, -0.7368,  0.0000},
  {-3.0796,  0.7680,  0.0000},
  {-3.3084, -0.3848,  0.6336},
  {-3.3084, -0.3848, -0.6336},
  { 3.5900,  0.3848,  0.0000},
  { 2.0500, -0.0200,  0.0000},
  { 2.0500,  0.9744,  0.0000},
  { 2.8948, -0.5128,  0.0000},
  { 1.2052, -0.5128,  0.0000},
  { 0.5188, -0.8648,  0.0000}
};

constexpr double kIntermediate[CV_MECHANISM_ATOM_COUNT][3] = {
  {-2.2304,  0.0000,  0.0000},
  {-1.0424,  0.0000,  0.0000},
  {-0.4792,  0.6776,  0.0000},
  {-0.4792, -0.6776,  0.0000},
  { 2.3792,  0.8976,  0.0000},
  {-2.5208,  0.7480,  0.0000},
  {-2.7496, -0.4048,  0.6336},
  {-2.7496, -0.4048, -0.6336},
  { 0.0500, -0.0800,  0.0000},
  { 1.2000,  0.0000,  0.0000},
  { 0.2672,  0.0000,  0.0000},
  { 1.7104,  0.7216,  0.0000},
  { 1.7104, -0.7216,  0.0000},
  { 2.3792, -0.8976,  0.0000}
};

constexpr double kProducts[CV_MECHANISM_ATOM_COUNT][3] = {
  {-2.2304,  0.0000,  0.0000},
  {-1.0424,  0.0000,  0.0000},
  {-0.4792,  0.6776,  0.0000},
  {-0.4792, -0.6776,  0.0000},
  { 2.8200, -0.7800,  0.3000},
  {-2.5208,  0.7480,  0.0000},
  {-2.7496, -0.4048,  0.6336},
  {-2.7496, -0.4048, -0.6336},
  { 0.0500, -0.0800,  0.0000},
  { 1.5000,  0.4500,  0.0000},
  { 0.4000,  0.4500,  0.0000},
  { 2.6000,  0.4500,  0.0000},
  { 2.2000, -1.2000,  0.3000},
  { 1.5800, -0.7800,  0.3000}
};

/* Bonds are indexed once and persist as records while their order changes.
 * Order 0 means broken/absent, 1 single, 2 double.
 * The two Na+ contacts are ionic associations (dashed in the renderer).
 */
constexpr int kBondA[CV_MECHANISM_BOND_COUNT] = {
  0, 1, 1, 3, 0, 0, 0, 9, 9, 9, 12, 11, 12, 8, 8
};
constexpr int kBondB[CV_MECHANISM_BOND_COUNT] = {
  1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 4, 4, 11, 3
};
constexpr int kBondKinds[CV_MECHANISM_BOND_COUNT] = {
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1
};

/* Order arrays follow kBondA/kBondB/kBondKinds. */
constexpr double kReactantBondOrders[CV_MECHANISM_BOND_COUNT] = {
  1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0, 0, 1, 0
};
constexpr double kIntermediateBondOrders[CV_MECHANISM_BOND_COUNT] = {
  1, 1, 2, 0, 1, 1, 1, 2, 1, 1, 1, 1, 0, 0, 1
};
constexpr double kProductBondOrders[CV_MECHANISM_BOND_COUNT] = {
  1, 1, 2, 0, 1, 1, 1, 2, 2, 0, 1, 0, 1, 0, 1
};

/*
 * Events expose the programmed bond-order transitions at the two keyframes.
 * Event 0 includes a localized acetate resonance drawing and ionic associations.
 * These are model records, not claims of a measured elementary-step trajectory.
 */
constexpr double kEventProgress[CV_MECHANISM_EVENT_COUNT] = {0.50, 1.00};
constexpr int kEventChangeCounts[CV_MECHANISM_EVENT_COUNT] = {6, 4};
constexpr int kEventBondIndices[CV_MECHANISM_EVENT_COUNT][CV_MECHANISM_MAX_EVENT_CHANGES] = {
  {1, 2, 3, 11, 13, 14},
  {8, 9, 11, 12, -1, -1}
};

const double *bondOrdersForEventStage(int event_index, bool after) {
  if (event_index == 0) return after ? kIntermediateBondOrders : kReactantBondOrders;
  return after ? kProductBondOrders : kIntermediateBondOrders;
}

double g_sample[CV_MECHANISM_SAMPLE_FIELDS]{};

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

double mix(double left, double right, double amount) {
  return left + (right - left) * amount;
}
}  // namespace

extern "C" int cv_mechanism_atom_count(void) {
  return CV_MECHANISM_ATOM_COUNT;
}

extern "C" int cv_mechanism_bond_count(void) {
  return CV_MECHANISM_BOND_COUNT;
}

extern "C" int cv_mechanism_atom_id(int atom_index) {
  if (atom_index < 0 || atom_index >= CV_MECHANISM_ATOM_COUNT) return 0;
  return kAtomIds[atom_index];
}

extern "C" int cv_mechanism_atom_element(int atom_index) {
  if (atom_index < 0 || atom_index >= CV_MECHANISM_ATOM_COUNT) return 0;
  return kAtomicNumbers[atom_index];
}

extern "C" int cv_mechanism_bond_atom_a(int bond_index) {
  if (bond_index < 0 || bond_index >= CV_MECHANISM_BOND_COUNT) return -1;
  return kBondA[bond_index];
}

extern "C" int cv_mechanism_bond_atom_b(int bond_index) {
  if (bond_index < 0 || bond_index >= CV_MECHANISM_BOND_COUNT) return -1;
  return kBondB[bond_index];
}

extern "C" int cv_mechanism_bond_kind(int bond_index) {
  if (bond_index < 0 || bond_index >= CV_MECHANISM_BOND_COUNT) return -1;
  return kBondKinds[bond_index];
}

extern "C" int cv_mechanism_stage(double progress) {
  const double value = clamp01(progress);
  if (value < (1.0 / 3.0)) return CV_MECHANISM_STAGE_REACTANTS;
  if (value < (2.0 / 3.0)) return CV_MECHANISM_STAGE_INTERMEDIATE;
  return CV_MECHANISM_STAGE_PRODUCTS;
}

extern "C" int cv_mechanism_event_count(void) {
  return CV_MECHANISM_EVENT_COUNT;
}

extern "C" double cv_mechanism_event_progress(int event_index) {
  if (event_index < 0 || event_index >= CV_MECHANISM_EVENT_COUNT) return -1.0;
  return kEventProgress[event_index];
}

extern "C" int cv_mechanism_event_change_count(int event_index) {
  if (event_index < 0 || event_index >= CV_MECHANISM_EVENT_COUNT) return 0;
  return kEventChangeCounts[event_index];
}

extern "C" int cv_mechanism_event_bond_index(int event_index, int change_index) {
  if (event_index < 0 || event_index >= CV_MECHANISM_EVENT_COUNT ||
      change_index < 0 || change_index >= kEventChangeCounts[event_index]) {
    return -1;
  }
  return kEventBondIndices[event_index][change_index];
}

extern "C" double cv_mechanism_event_bond_before(int event_index, int change_index) {
  const int bond_index = cv_mechanism_event_bond_index(event_index, change_index);
  if (bond_index < 0) return -1.0;
  return bondOrdersForEventStage(event_index, false)[bond_index];
}

extern "C" double cv_mechanism_event_bond_after(int event_index, int change_index) {
  const int bond_index = cv_mechanism_event_bond_index(event_index, change_index);
  if (bond_index < 0) return -1.0;
  return bondOrdersForEventStage(event_index, true)[bond_index];
}

extern "C" const double *cv_mechanism_sample(double progress) {
  const double value = clamp01(progress);
  const double proton_transfer = smoothStep(0.28, 0.50, value);
  const double carbonic_decomposition = smoothStep(0.63, 0.84, value);

  for (int atom = 0; atom < CV_MECHANISM_ATOM_COUNT; ++atom) {
    const int offset = atom * CV_MECHANISM_ATOM_FIELDS;
    for (int axis = 0; axis < 3; ++axis) {
      const double intermediate_position = mix(
        kReactants[atom][axis], kIntermediate[atom][axis], proton_transfer);
      g_sample[offset + axis] = mix(
        intermediate_position, kProducts[atom][axis], carbonic_decomposition);
    }
    g_sample[offset + 3] = 1.0;
  }

  const int bond_offset =
    CV_MECHANISM_ATOM_COUNT * CV_MECHANISM_ATOM_FIELDS;
  for (int bond = 0; bond < CV_MECHANISM_BOND_COUNT; ++bond) {
    const double intermediate_order = mix(
      kReactantBondOrders[bond],
      kIntermediateBondOrders[bond],
      proton_transfer);
    g_sample[bond_offset + bond] = mix(
      intermediate_order, kProductBondOrders[bond], carbonic_decomposition);
  }

  return g_sample;
}

extern "C" int cv_mechanism_validate(void) {
  int carbon = 0;
  int hydrogen = 0;
  int oxygen = 0;
  int sodium = 0;

  for (int atom = 0; atom < CV_MECHANISM_ATOM_COUNT; ++atom) {
    const int element = kAtomicNumbers[atom];
    if (element == 6) ++carbon;
    else if (element == 1) ++hydrogen;
    else if (element == 8) ++oxygen;
    else if (element == 11) ++sodium;
    else return 0;

    if (kAtomIds[atom] == 0) return 0;
    for (int previous = 0; previous < atom; ++previous) {
      if (kAtomIds[previous] == kAtomIds[atom]) return 0;
    }
  }

  if (carbon != 3 || hydrogen != 5 || oxygen != 5 || sodium != 1) return 0;

  for (int bond = 0; bond < CV_MECHANISM_BOND_COUNT; ++bond) {
    if (kBondA[bond] < 0 || kBondA[bond] >= CV_MECHANISM_ATOM_COUNT ||
        kBondB[bond] < 0 || kBondB[bond] >= CV_MECHANISM_ATOM_COUNT ||
        kBondA[bond] == kBondB[bond] ||
        (kBondKinds[bond] != CV_MECHANISM_BOND_COVALENT &&
         kBondKinds[bond] != CV_MECHANISM_BOND_IONIC)) {
      return 0;
    }
  }

  for (int event = 0; event < CV_MECHANISM_EVENT_COUNT; ++event) {
    if (!(kEventProgress[event] > 0.0 && kEventProgress[event] <= 1.0) ||
        kEventChangeCounts[event] <= 0 ||
        kEventChangeCounts[event] > CV_MECHANISM_MAX_EVENT_CHANGES ||
        (event > 0 && kEventProgress[event] <= kEventProgress[event - 1])) {
      return 0;
    }
    const double *before_orders = bondOrdersForEventStage(event, false);
    const double *after_orders = bondOrdersForEventStage(event, true);
    for (int change = 0; change < kEventChangeCounts[event]; ++change) {
      const int bond = kEventBondIndices[event][change];
      if (bond < 0 || bond >= CV_MECHANISM_BOND_COUNT ||
          before_orders[bond] == after_orders[bond] ||
          before_orders[bond] < 0.0 || before_orders[bond] > 2.0 ||
          after_orders[bond] < 0.0 || after_orders[bond] > 2.0) {
        return 0;
      }
    }
  }

  return 1;
}

extern "C" int cv_mechanism_engine_version(void) {
  return 110;
}
