#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLANGXX="${CLANGXX:-clang++}"
mkdir -p "$ROOT/wasm"

# Existing stoichiometry module: keep its stable browser ABI intact.
"$CLANGXX" --target=wasm32-unknown-unknown -std=c++17 -O3 -Wall -Wextra -Werror -pedantic \
  -nostdlib -fno-exceptions -fno-rtti -fvisibility=hidden \
  -Wl,--no-entry -Wl,--export-memory \
  -Wl,--export=cv_calculate_reaction -Wl,--export=cv_demo_progress \
  -Wl,--export=cv_reaction_is_balanced -Wl,--export=cv_engine_version \
  -Wl,--strip-all "$ROOT/cpp/chemistry_core.cpp" -o "$ROOT/wasm/chemistry_core.wasm"

# Independent kinetics module: separate memory and ABI prevent cross-engine coupling.
"$CLANGXX" --target=wasm32-unknown-unknown -std=c++17 -O3 -Wall -Wextra -Werror -pedantic \
  -nostdlib -fno-exceptions -fno-rtti -fvisibility=hidden \
  -Wl,--no-entry -Wl,--export-memory \
  -Wl,--export=cv_kinetics_simulate -Wl,--export=cv_kinetics_last_error \
  -Wl,--export=cv_kinetics_last_steps -Wl,--export=cv_kinetics_effective_k \
  -Wl,--export=cv_kinetics_atom_balance_ok -Wl,--export=cv_kinetics_engine_version \
  -Wl,--strip-all "$ROOT/cpp/kinetics_engine.cpp" -o "$ROOT/wasm/kinetics_engine.wasm"

# Experimental initial-rate parameter fitting module.
"$CLANGXX" --target=wasm32-unknown-unknown -std=c++17 -O3 -Wall -Wextra -Werror -pedantic \
  -nostdlib -fno-exceptions -fno-rtti -fvisibility=hidden \
  -Wl,--no-entry -Wl,--export-memory \
  -Wl,--export=cv_fit_input_buffer -Wl,--export=cv_fit_initial_rates \
  -Wl,--export=cv_fit_last_error -Wl,--export=cv_fit_engine_version \
  -Wl,--strip-all "$ROOT/cpp/experimental_fit.cpp" -o "$ROOT/wasm/experimental_fit.wasm"

printf 'Built %s, %s, and %s\\n' \
  "$ROOT/wasm/chemistry_core.wasm" "$ROOT/wasm/kinetics_engine.wasm" "$ROOT/wasm/experimental_fit.wasm"
