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

rm -f "$CHEMISTRY_OUT" "$KINETICS_OUT"
