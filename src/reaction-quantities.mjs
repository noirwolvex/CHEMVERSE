// Quantitative estimates for CH3COOH + NaHCO3 -> CH3COONa + H2O + CO2.
// Product molar masses: NIST Chemistry WebBook (CO2, H2O, sodium acetate).
// Gas constant: 2022 CODATA / NIST. Ideal-gas estimates assume all generated CO2 is gaseous.
export const PRODUCT_MOLAR_MASSES_G_MOL = Object.freeze({
  sodiumAcetateAnhydrous: 82.0338,
  water: 18.0153,
  carbonDioxide: 44.0095
});

export const MOLAR_GAS_CONSTANT_L_KPA_MOL_K = 8.31446261815324;

function finiteNumber(name, value) {
  if (!Number.isFinite(value)) {
    throw new TypeError(name + " must be a finite number.");
  }
  return value;
}

function productMassG(amountMmol, molarMassGPerMol) {
  return amountMmol * molarMassGPerMol / 1000;
}

function idealGasVolumeMl(amountMmol, temperatureC, pressureKpa) {
  const temperatureK = temperatureC + 273.15;
  return amountMmol * MOLAR_GAS_CONSTANT_L_KPA_MOL_K * temperatureK / pressureKpa;
}

function makeProductSet(extentMmol, temperatureC, pressureKpa) {
  return {
    extentMmol,
    sodiumAcetateMassG: productMassG(extentMmol, PRODUCT_MOLAR_MASSES_G_MOL.sodiumAcetateAnhydrous),
    waterMassG: productMassG(extentMmol, PRODUCT_MOLAR_MASSES_G_MOL.water),
    carbonDioxideMassG: productMassG(extentMmol, PRODUCT_MOLAR_MASSES_G_MOL.carbonDioxide),
    carbonDioxideIdealGasVolumeMl: idealGasVolumeMl(extentMmol, temperatureC, pressureKpa)
  };
}

export function calculateReactionQuantities({
  acidConcentrationM,
  bicarbonateConcentrationM,
  volumeMl,
  temperatureC,
  pressureKpa,
  currentExtentMmol = null
}) {
  acidConcentrationM = finiteNumber("acidConcentrationM", acidConcentrationM);
  bicarbonateConcentrationM = finiteNumber("bicarbonateConcentrationM", bicarbonateConcentrationM);
  volumeMl = finiteNumber("volumeMl", volumeMl);
  temperatureC = finiteNumber("temperatureC", temperatureC);
  pressureKpa = finiteNumber("pressureKpa", pressureKpa);

  if (acidConcentrationM < 0 || bicarbonateConcentrationM < 0) {
    throw new RangeError("Reactant concentrations cannot be negative.");
  }
  if (volumeMl <= 0) throw new RangeError("Solution volume must be greater than zero.");
  if (temperatureC <= -273.15) throw new RangeError("Temperature must be above absolute zero.");
  if (pressureKpa <= 0) throw new RangeError("Gas pressure must be greater than zero.");

  // M × mL has the numerical value mmol.
  const initialAcidMmol = acidConcentrationM * volumeMl;
  const initialBicarbonateMmol = bicarbonateConcentrationM * volumeMl;
  const theoreticalExtentMmol = Math.min(initialAcidMmol, initialBicarbonateMmol);
  const limitingReagent = initialAcidMmol === 0 && initialBicarbonateMmol === 0
    ? "none"
    : initialAcidMmol < initialBicarbonateMmol
      ? "acetic-acid"
      : initialBicarbonateMmol < initialAcidMmol
        ? "sodium-bicarbonate"
        : "equal";

  let current = null;
  if (currentExtentMmol !== null && currentExtentMmol !== undefined) {
    currentExtentMmol = finiteNumber("currentExtentMmol", currentExtentMmol);
    if (currentExtentMmol < 0 || currentExtentMmol > theoreticalExtentMmol + 1e-8) {
      throw new RangeError("Current reaction extent is outside the stoichiometric limit.");
    }
    current = makeProductSet(
      Math.min(currentExtentMmol, theoreticalExtentMmol),
      temperatureC,
      pressureKpa
    );
  }

  return {
    initialAcidMmol,
    initialBicarbonateMmol,
    temperatureC,
    pressureKpa,
    theoretical: {
      ...makeProductSet(theoreticalExtentMmol, temperatureC, pressureKpa),
      limitingReagent,
      acidRemainingMmol: initialAcidMmol - theoreticalExtentMmol,
      bicarbonateRemainingMmol: initialBicarbonateMmol - theoreticalExtentMmol
    },
    current
  };
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

export function buildReactionReportCsv({ inputs, quantities, model }) {
  if (!inputs || !quantities || !quantities.theoretical) {
    throw new TypeError("A complete reaction report requires inputs and calculated quantities.");
  }
  const theoretical = quantities.theoretical;
  const current = quantities.current;
  const rows = [
    ["parameter", "value", "unit"],
    ["reaction", "CH3COOH + NaHCO3 -> CH3COONa + H2O + CO2", ""],
    ["acid_concentration", inputs.acidConcentrationM, "mol/L"],
    ["sodium_bicarbonate_concentration", inputs.bicarbonateConcentrationM, "mol/L"],
    ["solution_volume", inputs.volumeMl, "mL"],
    ["temperature", inputs.temperatureC, "degC"],
    ["assumed_gas_pressure", inputs.pressureKpa, "kPa"],
    ["elapsed_simulation_time", inputs.elapsedSeconds, "s"],
    ["kinetic_model_enabled", Boolean(model && model.enabled), ""],
    ["rate_constant_k", model && model.rateConstant, "units depend on total reaction order"],
    ["acid_reaction_order_m", model && model.acidOrder, ""],
    ["bicarbonate_reaction_order_n", model && model.bicarbonateOrder, ""],
    ["activation_energy", model && model.activationEnergyKJ, "kJ/mol"],
    ["reference_temperature", model && model.referenceTemperatureC, "degC"],
    ["kinetics_parameter_source", model && model.source, ""],
    ["theoretical_extent", theoretical.extentMmol, "mmol"],
    ["theoretical_limiting_reagent", theoretical.limitingReagent, ""],
    ["theoretical_sodium_acetate_mass", theoretical.sodiumAcetateMassG, "g; anhydrous formula-unit equivalent, not isolated solid"],
    ["theoretical_water_mass", theoretical.waterMassG, "g; stoichiometric water formed"],
    ["theoretical_carbon_dioxide_mass", theoretical.carbonDioxideMassG, "g"],
    ["theoretical_carbon_dioxide_ideal_gas_volume", theoretical.carbonDioxideIdealGasVolumeMl, "mL; all CO2 assumed gaseous"],
    ["current_extent", current && current.extentMmol, "mmol; blank unless kinetic inputs are configured"],
    ["current_sodium_acetate_mass", current && current.sodiumAcetateMassG, "g; anhydrous formula-unit equivalent, not isolated solid"],
    ["current_water_mass", current && current.waterMassG, "g; stoichiometric water formed"],
    ["current_carbon_dioxide_mass", current && current.carbonDioxideMassG, "g"],
    ["current_carbon_dioxide_ideal_gas_volume", current && current.carbonDioxideIdealGasVolumeMl, "mL; ideal-gas estimate"],
    ["experiment_notes", inputs.notes || "", ""],
    ["model_scope", "Stoichiometric and optional user-parameterized kinetic model; not measured yield or molecular dynamics.", ""],
    ["gas_volume_assumptions", "Ideal gas; selected temperature and entered pressure; ignores dissolved CO2, gas-liquid transfer, water vapour and non-ideal effects.", ""]
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
