#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CXX="${CXX:-g++}"
OUT="${TMPDIR:-/tmp}/chemverse-chemistry-core-test"
"$CXX" -std=c++17 -O2 -Wall -Wextra -Werror -pedantic \
  "$ROOT/cpp/chemistry_core.cpp" "$ROOT/tests/chemistry_core_test.cpp" -o "$OUT"
"$OUT"
rm -f "$OUT"
