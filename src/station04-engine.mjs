const wasmUrl = (name) => new URL(`../wasm/${name}.wasm`, import.meta.url);

async function instantiateChemistryModule(name) {
  const url = wasmUrl(name);
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Unable to load ${name}.wasm: HTTP ${response.status}`);

  let result;
  if (WebAssembly.instantiateStreaming) {
    try {
      result = await WebAssembly.instantiateStreaming(response.clone(), {});
    } catch {
      result = await WebAssembly.instantiate(await response.arrayBuffer(), {});
    }
  } else {
    result = await WebAssembly.instantiate(await response.arrayBuffer(), {});
  }
  return result.instance.exports;
}

let station04Promise;
let station04Exports = null;
let kineticsPromise;

export function loadStation04Engine() {
  if (!station04Promise) {
    station04Promise = instantiateChemistryModule('station04_engine').then((exports) => {
      const required = ['memory', 'cv_s04_profile', 'cv_s04_effects',
        'cv_s04_validate_profile', 'cv_s04_engine_version'];
      for (const name of required) {
        if (!(name in exports)) throw new Error(`Station 04 WASM export missing: ${name}`);
      }
      if (exports.cv_s04_engine_version() !== 100) {
        throw new Error('Unsupported Station 04 WASM engine version');
      }
      station04Exports = exports;
      return exports;
    });
  }
  return station04Promise;
}

export function sampleStation04ReactionNow(reactionNumber, progress) {
  if (!station04Exports) return null;
  const id = Math.trunc(Number(reactionNumber));
  if (!Number.isInteger(id) || station04Exports.cv_s04_validate_profile(id) !== 1) return null;
  const profilePointer = station04Exports.cv_s04_profile(id);
  const profile = Array.from(new Float64Array(station04Exports.memory.buffer, profilePointer, 8));
  const effectsPointer = station04Exports.cv_s04_effects(id, Number(progress));
  const effects = Array.from(new Float64Array(station04Exports.memory.buffer, effectsPointer, 8));
  return { profile, effects, source: 'cpp-wasm' };
}

export async function sampleStation04Reaction(reactionNumber, progress) {
  const engine = await loadStation04Engine();
  const id = Math.trunc(Number(reactionNumber));
  if (!Number.isInteger(id) || engine.cv_s04_validate_profile(id) !== 1) {
    throw new RangeError(`No Station 04 reaction profile for id ${reactionNumber}`);
  }

  const profilePointer = engine.cv_s04_profile(id);
  const profile = Array.from(new Float64Array(
    engine.memory.buffer, profilePointer, 8
  ));
  const effectsPointer = engine.cv_s04_effects(id, Number(progress));
  const effects = Array.from(new Float64Array(
    engine.memory.buffer, effectsPointer, 8
  ));
  return { profile, effects, source: 'cpp-wasm' };
}

export function loadKineticsEngine() {
  if (!kineticsPromise) {
    kineticsPromise = instantiateChemistryModule('kinetics_engine').then((exports) => {
      const required = ['memory', 'cv_kinetics_simulate', 'cv_kinetics_last_error',
        'cv_kinetics_last_steps', 'cv_kinetics_effective_k',
        'cv_kinetics_atom_balance_ok', 'cv_kinetics_engine_version'];
      for (const name of required) {
        if (!(name in exports)) throw new Error(`Kinetics WASM export missing: ${name}`);
      }
      if (exports.cv_kinetics_engine_version() !== 100) {
        throw new Error('Unsupported kinetics WASM engine version');
      }
      return exports;
    });
  }
  return kineticsPromise;
}

export async function simulateStation04Kinetics(parameters) {
  const engine = await loadKineticsEngine();
  const {
    amountAMmol, amountBMmol, volumeMl, rateConstant, orderA, orderB,
    temperatureC, referenceTemperatureC, activationEnergyKjMol,
    useArrhenius = true, durationSeconds = 20, maximumStepSeconds = 0.05,
    sampleCount = 101
  } = parameters || {};

  const pointer = engine.cv_kinetics_simulate(
    Number(amountAMmol), Number(amountBMmol), Number(volumeMl),
    Number(rateConstant), Number(orderA), Number(orderB),
    Number(temperatureC), Number(referenceTemperatureC),
    Number(activationEnergyKjMol ?? 0), useArrhenius ? 1 : 0,
    Number(durationSeconds), Number(maximumStepSeconds), Number(sampleCount)
  );
  const error = engine.cv_kinetics_last_error();
  if (!pointer || error !== 0 || engine.cv_kinetics_atom_balance_ok() !== 1) {
    throw new Error(`Kinetics simulation failed (engine error ${error})`);
  }

  const count = Number(sampleCount);
  const view = new Float64Array(
    engine.memory.buffer, pointer, count * 6
  );
  const rows = Array.from({ length: count }, (_, index) =>
    Array.from(view.slice(index * 6, index * 6 + 6))
  );
  return {
    rows,
    effectiveRateConstant: engine.cv_kinetics_effective_k(),
    integrationSteps: engine.cv_kinetics_last_steps(),
    atomBalanceOk: engine.cv_kinetics_atom_balance_ok() === 1,
    source: 'cpp-wasm'
  };
}
