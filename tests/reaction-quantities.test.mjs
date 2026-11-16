import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReactionReportCsv,
  calculateReactionQuantities,
  MOLAR_GAS_CONSTANT_L_KPA_MOL_K,
  PRODUCT_MOLAR_MASSES_G_MOL
} from "../src/reaction-quantities.mjs";

const standardInput = {
  acidConcentrationM: 0.1,
  bicarbonateConcentrationM: 0.08,
  volumeMl: 100,
  temperatureC: 25,
  pressureKpa: 101.325
};

test("computes 1:1 limiting reagent and theoretical product amounts", () => {
  const result = calculateReactionQuantities(standardInput);
  assert.equal(result.initialAcidMmol, 10);
  assert.equal(result.initialBicarbonateMmol, 8);
  assert.equal(result.theoretical.extentMmol, 8);
  assert.equal(result.theoretical.limitingReagent, "sodium-bicarbonate");
  assert.equal(result.theoretical.acidRemainingMmol, 2);
  assert.equal(result.theoretical.bicarbonateRemainingMmol, 0);
  assert.ok(Math.abs(result.theoretical.sodiumAcetateMassG - 0.6562704) < 1e-9);
  assert.ok(Math.abs(result.theoretical.waterMassG - 0.1441224) < 1e-9);
  assert.ok(Math.abs(result.theoretical.carbonDioxideMassG - 0.352076) < 1e-9);
});

test("calculates ideal-gas CO2 volume at selected temperature and pressure", () => {
  const result = calculateReactionQuantities(standardInput);
  const expected = 8 * MOLAR_GAS_CONSTANT_L_KPA_MOL_K * 298.15 / 101.325;
  assert.ok(Math.abs(result.theoretical.carbonDioxideIdealGasVolumeMl - expected) < 1e-10);
  assert.ok(result.theoretical.carbonDioxideIdealGasVolumeMl > 195);
  assert.ok(result.theoretical.carbonDioxideIdealGasVolumeMl < 197);
});

test("current product values remain absent unless a kinetic extent is explicitly supplied", () => {
  const withoutKinetics = calculateReactionQuantities(standardInput);
  assert.equal(withoutKinetics.current, null);

  const withKinetics = calculateReactionQuantities({
    ...standardInput,
    currentExtentMmol: 4
  });
  assert.equal(withKinetics.current.extentMmol, 4);
  assert.ok(Math.abs(withKinetics.current.carbonDioxideMassG - 0.176038) < 1e-9);
  assert.equal(withKinetics.current.carbonDioxideIdealGasVolumeMl,
    4 * MOLAR_GAS_CONSTANT_L_KPA_MOL_K * 298.15 / 101.325);
});

test("identifies acid-limited and equal-reactant cases", () => {
  const acidLimited = calculateReactionQuantities({
    ...standardInput,
    acidConcentrationM: 0.04,
    bicarbonateConcentrationM: 0.08
  });
  assert.equal(acidLimited.theoretical.limitingReagent, "acetic-acid");
  assert.equal(acidLimited.theoretical.extentMmol, 4);

  const equal = calculateReactionQuantities({
    ...standardInput,
    acidConcentrationM: 0.08
  });
  assert.equal(equal.theoretical.limitingReagent, "equal");
});

test("rejects invalid physical inputs and extents above the stoichiometric limit", () => {
  assert.throws(() => calculateReactionQuantities({ ...standardInput, pressureKpa: 0 }), /pressure/);
  assert.throws(() => calculateReactionQuantities({ ...standardInput, temperatureC: -273.15 }), /absolute zero/);
  assert.throws(() => calculateReactionQuantities({ ...standardInput, volumeMl: 0 }), /volume/);
  assert.throws(() => calculateReactionQuantities({ ...standardInput, currentExtentMmol: 9 }), /stoichiometric limit/);
  assert.throws(() => calculateReactionQuantities({ ...standardInput, acidConcentrationM: Number.NaN }), /finite number/);
});

test("uses NIST molar-mass values for the anhydrous products", () => {
  assert.equal(PRODUCT_MOLAR_MASSES_G_MOL.sodiumAcetateAnhydrous, 82.0338);
  assert.equal(PRODUCT_MOLAR_MASSES_G_MOL.water, 18.0153);
  assert.equal(PRODUCT_MOLAR_MASSES_G_MOL.carbonDioxide, 44.0095);
});

test("exports a CSV report and safely quotes experiment notes", () => {
  const quantities = calculateReactionQuantities({
    ...standardInput,
    currentExtentMmol: 4
  });
  const csv = buildReactionReportCsv({
    inputs: { ...standardInput, elapsedSeconds: 3.5, notes: 'colour changed, then "bubbles"' },
    quantities,
    model: { enabled: true, rateConstant: 0.02, acidOrder: 1, bicarbonateOrder: 1, source: "lab run 01" }
  });
  assert.match(csv, /parameter,value,unit/);
  assert.match(csv, /theoretical_extent,8,mmol/);
  assert.match(csv, /"colour changed, then ""bubbles"""/);
  assert.match(csv, /current_extent,4,mmol/);
});
