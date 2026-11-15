#include "../cpp/lab04_atom_engine.h"
#include <cassert>
#include <cmath>
#include <cstdio>

namespace {
bool near(double actual, double expected, double tolerance = 1.0e-9) {
  return std::fabs(actual - expected) <= tolerance * (1.0 + std::fabs(expected));
}
}

int main() {
  assert(cv_lab04_atom_engine_version() == 100);
  assert(cv_lab04_atom_engine_configure(8, 5) == 1);
  assert(cv_lab04_atom_engine_atom_count() == 8);
  assert(cv_lab04_atom_engine_bond_count() == 5);

  double *atoms = cv_lab04_atom_engine_atom_input();
  const int atomic_numbers[8] = {8, 1, 1, 1, 8, 1, 11, 17};
  const int atom_ids[8] = {1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008};
  const double positions[8][9] = {
    {-1.5,.55,0, -.9,.55,0, -1.2,.55,0},
    {-1.2,1.25,.3, -1.15,1.12,.2, -1.35,1.05,.2},
    {-2.1,.25,.3, -1.95,.3,.3, -1.95,.35,.3},
    {-1.4,-.25,0, -.1,-.05,0, .4,.95,0},
    {1.15,0,0, .45,-.1,0, 1.1,.55,0},
    {1.75,-.65,.3, 1.25,-.7,.3, 1.65,1.15,.3},
    {-.15,-1.5,-.4, -.15,-1.5,-.4, -.15,-1.5,-.4},
    {.45,-1.7,.4, .45,-1.7,.4, .45,-1.7,.4}
  };
  for (int atom = 0; atom < 8; ++atom) {
    const int offset = atom * CV_LAB04_ATOM_INPUT_FIELDS;
    atoms[offset] = atomic_numbers[atom];
    atoms[offset + 1] = atom_ids[atom];
    for (int field = 0; field < 9; ++field) {
      atoms[offset + 2 + field] = positions[atom][field];
    }
  }

  double *bonds = cv_lab04_atom_engine_bond_input();
  const int endpoints[5][2] = {{0,1},{0,2},{0,3},{4,5},{4,3}};
  const double orders[5][3] = {
    {1,1,1}, {1,1,1}, {1,.5,0}, {1,1,1}, {0,.5,1}
  };
  for (int bond = 0; bond < 5; ++bond) {
    const int offset = bond * CV_LAB04_BOND_INPUT_FIELDS;
    bonds[offset] = endpoints[bond][0];
    bonds[offset + 1] = endpoints[bond][1];
    bonds[offset + 2] = 0;
    for (int stage = 0; stage < 3; ++stage) {
      bonds[offset + 3 + stage] = orders[bond][stage];
    }
  }

  assert(cv_lab04_atom_engine_validate() == 1);
  const int hydrogen_before = (atomic_numbers[1] == 1) + (atomic_numbers[2] == 1) +
      (atomic_numbers[3] == 1) + (atomic_numbers[5] == 1);
  assert(hydrogen_before == 4);
  const int oxygen_before = (atomic_numbers[0] == 8) + (atomic_numbers[4] == 8);
  assert(oxygen_before == 2);

  const double *start = cv_lab04_atom_engine_sample(0.0);
  assert(start != nullptr && cv_lab04_atom_engine_last_error() == 0);
  const int bond_offset = 8 * CV_LAB04_ATOM_OUTPUT_FIELDS;
  assert(near(start[bond_offset + 2], 1.0));
  assert(near(start[bond_offset + 4], 0.0));

  const double *transition = cv_lab04_atom_engine_sample(0.5);
  assert(transition != nullptr);
  assert(near(transition[bond_offset + 2], 0.5));
  assert(near(transition[bond_offset + 4], 0.5));
  const int transfer_atom_offset = 3 * CV_LAB04_ATOM_OUTPUT_FIELDS;
  assert(near(transition[transfer_atom_offset], -.1));
  assert(near(transition[transfer_atom_offset + 1], -.05));

  const double *products = cv_lab04_atom_engine_sample(1.0);
  assert(products != nullptr);
  assert(near(products[bond_offset + 2], 0.0));
  assert(near(products[bond_offset + 4], 1.0));
  for (int atom = 0; atom < 8; ++atom) {
    const int offset = atom * CV_LAB04_ATOM_OUTPUT_FIELDS;
    assert(near(products[offset + 3], 1.0));
    for (int axis = 0; axis < 3; ++axis) {
      assert(std::isfinite(products[offset + axis]));
    }
  }

  assert(cv_lab04_atom_engine_configure(0, 1) == 0);
  assert(cv_lab04_atom_engine_last_error() == 1);
  assert(cv_lab04_atom_engine_atom_count() == 0);

  assert(cv_lab04_atom_engine_configure(2, 2) == 1);
  atoms = cv_lab04_atom_engine_atom_input();
  for (int atom = 0; atom < 2; ++atom) {
    const int offset = atom * CV_LAB04_ATOM_INPUT_FIELDS;
    atoms[offset] = atom == 0 ? 1 : 8;
    atoms[offset + 1] = 2001 + atom;
  }
  bonds = cv_lab04_atom_engine_bond_input();
  for (int bond = 0; bond < 2; ++bond) {
    const int offset = bond * CV_LAB04_BOND_INPUT_FIELDS;
    bonds[offset] = 0; bonds[offset + 1] = 1; bonds[offset + 2] = 0;
  }
  assert(cv_lab04_atom_engine_validate() == 0);

  std::puts("CHEMVERSE Lab 04 atom-mapped mechanism engine: all tests passed");
}
