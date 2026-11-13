#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CXX="${CXX:-g++}"
OUT_DIR="${TMPDIR:-/tmp}"
CHEMISTRY_OUT="$OUT_DIR/chemverse-chemistry-core-test"
KINETICS_OUT="$OUT_DIR/chemverse-kinetics-engine-test"

"$CXX" -std=c++17 -O2 -Wall -Wextra -Werror -pedantic \
  "$ROOT/cpp/chemistry_core.cpp" "$ROOT/tests/chemistry_core_test.cpp" -o "$CHEMISTRY_OUT"
"$CHEMISTRY_OUT"

"$CXX" -std=c++17 -O2 -Wall -Wextra -Werror -pedantic \
  "$ROOT/cpp/kinetics_engine.cpp" "$ROOT/tests/kinetics_engine_test.cpp" -o "$KINETICS_OUT"
"$KINETICS_OUT"

FIT_OUT="$OUT_DIR/chemverse-experimental-fit-test"
"$CXX" -std=c++17 -O2 -Wall -Wextra -Werror -pedantic \
  "$ROOT/cpp/experimental_fit.cpp" "$ROOT/tests/experimental_fit_test.cpp" -o "$FIT_OUT"
"$FIT_OUT"

CONCENTRATION_OUT="$OUT_DIR/chemverse-concentration-fit-test"
"$CXX" -std=c++17 -O2 -Wall -Wextra -Werror -pedantic \
  "$ROOT/cpp/concentration_fit.cpp" "$ROOT/tests/concentration_fit_test.cpp" -o "$CONCENTRATION_OUT"
"$CONCENTRATION_OUT"

MECHANISM_OUT="$OUT_DIR/chemverse-reaction-mechanism-test"
"$CXX" -std=c++17 -O2 -Wall -Wextra -Werror -pedantic \
  "$ROOT/cpp/reaction_mechanism.cpp" "$ROOT/tests/reaction_mechanism_test.cpp" -o "$MECHANISM_OUT"
"$MECHANISM_OUT"

rm -f "$CHEMISTRY_OUT" "$KINETICS_OUT" "$FIT_OUT" "$CONCENTRATION_OUT" "$MECHANISM_OUT"
