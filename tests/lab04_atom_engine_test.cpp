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

  /* Reconfigure the same C++ engine for the 28-atom, 24-bond AgCl model. */
  assert(cv_lab04_atom_engine_configure(28, 24) == 1);
  atoms = cv_lab04_atom_engine_atom_input();
  const int agcl_atomic_numbers[28] = {
    47,47,47,47, 17,17,17,17,
    7,8,8,8, 7,8,8,8, 7,8,8,8, 7,8,8,8,
    11,11,11,11
  };
  for (int atom = 0; atom < 28; ++atom) {
    const int offset = atom * CV_LAB04_ATOM_INPUT_FIELDS;
    atoms[offset] = agcl_atomic_numbers[atom];
    atoms[offset + 1] = 3001 + atom;
    for (int axis = 0; axis < 9; ++axis) {
      const double coordinate = static_cast<double>((atom % 7) - 3) * 0.35 +
                                static_cast<double>(axis % 3) * 0.12;
      atoms[offset + 2 + axis] = coordinate;
    }
  }

  bonds = cv_lab04_atom_engine_bond_input();
  int bond_index = 0;
  for (int group = 0; group < 4; ++group) {
    const int nitrogen = 8 + group * 4;
    for (int oxygen = 1; oxygen <= 3; ++oxygen) {
      const int offset = bond_index * CV_LAB04_BOND_INPUT_FIELDS;
      bonds[offset] = nitrogen;
      bonds[offset + 1] = nitrogen + oxygen;
      bonds[offset + 2] = 0;
      bonds[offset + 3] = 4.0 / 3.0;
      bonds[offset + 4] = 4.0 / 3.0;
      bonds[offset + 5] = 4.0 / 3.0;
      ++bond_index;
    }
  }
  const int vertex_to_atom[8] = {0,4,5,1,6,2,3,7};
  const int cube_edges[12][2] = {
    {0,1},{0,2},{0,4},{3,1},{3,2},{3,7},
    {5,1},{5,4},{5,7},{6,2},{6,4},{6,7}
  };
  for (int edge = 0; edge < 12; ++edge) {
    const int offset = bond_index * CV_LAB04_BOND_INPUT_FIELDS;
    bonds[offset] = vertex_to_atom[cube_edges[edge][0]];
    bonds[offset + 1] = vertex_to_atom[cube_edges[edge][1]];
    bonds[offset + 2] = 1;
    bonds[offset + 3] = 0.0;
    bonds[offset + 4] = edge < 4 ? 1.0 : 0.0;
    bonds[offset + 5] = 1.0;
    ++bond_index;
  }
  assert(bond_index == 24);
  assert(cv_lab04_atom_engine_validate() == 1);
  const int agcl_bond_offset = 28 * CV_LAB04_ATOM_OUTPUT_FIELDS;
  const double *dissolved = cv_lab04_atom_engine_sample(0.0);
  for (int bond = 12; bond < 24; ++bond) {
    assert(near(dissolved[agcl_bond_offset + bond], 0.0));
  }
  const double *nucleus = cv_lab04_atom_engine_sample(0.5);
  for (int bond = 12; bond < 16; ++bond) {
    assert(near(nucleus[agcl_bond_offset + bond], 1.0));
  }
  for (int bond = 16; bond < 24; ++bond) {
    assert(near(nucleus[agcl_bond_offset + bond], 0.0));
  }
  const double *lattice_fragment = cv_lab04_atom_engine_sample(1.0);
  for (int bond = 12; bond < 24; ++bond) {
    assert(near(lattice_fragment[agcl_bond_offset + bond], 1.0));
  }
  for (int atom = 0; atom < 28; ++atom) {
    const int offset = atom * CV_LAB04_ATOM_OUTPUT_FIELDS;
    for (int axis = 0; axis < 3; ++axis) {
      assert(std::isfinite(lattice_fragment[offset + axis]));
    }
  }

  std::puts("CHEMVERSE Lab 04 atom-mapped mechanism engine: all tests passed");
}
