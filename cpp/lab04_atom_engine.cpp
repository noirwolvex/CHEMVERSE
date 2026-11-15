#include "lab04_atom_engine.h"

namespace {
constexpr double kCoordinateLimit = 100.0;
constexpr double kOrderLimit = 3.0;

double g_atom_input[CV_LAB04_ATOM_MAX_ATOMS * CV_LAB04_ATOM_INPUT_FIELDS]{};
double g_bond_input[CV_LAB04_ATOM_MAX_BONDS * CV_LAB04_BOND_INPUT_FIELDS]{};
double g_sample[CV_LAB04_ATOM_MAX_ATOMS * CV_LAB04_ATOM_OUTPUT_FIELDS +
                CV_LAB04_ATOM_MAX_BONDS]{};
int g_atom_count = 0;
int g_bond_count = 0;
int g_last_error = 0;

bool finiteNumber(double value) {
  return value == value && value <= 1.0e12 && value >= -1.0e12;
}

bool isIntegerInRange(double value, int minimum, int maximum) {
  if (!finiteNumber(value) || value < static_cast<double>(minimum) ||
      value > static_cast<double>(maximum)) return false;
  const int rounded = static_cast<int>(value);
  return value == static_cast<double>(rounded);
}

double clamp01(double value) {
  if (!finiteNumber(value) || value <= 0.0) return 0.0;
  if (value >= 1.0) return 1.0;
  return value;
}

double smoothStep(double value) {
  const double t = clamp01(value);
  return t * t * (3.0 - 2.0 * t);
}

double interpolate(double first, double second, double amount) {
  return first + (second - first) * amount;
}

double pathValue(double first, double middle, double last, double progress) {
  if (progress <= 0.5) {
    return interpolate(first, middle, smoothStep(progress * 2.0));
  }
  return interpolate(middle, last, smoothStep((progress - 0.5) * 2.0));
}
}  // namespace

extern "C" int cv_lab04_atom_engine_configure(int atom_count, int bond_count) {
  if (atom_count < 1 || atom_count > CV_LAB04_ATOM_MAX_ATOMS ||
      bond_count < 0 || bond_count > CV_LAB04_ATOM_MAX_BONDS) {
    g_atom_count = 0;
    g_bond_count = 0;
    g_last_error = 1;
    return 0;
  }
  g_atom_count = atom_count;
  g_bond_count = bond_count;
  g_last_error = 0;
  for (int i = 0; i < atom_count * CV_LAB04_ATOM_INPUT_FIELDS; ++i) {
    g_atom_input[i] = 0.0;
  }
  for (int i = 0; i < bond_count * CV_LAB04_BOND_INPUT_FIELDS; ++i) {
    g_bond_input[i] = 0.0;
  }
  return 1;
}

extern "C" double *cv_lab04_atom_engine_atom_input(void) {
  return g_atom_input;
}

extern "C" double *cv_lab04_atom_engine_bond_input(void) {
  return g_bond_input;
}

extern "C" int cv_lab04_atom_engine_atom_count(void) {
  return g_atom_count;
}

extern "C" int cv_lab04_atom_engine_bond_count(void) {
  return g_bond_count;
}

extern "C" const double *cv_lab04_atom_engine_sample(double progress) {
  if (cv_lab04_atom_engine_validate() != 1) {
    g_last_error = 2;
    return nullptr;
  }
  const double value = clamp01(progress);
  for (int atom = 0; atom < g_atom_count; ++atom) {
    const int input = atom * CV_LAB04_ATOM_INPUT_FIELDS;
    const int output = atom * CV_LAB04_ATOM_OUTPUT_FIELDS;
    for (int axis = 0; axis < 3; ++axis) {
      g_sample[output + axis] = pathValue(
          g_atom_input[input + 2 + axis],
          g_atom_input[input + 5 + axis],
          g_atom_input[input + 8 + axis], value);
    }
    g_sample[output + 3] = 1.0;
  }

  const int bond_output_offset = g_atom_count * CV_LAB04_ATOM_OUTPUT_FIELDS;
  for (int bond = 0; bond < g_bond_count; ++bond) {
    const int input = bond * CV_LAB04_BOND_INPUT_FIELDS;
    g_sample[bond_output_offset + bond] = pathValue(
        g_bond_input[input + 3],
        g_bond_input[input + 4],
        g_bond_input[input + 5], value);
  }
  g_last_error = 0;
  return g_sample;
}

extern "C" int cv_lab04_atom_engine_validate(void) {
  if (g_atom_count < 1 || g_atom_count > CV_LAB04_ATOM_MAX_ATOMS ||
      g_bond_count < 0 || g_bond_count > CV_LAB04_ATOM_MAX_BONDS) {
    return 0;
  }

  for (int atom = 0; atom < g_atom_count; ++atom) {
    const int offset = atom * CV_LAB04_ATOM_INPUT_FIELDS;
    if (!isIntegerInRange(g_atom_input[offset], 1, 118) ||
        !isIntegerInRange(g_atom_input[offset + 1], 1, 2147483647)) {
      return 0;
    }
    for (int axis = 0; axis < 9; ++axis) {
      const double coordinate = g_atom_input[offset + 2 + axis];
      if (!finiteNumber(coordinate) || coordinate < -kCoordinateLimit ||
          coordinate > kCoordinateLimit) {
        return 0;
      }
    }
    for (int previous = 0; previous < atom; ++previous) {
      const int previous_offset = previous * CV_LAB04_ATOM_INPUT_FIELDS;
      if (g_atom_input[previous_offset + 1] == g_atom_input[offset + 1]) {
        return 0;
      }
    }
  }

  for (int bond = 0; bond < g_bond_count; ++bond) {
    const int offset = bond * CV_LAB04_BOND_INPUT_FIELDS;
    if (!isIntegerInRange(g_bond_input[offset], 0, g_atom_count - 1) ||
        !isIntegerInRange(g_bond_input[offset + 1], 0, g_atom_count - 1) ||
        g_bond_input[offset] == g_bond_input[offset + 1] ||
        !isIntegerInRange(g_bond_input[offset + 2], 0, 1)) {
      return 0;
    }
    for (int stage = 0; stage < 3; ++stage) {
      const double order = g_bond_input[offset + 3 + stage];
      if (!finiteNumber(order) || order < 0.0 || order > kOrderLimit) return 0;
    }
    for (int previous = 0; previous < bond; ++previous) {
      const int prior = previous * CV_LAB04_BOND_INPUT_FIELDS;
      const bool same_direction =
          g_bond_input[prior] == g_bond_input[offset] &&
          g_bond_input[prior + 1] == g_bond_input[offset + 1];
      const bool reverse_direction =
          g_bond_input[prior] == g_bond_input[offset + 1] &&
          g_bond_input[prior + 1] == g_bond_input[offset];
      if (same_direction || reverse_direction) return 0;
    }
  }
  return 1;
}

extern "C" int cv_lab04_atom_engine_last_error(void) {
  return g_last_error;
}

extern "C" int cv_lab04_atom_engine_version(void) {
  return CV_LAB04_ATOM_ENGINE_VERSION;
}
