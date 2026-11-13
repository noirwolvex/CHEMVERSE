#include "../cpp/reaction_mechanism.h"
#include <cassert>
#include <cmath>
#include <cstdio>

namespace {
constexpr int kBondOffset = CV_MECHANISM_ATOM_COUNT * CV_MECHANISM_ATOM_FIELDS;

bool near(double actual, double expected, double tolerance = 1.0e-9) {
  return std::fabs(actual - expected) <= tolerance * (1.0 + std::fabs(expected));
}

double bondOrder(const double *sample, int bond_index) {
  return sample[kBondOffset + bond_index];
}
}

int main() {
  assert(cv_mechanism_engine_version() == 110);
  assert(cv_mechanism_validate() == 1);
  assert(cv_mechanism_atom_count() == 14);
  assert(cv_mechanism_bond_count() == 15);

  int carbon = 0;
  int hydrogen = 0;
  int oxygen = 0;
  int sodium = 0;
  for (int atom = 0; atom < CV_MECHANISM_ATOM_COUNT; ++atom) {
    const int element = cv_mechanism_atom_element(atom);
    carbon += element == 6 ? 1 : 0;
    hydrogen += element == 1 ? 1 : 0;
    oxygen += element == 8 ? 1 : 0;
    sodium += element == 11 ? 1 : 0;
    assert(cv_mechanism_atom_id(atom) != 0);
    for (int previous = 0; previous < atom; ++previous) {
      assert(cv_mechanism_atom_id(previous) != cv_mechanism_atom_id(atom));
    }
  }
  assert(carbon == 3 && hydrogen == 5 && oxygen == 5 && sodium == 1);

  for (int bond = 0; bond < CV_MECHANISM_BOND_COUNT; ++bond) {
    const int atom_a = cv_mechanism_bond_atom_a(bond);
    const int atom_b = cv_mechanism_bond_atom_b(bond);
    assert(atom_a >= 0 && atom_a < CV_MECHANISM_ATOM_COUNT);
    assert(atom_b >= 0 && atom_b < CV_MECHANISM_ATOM_COUNT);
    assert(atom_a != atom_b);
  }
  assert(cv_mechanism_bond_kind(13) == CV_MECHANISM_BOND_IONIC);
  assert(cv_mechanism_bond_kind(14) == CV_MECHANISM_BOND_IONIC);

  const double *reactants = cv_mechanism_sample(0.0);
  assert(cv_mechanism_stage(0.0) == CV_MECHANISM_STAGE_REACTANTS);
  assert(near(bondOrder(reactants, 3), 1.0));   // O-acid -- H-acid
  assert(near(bondOrder(reactants, 11), 0.0));  // No new O-bicarbonate -- H-acid
  assert(near(bondOrder(reactants, 13), 1.0));  // Na+ associated with bicarbonate O

  const double *intermediate = cv_mechanism_sample(0.50);
  assert(cv_mechanism_stage(0.50) == CV_MECHANISM_STAGE_INTERMEDIATE);
  assert(near(bondOrder(intermediate, 3), 0.0));  // Acid O-H bond broken
  assert(near(bondOrder(intermediate, 11), 1.0)); // Proton transferred to bicarbonate O
  assert(near(bondOrder(intermediate, 13), 0.0)); // Old Na+ association released
  assert(near(bondOrder(intermediate, 14), 1.0)); // Na+ associated with acetate O
  assert(near(bondOrder(intermediate, 8), 1.0));  // Carbonic acid C-O remains single

  const double *products = cv_mechanism_sample(1.0);
  assert(cv_mechanism_stage(1.0) == CV_MECHANISM_STAGE_PRODUCTS);
  assert(near(bondOrder(products, 3), 0.0));
  assert(near(bondOrder(products, 11), 0.0)); // O-bicarbonate -- H-acid bond breaks
  assert(near(bondOrder(products, 8), 2.0));  // CO2 second C=O forms
  assert(near(bondOrder(products, 9), 0.0));  // Carbon--water oxygen bond breaks
  assert(near(bondOrder(products, 10), 1.0)); // Original bicarbonate OH stays with water
  assert(near(bondOrder(products, 12), 1.0)); // H-acid joins water oxygen
  assert(near(bondOrder(products, 14), 1.0)); // Na+ remains associated with acetate

  /* Timeline event metadata must match the C++ mechanism's keyframe bond orders. */
  assert(cv_mechanism_event_count() == CV_MECHANISM_EVENT_COUNT);
  const int expected_event_counts[] = {6, 4};
  const double expected_event_progress[] = {0.50, 1.00};
  for (int event = 0; event < CV_MECHANISM_EVENT_COUNT; ++event) {
    assert(cv_mechanism_event_change_count(event) == expected_event_counts[event]);
    assert(near(cv_mechanism_event_progress(event), expected_event_progress[event]));
    for (int change = 0; change < expected_event_counts[event]; ++change) {
      const int bond = cv_mechanism_event_bond_index(event, change);
      assert(bond >= 0 && bond < CV_MECHANISM_BOND_COUNT);
      const double before_expected = event == 0
        ? bondOrder(cv_mechanism_sample(0.0), bond)
        : bondOrder(cv_mechanism_sample(0.50), bond);
      const double before_reported = cv_mechanism_event_bond_before(event, change);
      const double after_reported = cv_mechanism_event_bond_after(event, change);
      const double after_expected = event == 0
        ? bondOrder(cv_mechanism_sample(0.50), bond)
        : bondOrder(cv_mechanism_sample(1.0), bond);
      assert(near(before_reported, before_expected));
      assert(near(after_reported, after_expected));
      assert(!near(before_reported, after_reported));
    }
  }
  assert(cv_mechanism_event_count() == 2);
  assert(near(cv_mechanism_event_progress(0), 0.50));
  assert(cv_mechanism_event_progress(-1) < 0.0);
  assert(cv_mechanism_event_change_count(2) == 0);
  assert(cv_mechanism_event_bond_index(0, 6) == -1);
  assert(cv_mechanism_event_bond_before(1, 4) < 0.0);
  assert(cv_mechanism_event_bond_after(-1, 0) < 0.0);

  /* All 14 mapped atom records survive every sampled frame with finite coordinates. */
  const double sample_points[] = {0.0, 0.20, 1.0 / 3.0, 0.50, 2.0 / 3.0, 0.75, 0.90, 1.0};
  for (double progress : sample_points) {
    const double *sample = cv_mechanism_sample(progress);
    for (int atom = 0; atom < CV_MECHANISM_ATOM_COUNT; ++atom) {
      const int offset = atom * CV_MECHANISM_ATOM_FIELDS;
      assert(std::isfinite(sample[offset]));
      assert(std::isfinite(sample[offset + 1]));
      assert(std::isfinite(sample[offset + 2]));
      assert(near(sample[offset + 3], 1.0));
    }
    for (int bond = 0; bond < CV_MECHANISM_BOND_COUNT; ++bond) {
      const double order = bondOrder(sample, bond);
      assert(std::isfinite(order));
      assert(order >= 0.0 && order <= 2.0);
    }
  }

  /* Progress is safely clamped and NaN holds the initial arrangement. */
  const double *negative = cv_mechanism_sample(-1.0);
  assert(near(bondOrder(negative, 3), 1.0));
  const double *beyond = cv_mechanism_sample(2.0);
  assert(near(bondOrder(beyond, 8), 2.0));
  const double *not_a_number = cv_mechanism_sample(std::nan(""));
  assert(near(bondOrder(not_a_number, 3), 1.0));

  assert(cv_mechanism_atom_element(-1) == 0);
  assert(cv_mechanism_atom_id(CV_MECHANISM_ATOM_COUNT) == 0);
  assert(cv_mechanism_bond_atom_a(-1) == -1);
  assert(cv_mechanism_bond_atom_b(CV_MECHANISM_BOND_COUNT) == -1);
  assert(cv_mechanism_bond_kind(-1) == -1);

  std::puts("CHEMVERSE atom-mapped reaction mechanism engine: all tests passed");
}
