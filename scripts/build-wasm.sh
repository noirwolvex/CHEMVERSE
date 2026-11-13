#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLANGXX="${CLANGXX:-clang++}"
mkdir -p "$ROOT/wasm"
"$CLANGXX" --target=wasm32-unknown-unknown -std=c++17 -O3 -Wall -Wextra -Werror -pedantic \
  -nostdlib -fno-exceptions -fno-rtti -fvisibility=hidden \
  -Wl,--no-entry -Wl,--export-memory \
  -Wl,--export=cv_calculate_reaction -Wl,--export=cv_demo_progress \
  -Wl,--export=cv_reaction_is_balanced -Wl,--export=cv_engine_version \
  -Wl,--strip-all "$ROOT/cpp/chemistry_core.cpp" -o "$ROOT/wasm/chemistry_core.wasm"
printf 'Built %s\n' "$ROOT/wasm/chemistry_core.wasm"
