import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getDisplayProgress, getReactionStage, getStageVisuals } from './reaction-stages.mjs';
import { parseInitialRatesCsv, INITIAL_RATES_CSV_TEMPLATE } from './experimental-data.mjs';
import { parseConcentrationTimeCsv, CONCENTRATION_TIME_CSV_TEMPLATE } from './concentration-data.mjs';

const view = document.getElementById('molecule-view');
const loading = document.getElementById('scene-loading');
const timeline = document.getElementById('timeline');
const temperature = document.getElementById('temperature');
const speedSelect = document.getElementById('speed-select');
const playButton = document.getElementById('play-toggle');
const playLabel = document.getElementById('play-label');
const timeReadout = document.getElementById('time-readout');
const temperatureReadout = document.getElementById('temperature-readout');
const acidAmountInput = document.getElementById('acid-amount');
const bicarbonateAmountInput = document.getElementById('bicarbonate-amount');
const acidAmountReadout = document.getElementById('acid-amount-readout');
const bicarbonateAmountReadout = document.getElementById('bicarbonate-amount-readout');
const engineStatus = document.getElementById('engine-status');
const engineState = document.getElementById('engine-state');
const limitingReagentOutput = document.getElementById('limiting-reagent');
const acidRemainingOutput = document.getElementById('acid-remaining');
const bicarbonateRemainingOutput = document.getElementById('bicarbonate-remaining');
const sodiumAcetateOutput = document.getElementById('sodium-acetate-output');
const waterOutput = document.getElementById('water-output');
const carbonDioxideOutput = document.getElementById('co2-output');
const atomIntegrity = document.getElementById('atom-integrity');
const progressReadout = document.getElementById('progress-readout');
const stageCaption = document.getElementById('stage-caption');
const moleculeLabel = document.getElementById('molecule-label');
const statusTitle = document.getElementById('status-title');
const statusDescription = document.getElementById('status-description');
const statusIcon = document.getElementById('status-icon');
const chart = document.getElementById('reaction-chart');
const chartContext = chart.getContext('2d');
const volumeInput = document.getElementById('volume-ml');
const rateConstantInput = document.getElementById('rate-constant');
const acidOrderInput = document.getElementById('acid-order');
const bicarbonateOrderInput = document.getElementById('bicarbonate-order');
const referenceTemperatureInput = document.getElementById('reference-temperature');
const activationEnergyInput = document.getElementById('activation-energy');
const durationInput = document.getElementById('duration-seconds');
const kineticsSourceInput = document.getElementById('kinetics-source');
const kineticsParameterStatus = document.getElementById('kinetics-parameter-status');
const rateConstantUnit = document.getElementById('rate-constant-unit');
const acidConcentrationOutput = document.getElementById('acid-concentration-output');
const bicarbonateConcentrationOutput = document.getElementById('bicarbonate-concentration-output');
const reactionRateOutput = document.getElementById('reaction-rate-output');
const effectiveKOutput = document.getElementById('effective-k-output');
const chartDuration = document.getElementById('chart-duration');
const chartTitle = document.getElementById('chart-title');
const chartDescription = document.getElementById('chart-description');
const initialRatesFileInput = document.getElementById('initial-rates-file');
const downloadFitTemplateButton = document.getElementById('download-fit-template');
const analyzeInitialRatesButton = document.getElementById('analyze-initial-rates');
const applyFittedParametersButton = document.getElementById('apply-fitted-parameters');
const fitFileStatus = document.getElementById('fit-file-status');
const fitPreview = document.getElementById('fit-preview');
const fitPreviewCount = document.getElementById('fit-preview-count');
const fitPreviewBody = document.getElementById('fit-preview-body');
const fitResults = document.getElementById('fit-results');
const fitTemperatureResult = document.getElementById('fit-temperature-result');
const fitKResult = document.getElementById('fit-k-result');
const fitMResult = document.getElementById('fit-m-result');
const fitNResult = document.getElementById('fit-n-result');
const fitEquation = document.getElementById('fit-equation');
const fitKUnits = document.getElementById('fit-k-units');
const fitR2Result = document.getElementById('fit-r2-result');
const fitRmseResult = document.getElementById('fit-rmse-result');
const fitOrdersSeResult = document.getElementById('fit-orders-se-result');
const fitKSeResult = document.getElementById('fit-k-se-result');
const concentrationTimeFileInput = document.getElementById('concentration-time-file');
const downloadConcentrationTemplateButton = document.getElementById('download-concentration-template');
const analyzeConcentrationTimeButton = document.getElementById('analyze-concentration-time');
const concentrationTimeStatus = document.getElementById('concentration-time-status');
const concentrationTimePreview = document.getElementById('concentration-time-preview');
const concentrationTimePreviewCount = document.getElementById('concentration-time-preview-count');
const concentrationTimePreviewBody = document.getElementById('concentration-time-preview-body');
const initialWindowPointsInput = document.getElementById('initial-window-points');
const rateAgreementToleranceInput = document.getElementById('rate-agreement-tolerance');
const concentrationTimeResults = document.getElementById('concentration-time-results');
const concentrationTimeResultsBody = document.getElementById('concentration-time-results-body');
const concentrationTimeResultsCount = document.getElementById('concentration-time-results-count');
const concentrationFitKOutput = document.getElementById('concentration-fit-k');
const concentrationFitMOutput = document.getElementById('concentration-fit-m');
const concentrationFitNOutput = document.getElementById('concentration-fit-n');
const concentrationFitR2Output = document.getElementById('concentration-fit-r2');
const applyConcentrationFitButton = document.getElementById('apply-concentration-fit');

const KINETICS_SAMPLE_COUNT = 121;
const KINETICS_MAX_STEP_SECONDS = 0.05;
const atomPalette = {
  C: { color: 0x9eafb5, radius: 0.235, roughness: 0.3, metalness: 0.22 },
  H: { color: 0xf1f5ef, radius: 0.135, roughness: 0.22, metalness: 0.08 },
  O: { color: 0xed7774, radius: 0.205, roughness: 0.25, metalness: 0.12 },
  Na: { color: 0xa98bf0, radius: 0.285, roughness: 0.28, metalness: 0.14 }
};

let renderer;
let scene;
let camera;
let orbit;
let animationFrame = 0;
let previousFrame = 0;
let elapsed = 0;
let playing = false;
let playbackSpeed = 1;
let temperatureC = 25;
let volumeMl = Number(volumeInput.value);
let acidConcentrationM = Number(acidAmountInput.value);
let bicarbonateConcentrationM = Number(bicarbonateAmountInput.value);
let acidAmountMmol = acidConcentrationM * volumeMl;
let bicarbonateAmountMmol = bicarbonateConcentrationM * volumeMl;
let durationSeconds = Number(durationInput.value);
let rateConstant = null;
let acidReactionOrder = null;
let bicarbonateReactionOrder = null;
let referenceTemperatureC = Number(referenceTemperatureInput.value);
let activationEnergyKJ = null;
let kineticsCurve = null;
let kineticsConfigured = false;
let simulationAvailable = false;
let effectiveRateConstant = 0;
let chemistryCore = null;
let kineticsCore = null;
let fittingCore = null;
let concentrationFitCore = null;
let importedExperiments = null;
let importedConcentrationSeries = null;
let latestExperimentalFit = null;
let species = {};

const smoothStep = (a, b, value) => {
  const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

async function loadChemistryCore() {
  const response = await fetch(new URL('../wasm/chemistry_core.wasm', import.meta.url));
  if (!response.ok) throw new Error('WebAssembly core request failed: HTTP ' + response.status);
  const bytes = await response.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const api = instance.exports;
  const chemistryRequired = ['memory', 'cv_calculate_reaction', 'cv_reaction_is_balanced', 'cv_engine_version'];
  for (const name of chemistryRequired) {
    if (!(name in api)) throw new Error('Missing chemistry WebAssembly export: ' + name);
  }
  if (api.cv_reaction_is_balanced() !== 1) throw new Error('C++ reaction formula validation failed.');
  chemistryCore = api;

  const kineticsResponse = await fetch(new URL('../wasm/kinetics_engine.wasm', import.meta.url));
  if (!kineticsResponse.ok) throw new Error('Kinetics WebAssembly request failed: HTTP ' + kineticsResponse.status);
  const kineticsBytes = await kineticsResponse.arrayBuffer();
  const kineticsInstance = await WebAssembly.instantiate(kineticsBytes, {});
  kineticsCore = kineticsInstance.instance.exports;
  const kineticsRequired = [
    'memory', 'cv_kinetics_simulate', 'cv_kinetics_last_error',
    'cv_kinetics_last_steps', 'cv_kinetics_effective_k',
    'cv_kinetics_atom_balance_ok', 'cv_kinetics_engine_version'
  ];
  for (const name of kineticsRequired) {
    if (!(name in kineticsCore)) throw new Error('Missing kinetics WebAssembly export: ' + name);
  }

  const fitResponse = await fetch(new URL('../wasm/experimental_fit.wasm', import.meta.url));
  if (!fitResponse.ok) throw new Error('Experimental fitting WebAssembly request failed: HTTP ' + fitResponse.status);
  const fitBytes = await fitResponse.arrayBuffer();
  const fitInstance = await WebAssembly.instantiate(fitBytes, {});
  fittingCore = fitInstance.instance.exports;
  const fitRequired = ['memory', 'cv_fit_input_buffer', 'cv_fit_initial_rates', 'cv_fit_last_error', 'cv_fit_engine_version'];
  for (const name of fitRequired) {
    if (!(name in fittingCore)) throw new Error('Missing fitting WebAssembly export: ' + name);
  }

  const concentrationResponse = await fetch(new URL('../wasm/concentration_fit.wasm', import.meta.url));
  if (!concentrationResponse.ok) {
    throw new Error('Concentration-time WebAssembly request failed: HTTP ' + concentrationResponse.status);
  }
  const concentrationBytes = await concentrationResponse.arrayBuffer();
  const concentrationInstance = await WebAssembly.instantiate(concentrationBytes, {});
  concentrationFitCore = concentrationInstance.instance.exports;
  const concentrationRequired = [
    'memory', 'cv_concentration_fit_input_buffer', 'cv_concentration_fit_initial_rates',
    'cv_concentration_fit_last_error', 'cv_concentration_fit_engine_version'
  ];
  for (const name of concentrationRequired) {
    if (!(name in concentrationFitCore)) {
      throw new Error('Missing concentration-time WebAssembly export: ' + name);
    }
  }

  engineStatus.classList.add('is-ready');
  engineState.textContent = 'Stoichiometry v' + (api.cv_engine_version() / 100).toFixed(2) +
    ' · Kinetics v' + (kineticsCore.cv_kinetics_engine_version() / 100).toFixed(2) +
    ' · Fit v' + (fittingCore.cv_fit_engine_version() / 100).toFixed(2) +
    ' · dC/dt v' + (concentrationFitCore.cv_concentration_fit_engine_version() / 100).toFixed(2);
  if (importedExperiments) analyzeInitialRatesButton.disabled = false;
  if (importedConcentrationSeries) analyzeConcentrationTimeButton.disabled = false;
}

function optionalNumber(input) {
  const value = input.value.trim();
  if (value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function updateRateConstantUnits() {
  if (acidReactionOrder === null || bicarbonateReactionOrder === null ||
      !Number.isFinite(acidReactionOrder) || !Number.isFinite(bicarbonateReactionOrder)) {
    rateConstantUnit.textContent = 'أدخل رتبتي التفاعل لمعرفة وحدات k.';
    return;
  }
  const exponent = 1 - acidReactionOrder - bicarbonateReactionOrder;
  const power = Math.abs(exponent) < 1e-9 ? '' :
    (Math.abs(exponent - 1) < 1e-9 ? 'M·' : 'M^' + exponent.toFixed(2).replace(/\.00$/, '') + '·');
  rateConstantUnit.textContent = 'وحدات k: ' + power + 's⁻¹ · الرتبة الكلية = ' +
    (acidReactionOrder + bicarbonateReactionOrder).toFixed(2);
}

function buildKineticsCurve() {
  rateConstant = optionalNumber(rateConstantInput);
  acidReactionOrder = optionalNumber(acidOrderInput);
  bicarbonateReactionOrder = optionalNumber(bicarbonateOrderInput);
  activationEnergyKJ = optionalNumber(activationEnergyInput);
  volumeMl = Number(volumeInput.value);
  const volumeIsValid = Number.isFinite(volumeMl) && volumeMl > 0;
  acidAmountMmol = volumeIsValid ? acidConcentrationM * volumeMl : 0;
  bicarbonateAmountMmol = volumeIsValid ? bicarbonateConcentrationM * volumeMl : 0;
  const requestedDurationSeconds = Number(durationInput.value);
  durationSeconds = Number.isFinite(requestedDurationSeconds) && requestedDurationSeconds > 0
    ? requestedDurationSeconds : 18;
  referenceTemperatureC = Number(referenceTemperatureInput.value);
  updateRateConstantUnits();

  const hasOrders = acidReactionOrder !== null && bicarbonateReactionOrder !== null;
  const hasActivationEnergy = activationEnergyKJ !== null;
  const valid = Number.isFinite(volumeMl) && volumeMl > 0 &&
    Number.isFinite(requestedDurationSeconds) && requestedDurationSeconds > 0 && requestedDurationSeconds <= 1.0e7 &&
    Number.isFinite(referenceTemperatureC) && referenceTemperatureC > -273.15 &&
    Number.isFinite(rateConstant) && rateConstant > 0 &&
    hasOrders && Number.isFinite(acidReactionOrder) && Number.isFinite(bicarbonateReactionOrder) &&
    acidReactionOrder >= 0 && bicarbonateReactionOrder >= 0 &&
    acidReactionOrder <= 4 && bicarbonateReactionOrder <= 4 &&
    acidReactionOrder + bicarbonateReactionOrder <= 6 &&
    kineticsSourceInput.value.trim().length > 0 &&
    (!hasActivationEnergy || (Number.isFinite(activationEnergyKJ) && activationEnergyKJ >= 0));

  timeline.max = String(Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 18);
  chartDuration.textContent = timeline.max + ' s';

  if (!valid) {
    kineticsCurve = null;
    kineticsConfigured = false;
    effectiveRateConstant = 0;
    const kineticsInputsStarted = [
      rateConstantInput,
      acidOrderInput,
      bicarbonateOrderInput,
      activationEnergyInput,
      kineticsSourceInput
    ].some((input) => input.value.trim() !== '');
    simulationAvailable = !kineticsInputsStarted;
    kineticsParameterStatus.classList.remove('is-ready', 'is-error');
    kineticsParameterStatus.textContent = simulationAvailable
      ? 'وضع العرض المرئي فقط: ستُعرض المراحل الثلاث بالتتابع، دون احتساب سرعة تفاعل أو نواتج كمية.'
      : 'مدخلات الحركية غير مكتملة أو غير صالحة. أكمل k والرتبتين والمرجع، أو أفرغ حقول الحركية لتشغيل العرض المرئي فقط.';
    chartTitle.textContent = simulationAvailable ? 'تسلسل العرض البصري' : 'الحركية غير متاحة';
    chartDescription.textContent = simulationAvailable
      ? 'مؤشر زمني لمراحل العرض فقط؛ لا يمثل تحولاً كيميائياً محسوباً.'
      : 'أكمل مدخلات الحركية الصحيحة لتوليد منحنى علمي.';
    playButton.disabled = !simulationAvailable;
    timeline.disabled = !simulationAvailable;
    return false;
  }

  const pointer = kineticsCore.cv_kinetics_simulate(
    acidAmountMmol, bicarbonateAmountMmol, volumeMl,
    rateConstant, acidReactionOrder, bicarbonateReactionOrder,
    temperatureC, referenceTemperatureC,
    hasActivationEnergy ? activationEnergyKJ : 0,
    hasActivationEnergy ? 1 : 0,
    durationSeconds,
    Math.min(KINETICS_MAX_STEP_SECONDS, durationSeconds / (KINETICS_SAMPLE_COUNT - 1)),
    KINETICS_SAMPLE_COUNT
  );

  if (pointer === 0 || kineticsCore.cv_kinetics_last_error() !== 0) {
    const errorCode = kineticsCore.cv_kinetics_last_error();
    kineticsCurve = null;
    kineticsConfigured = false;
    simulationAvailable = false;
    effectiveRateConstant = 0;
    kineticsParameterStatus.classList.remove('is-ready');
    kineticsParameterStatus.classList.add('is-error');
    kineticsParameterStatus.textContent = errorCode === 3
      ? 'تجاوز التكامل العددي حد الخطوات. راجع k ومدة المحاكاة.'
      : 'تعذر حساب المنحنى؛ تحقق من المدخلات (رمز المحرك ' + errorCode + ').';
    playButton.disabled = true;
    timeline.disabled = true;
    return false;
  }

  const raw = new Float64Array(
    kineticsCore.memory.buffer,
    pointer,
    KINETICS_SAMPLE_COUNT * 6
  );
  kineticsCurve = [];
  for (let index = 0; index < KINETICS_SAMPLE_COUNT; index += 1) {
    const offset = index * 6;
    kineticsCurve.push({
      time: raw[offset],
      progress: raw[offset + 1],
      extent: raw[offset + 2],
      acidRemaining: raw[offset + 3],
      bicarbonateRemaining: raw[offset + 4],
      rate: raw[offset + 5]
    });
  }

  effectiveRateConstant = kineticsCore.cv_kinetics_effective_k();
  kineticsConfigured = kineticsCore.cv_kinetics_atom_balance_ok() === 1;
  simulationAvailable = kineticsConfigured;
  if (!kineticsConfigured) throw new Error('Kinetics engine failed stoichiometric conservation validation.');

  kineticsParameterStatus.classList.remove('is-error');
  kineticsParameterStatus.classList.add('is-ready');
  chartTitle.textContent = 'التقدم الحركي المحسوب';
  chartDescription.textContent = 'منحنى محسوب من قانون السرعة والبيانات المدخلة.';
  kineticsParameterStatus.textContent =
    'اكتمل حساب المنحنى بـ ' + kineticsCore.cv_kinetics_last_steps() +
    ' خطوة تكامل. منحنيات التركيز والحسابات تعتمد على المدخلات الحركية؛ تسلسل المشاهد الثلاثة توقيت توضيحي مستقل عنها. المرجع الذي أدخلته لم يتم التحقق منه آلياً. ' +
    (hasActivationEnergy
      ? 'تم تطبيق أرهينيوس على k حسب درجة الحرارة.'
      : 'لم تُدخل Ea؛ الحرارة لا تغيّر k حسابياً، والاهتزاز البصري تخطيطي فقط.');
  playButton.disabled = false;
  timeline.disabled = false;
  return true;
}

function sampleKineticsAtTime(timeSeconds) {
  if (!kineticsCurve || kineticsCurve.length < 2) {
    return {
      progress: 0,
      extent: 0,
      acidRemaining: acidAmountMmol,
      bicarbonateRemaining: bicarbonateAmountMmol,
      rate: 0
    };
  }
  const position = THREE.MathUtils.clamp(timeSeconds / durationSeconds, 0, 1) *
    (kineticsCurve.length - 1);
  const leftIndex = Math.floor(position);
  const rightIndex = Math.min(kineticsCurve.length - 1, leftIndex + 1);
  const fraction = position - leftIndex;
  const left = kineticsCurve[leftIndex];
  const right = kineticsCurve[rightIndex];
  const mix = (key) => left[key] + (right[key] - left[key]) * fraction;
  return {
    progress: mix('progress'),
    extent: mix('extent'),
    acidRemaining: mix('acidRemaining'),
    bicarbonateRemaining: mix('bicarbonateRemaining'),
    rate: mix('rate')
  };
}

function calculateChemistry(timeSeconds) {
  if (!chemistryCore) throw new Error('C++ chemistry core is not loaded.');
  const kinetic = sampleKineticsAtTime(timeSeconds);
  const pointer = chemistryCore.cv_calculate_reaction(
    acidAmountMmol, bicarbonateAmountMmol, kinetic.progress
  );
  const memory = chemistryCore.memory.buffer;
  const flags = new Int32Array(memory, pointer + 56, 3);
  const kineticBalanced = !kineticsConfigured || kineticsCore.cv_kinetics_atom_balance_ok() === 1;
  const result = {
    progress: kinetic.progress,
    extent: kinetic.extent,
    acidRemaining: kinetic.acidRemaining,
    bicarbonateRemaining: kinetic.bicarbonateRemaining,
    sodiumAcetate: kinetic.extent,
    water: kinetic.extent,
    carbonDioxide: kinetic.extent,
    limitingReagent: flags[0],
    atomBalanceOk: flags[1] === 1 && kineticBalanced,
    errorCode: flags[2],
    rate: kinetic.rate,
    acidConcentration: volumeMl > 0 ? kinetic.acidRemaining / volumeMl : 0,
    bicarbonateConcentration: volumeMl > 0 ? kinetic.bicarbonateRemaining / volumeMl : 0,
    effectiveK: effectiveRateConstant
  };
  if (result.errorCode !== 0 || !result.atomBalanceOk) {
    throw new Error('C++ chemistry core rejected the input or detected a conservation error.');
  }
  return result;
}
function formatMmol(value) { return value.toFixed(2) + ' mmol'; }
function updateChemistryReadouts(result) {
  const visualDemo = simulationAvailable && !kineticsConfigured;
  acidAmountReadout.textContent = acidConcentrationM.toFixed(3) + ' M';
  bicarbonateAmountReadout.textContent = bicarbonateConcentrationM.toFixed(3) + ' M';
  acidRemainingOutput.textContent = visualDemo ? '—' : formatMmol(result.acidRemaining);
  bicarbonateRemainingOutput.textContent = visualDemo ? '—' : formatMmol(result.bicarbonateRemaining);
  sodiumAcetateOutput.textContent = visualDemo ? '—' : formatMmol(result.sodiumAcetate);
  waterOutput.textContent = visualDemo ? '—' : formatMmol(result.water);
  carbonDioxideOutput.textContent = visualDemo ? '—' : formatMmol(result.carbonDioxide);
  const labels = ['متساويان', 'حمض الأسيتيك', 'بيكربونات الصوديوم'];
  limitingReagentOutput.textContent = labels[result.limitingReagent] || 'غير محدد';
  atomIntegrity.classList.toggle('is-error', !result.atomBalanceOk);
  atomIntegrity.lastChild.textContent = result.atomBalanceOk
    ? ' حفظ المعادلة الذرية متحقق'
    : ' فشل التحقق من حفظ الذرات';
  acidConcentrationOutput.textContent = visualDemo ? '— M' : result.acidConcentration.toExponential(3) + ' M';
  bicarbonateConcentrationOutput.textContent = visualDemo ? '— M' : result.bicarbonateConcentration.toExponential(3) + ' M';
  reactionRateOutput.textContent = visualDemo ? 'غير محسوب' : result.rate.toExponential(3) + ' M/s';
  effectiveKOutput.textContent = kineticsConfigured ? result.effectiveK.toExponential(3) : '—';
}


function setFitFileStatus(message, state = '', target = fitFileStatus) {
  target.classList.remove('is-error', 'is-ready');
  if (state) target.classList.add(state);
  target.textContent = message;
}

function clearConcentrationFitSummary() {
  concentrationFitKOutput.textContent = '—';
  concentrationFitMOutput.textContent = '—';
  concentrationFitNOutput.textContent = '—';
  concentrationFitR2Output.textContent = '—';
}

function renderExperimentPreview(dataset) {
  fitPreviewBody.replaceChildren();
  dataset.experiments.slice(0, 8).forEach((experiment) => {
    const row = document.createElement('tr');
    const values = [
      experiment.id,
      experiment.temperatureC.toFixed(3),
      experiment.concentrationA.toExponential(3),
      experiment.concentrationB.toExponential(3),
      experiment.initialRate.toExponential(3)
    ];
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    fitPreviewBody.appendChild(row);
  });
  fitPreviewCount.textContent = dataset.count + ' تجربة · ' + dataset.temperatureC + ' °C';
  fitPreview.hidden = false;
}

async function readInitialRatesFile(file) {
  importedExperiments = null;
  latestExperimentalFit = null;
  fitResults.hidden = true;
  applyFittedParametersButton.disabled = true;
  applyConcentrationFitButton.disabled = true;
  analyzeInitialRatesButton.disabled = true;
  fitPreview.hidden = true;
  concentrationTimeResults.hidden = true;
  clearConcentrationFitSummary();

  if (!file) {
    setFitFileStatus('لم يتم اختيار ملف.');
    return;
  }
  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    setFitFileStatus('اختر ملف CSV بامتداد .csv فقط.', 'is-error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    setFitFileStatus('حجم الملف يتجاوز الحد المسموح (2 MB).', 'is-error');
    return;
  }

  try {
    const source = await file.text();
    importedExperiments = parseInitialRatesCsv(source);
    importedExperiments.fileName = file.name;
    renderExperimentPreview(importedExperiments);
    analyzeInitialRatesButton.disabled = !fittingCore;
    setFitFileStatus(
      'تم التحقق من بنية CSV: ' + importedExperiments.count +
      ' تجارب عند ' + importedExperiments.temperatureC + ' °C. هذه مراجعة للبيانات والوحدات المعلنة، وليست تحققاً مستقلاً من القياسات.',
      'is-ready'
    );
  } catch (error) {
    importedExperiments = null;
    setFitFileStatus(error.message || 'تعذر قراءة ملف CSV.', 'is-error');
  }
}

function analyzeInitialRates() {
  if (!importedExperiments || !fittingCore) {
    setFitFileStatus('حمّل ملف CSV صالحاً أولاً.', 'is-error');
    return false;
  }

  try {
    const count = importedExperiments.experiments.length;
    const inputPointer = fittingCore.cv_fit_input_buffer();
    const input = new Float64Array(
      fittingCore.memory.buffer,
      inputPointer,
      count * 3
    );
    importedExperiments.experiments.forEach((experiment, index) => {
      const offset = index * 3;
      input[offset] = experiment.concentrationA;
      input[offset + 1] = experiment.concentrationB;
      input[offset + 2] = experiment.initialRate;
    });

    const resultPointer = fittingCore.cv_fit_initial_rates(count, importedExperiments.temperatureC);
    const errorCode = fittingCore.cv_fit_last_error();
    if (!resultPointer || errorCode !== 0) {
      const messages = {
        1: 'توجد مدخلات غير صالحة في البيانات الرقمية.',
        2: 'يلزم أربع تجارب على الأقل لحساب الخطأ الإحصائي.',
        3: 'تغيّرات التركيز غير مستقلة بما يكفي لفصل رتبتي A وB.',
        4: 'حدث تجاوز عددي أثناء الملاءمة؛ راجع نطاق القيم.'
      };
      throw new Error(messages[errorCode] || 'فشل محرك الملاءمة (رمز ' + errorCode + ').');
    }

    const values = new Float64Array(
      fittingCore.memory.buffer,
      resultPointer,
      12
    );
    latestExperimentalFit = {
      k: values[0],
      orderA: values[1],
      orderB: values[2],
      rSquared: values[3],
      rmseLogRate: values[4],
      residualStandardError: values[5],
      standardErrorA: values[6],
      standardErrorB: values[7],
      standardErrorLogK: values[8],
      standardErrorK: values[9],
      experimentCount: values[10],
      temperatureC: values[11],
      fileName: importedExperiments.fileName,
      sourceMethod: importedExperiments.method || 'initial-rates-log-linear'
    };

    fitTemperatureResult.textContent = latestExperimentalFit.temperatureC.toFixed(2) + ' °C · ' +
      latestExperimentalFit.experimentCount + ' تجارب';
    fitKResult.textContent = latestExperimentalFit.k.toExponential(4);
    fitMResult.textContent = latestExperimentalFit.orderA.toFixed(4);
    fitNResult.textContent = latestExperimentalFit.orderB.toFixed(4);
    fitEquation.textContent =
      'r = ' + latestExperimentalFit.k.toExponential(4) +
      ' [A]^' + latestExperimentalFit.orderA.toFixed(4) +
      ' [B]^' + latestExperimentalFit.orderB.toFixed(4);
    const kConcentrationExponent = 1 - latestExperimentalFit.orderA - latestExperimentalFit.orderB;
    fitKUnits.textContent = 'وحدات k: ' +
      (Math.abs(kConcentrationExponent) < 1.0e-9
        ? 's⁻¹'
        : 'M^(' + kConcentrationExponent.toFixed(3) + ') · s⁻¹');
    fitR2Result.textContent = Number.isFinite(latestExperimentalFit.rSquared)
      ? latestExperimentalFit.rSquared.toFixed(6)
      : 'غير معرّف';
    fitRmseResult.textContent = latestExperimentalFit.rmseLogRate.toExponential(3);
    fitOrdersSeResult.textContent =
      latestExperimentalFit.standardErrorA.toExponential(2) + ' / ' +
      latestExperimentalFit.standardErrorB.toExponential(2);
    fitKSeResult.textContent = latestExperimentalFit.standardErrorK.toExponential(3);

    fitResults.hidden = false;
    const canApplyToCurrentEngine =
      latestExperimentalFit.k > 0 && latestExperimentalFit.k <= 1.0e100 &&
      latestExperimentalFit.orderA >= 0 && latestExperimentalFit.orderA <= 4 &&
      latestExperimentalFit.orderB >= 0 && latestExperimentalFit.orderB <= 4 &&
      latestExperimentalFit.orderA + latestExperimentalFit.orderB <= 6 &&
      latestExperimentalFit.temperatureC >= Number(temperature.min) &&
      latestExperimentalFit.temperatureC <= Number(temperature.max);
    applyFittedParametersButton.disabled = !canApplyToCurrentEngine;
    applyConcentrationFitButton.disabled = latestExperimentalFit.sourceMethod !== 'concentration-time-derived-initial-rates' || !canApplyToCurrentEngine;
    setFitFileStatus(
      canApplyToCurrentEngine
        ? 'اكتملت الملاءمة بنجاح. يمكن اعتماد المعاملات في محرك المحاكاة؛ النتائج لا تثبت وحدها صحة النموذج أو الآلية.'
        : 'اكتملت الملاءمة، لكن k أو الرتب أو درجة الحرارة خارج نطاق محرك المحاكاة الحالي. احتفظ بالنتائج للتحليل، ولا يمكن اعتمادها في هذا الإصدار.',
      canApplyToCurrentEngine ? 'is-ready' : 'is-error'
    );
    if (latestExperimentalFit.sourceMethod === 'concentration-time-derived-initial-rates') {
      concentrationFitKOutput.textContent = latestExperimentalFit.k.toExponential(4);
      concentrationFitMOutput.textContent = latestExperimentalFit.orderA.toFixed(4);
      concentrationFitNOutput.textContent = latestExperimentalFit.orderB.toFixed(4);
      concentrationFitR2Output.textContent = Number.isFinite(latestExperimentalFit.rSquared)
        ? latestExperimentalFit.rSquared.toFixed(6)
        : 'غير معرّف';
    }
    return true;
  } catch (error) {
    latestExperimentalFit = null;
    fitResults.hidden = true;
    applyFittedParametersButton.disabled = true;
    applyConcentrationFitButton.disabled = true;
    setFitFileStatus(error.message || 'تعذّر تحليل البيانات.', 'is-error');
    return false;
  }
}

function renderConcentrationTimePreview(dataset) {
  concentrationTimePreviewBody.replaceChildren();
  dataset.experiments.slice(0, 12).forEach((experiment) => {
    const first = experiment.samples[0];
    const row = document.createElement('tr');
    const values = [
      experiment.id,
      experiment.temperatureC.toFixed(2),
      String(experiment.samples.length),
      first.concentrationA.toExponential(3),
      first.concentrationB.toExponential(3)
    ];
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    concentrationTimePreviewBody.appendChild(row);
  });
  concentrationTimePreviewCount.textContent =
    dataset.count + ' تجارب · ' + dataset.totalSamples + ' قراءة · ' +
    dataset.temperatureC + ' °C';
  concentrationTimePreview.hidden = false;
}

async function readConcentrationTimeFile(file) {
  importedConcentrationSeries = null;
  latestExperimentalFit = null;
  fitResults.hidden = true;
  applyFittedParametersButton.disabled = true;
  applyConcentrationFitButton.disabled = true;
  analyzeConcentrationTimeButton.disabled = true;
  concentrationTimePreview.hidden = true;
  concentrationTimeResults.hidden = true;
  initialWindowPointsInput.disabled = true;
  clearConcentrationFitSummary();

  if (!file) {
    setFitFileStatus('لم يتم اختيار ملف بيانات تركيز مقابل الزمن.', '', concentrationTimeStatus);
    return;
  }
  if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
    setFitFileStatus('اختر ملف CSV بامتداد .csv فقط.', 'is-error', concentrationTimeStatus);
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    setFitFileStatus('حجم الملف يتجاوز الحد المسموح (2 MB).', 'is-error', concentrationTimeStatus);
    return;
  }

  try {
    const source = await file.text();
    importedConcentrationSeries = parseConcentrationTimeCsv(source);
    importedConcentrationSeries.fileName = file.name;
    renderConcentrationTimePreview(importedConcentrationSeries);
    analyzeConcentrationTimeButton.disabled = !concentrationFitCore || !fittingCore;
    const minPoints = importedConcentrationSeries.minimumPoints;
    setFitFileStatus(
      'تم التحقق من بنية البيانات: ' + importedConcentrationSeries.count +
      ' تجارب و' + importedConcentrationSeries.totalSamples + ' قراءة عند ' +
      importedConcentrationSeries.temperatureC + ' °C. هذا تحقق بنيوي، وليس تصديقاً مستقلاً على القياسات.',
      'is-ready',
      concentrationTimeStatus
    );
    initialWindowPointsInput.max = String(minPoints);
    initialWindowPointsInput.min = '3';
    initialWindowPointsInput.value = String(Math.min(5, minPoints));
    initialWindowPointsInput.disabled = false;
  } catch (error) {
    importedConcentrationSeries = null;
    initialWindowPointsInput.disabled = true;
    setFitFileStatus(error.message || 'تعذر قراءة ملف التركيز مقابل الزمن.', 'is-error', concentrationTimeStatus);
  }
}

function renderConcentrationSlopeResults(rows, pointCount) {
  concentrationTimeResultsBody.replaceChildren();
  rows.forEach((item) => {
    const row = document.createElement('tr');
    const values = [
      item.id,
      item.rateA.toExponential(3),
      item.rateB.toExponential(3),
      (item.relativeDisagreement * 100).toFixed(1) + '%',
      (item.rSquaredA * 100).toFixed(2) + '% / ' + (item.rSquaredB * 100).toFixed(2) + '%'
    ];
    values.forEach((value) => {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.appendChild(cell);
    });
    concentrationTimeResultsBody.appendChild(row);
  });
  concentrationTimeResultsCount.textContent =
    'أول ' + pointCount + ' نقاط من كل تجربة · ' + rows.length + ' تجارب';
  concentrationTimeResults.hidden = false;
}

function analyzeConcentrationTime() {
  if (!importedConcentrationSeries || !concentrationFitCore || !fittingCore) {
    setFitFileStatus('استورد ملف CSV صالحاً وانتظر تحميل محركات WebAssembly.', 'is-error', concentrationTimeStatus);
    return;
  }

  latestExperimentalFit = null;
  fitResults.hidden = true;
  applyFittedParametersButton.disabled = true;
  applyConcentrationFitButton.disabled = true;
  concentrationTimeResults.hidden = true;
  clearConcentrationFitSummary();

  try {
    const pointCount = Number(initialWindowPointsInput.value);
    const tolerancePercent = Number(rateAgreementToleranceInput.value);
    if (!Number.isInteger(pointCount) || pointCount < 3 || pointCount > 64 ||
        !Number.isFinite(tolerancePercent) || tolerancePercent < 0 || tolerancePercent > 200) {
      throw new Error('أدخل عدد نقاط من 3 إلى 64 وحد اختلاف من 0% إلى 200%.');
    }
    if (importedConcentrationSeries.experiments.some((experiment) => experiment.samples.length < pointCount)) {
      throw new Error('بعض التجارب لا تحتوي على عدد النقاط المحدد في نافذة السرعة الابتدائية.');
    }

    const derivedRows = [];
    const slopeDiagnostics = [];
    const tolerance = tolerancePercent / 100;

    importedConcentrationSeries.experiments.forEach((experiment) => {
      const samples = experiment.samples.slice(0, pointCount);
      const pointer = concentrationFitCore.cv_concentration_fit_input_buffer();
      const input = new Float64Array(
        concentrationFitCore.memory.buffer,
        pointer,
        pointCount * 3
      );
      const firstTime = samples[0].timeS;
      samples.forEach((sample, index) => {
        const offset = index * 3;
        input[offset] = sample.timeS - firstTime;
        input[offset + 1] = sample.concentrationA;
        input[offset + 2] = sample.concentrationB;
      });

      const resultPointer = concentrationFitCore.cv_concentration_fit_initial_rates(pointCount, tolerance);
      const errorCode = concentrationFitCore.cv_concentration_fit_last_error();
      if (!resultPointer || errorCode !== 0) {
        const messages = {
          1: 'توجد أزمنة مكررة أو قيم غير صالحة في التجربة ' + experiment.id + '.',
          2: 'كل تجربة تحتاج ثلاث نقاط زمنية على الأقل.',
          3: 'تعذر تحديد ميل التركيز؛ تحقق من اختلاف الأزمنة.',
          4: 'حدث تجاوز عددي أثناء استخراج الميل.',
          5: 'لم يظهر تناقص في تركيز أحد المتفاعلين في التجربة ' + experiment.id + '. تحقق من ترتيب القراءات والقياسات.'
        };
        throw new Error(messages[errorCode] || 'فشل استخراج السرعة الابتدائية (رمز ' + errorCode + ').');
      }

      const values = new Float64Array(
        concentrationFitCore.memory.buffer,
        resultPointer,
        14
      );
      const diagnostic = {
        id: experiment.id,
        rateA: values[4],
        rateB: values[9],
        relativeDisagreement: values[10],
        meanRate: values[11],
        rSquaredA: values[2],
        rSquaredB: values[7],
        ratesConsistent: values[13] === 1,
        pointCount: values[12],
        firstTimeS: firstTime
      };
      slopeDiagnostics.push(diagnostic);
      derivedRows.push({
        id: experiment.id,
        temperatureC: experiment.temperatureC,
        concentrationA: samples[0].concentrationA,
        concentrationB: samples[0].concentrationB,
        initialRate: diagnostic.meanRate
      });
    });

    renderConcentrationSlopeResults(slopeDiagnostics, pointCount);
    const incompatible = slopeDiagnostics.filter((item) => !item.ratesConsistent);
    if (incompatible.length > 0) {
      latestExperimentalFit = null;
      applyFittedParametersButton.disabled = true;
      applyConcentrationFitButton.disabled = true;
      clearConcentrationFitSummary();
      setFitFileStatus(
        'توقّف التحليل: اختلاف سرعتي اختفاء A وB تجاوز حد السماح (' +
        tolerancePercent.toFixed(1) + '%) في ' + incompatible.map((item) => item.id).join('، ') +
        '. راجع القياسات أو نافذة النقاط؛ لم نستخدم متوسطاً غير متوافق لاستخراج k وm وn.',
        'is-error',
        concentrationTimeStatus
      );
      return;
    }

    const derivedDataset = {
      experiments: derivedRows,
      temperatureC: importedConcentrationSeries.temperatureC,
      count: derivedRows.length,
      fileName: importedConcentrationSeries.fileName,
      method: 'concentration-time-derived-initial-rates'
    };
    const previousDataset = importedExperiments;
    importedExperiments = derivedDataset;
    const fitSucceeded = analyzeInitialRates();
    importedExperiments = previousDataset;

    if (!fitSucceeded || !latestExperimentalFit) {
      setFitFileStatus(
        'استُخرجت السرعات الابتدائية، لكن لم تنجح ملاءمة قانون السرعة. راجع شروط استقلال تغير [A] و[B] في التجارب.',
        'is-error',
        concentrationTimeStatus
      );
      return;
    }

    const delayedStart = slopeDiagnostics.some((item) => item.firstTimeS > 1.0e-9);
    setFitFileStatus(
      'اكتمل التحليل: استُخرجت السرعات من أول ' + pointCount +
      ' نقاط بالانحدار الخطي، ثم استُخرج k وm وn من ' + derivedRows.length +
      ' تجارب. اتفاق السرعتين ضمن ' + tolerancePercent.toFixed(1) +
      '%. ' + (delayedStart
        ? 'تنبيه: أول قراءة لبعض التجارب لم تكن عند t=0؛ تأخر بدء التسجيل قد يقلل تمثيل الميل للسرعة الابتدائية الفعلية.'
        : 'بدأت القراءات من t=0 حسب الملف.'),
      'is-ready',
      concentrationTimeStatus
    );
  } catch (error) {
    latestExperimentalFit = null;
    applyFittedParametersButton.disabled = true;
    applyConcentrationFitButton.disabled = true;
    fitResults.hidden = true;
    clearConcentrationFitSummary();
    setFitFileStatus(error.message || 'تعذّر تحليل بيانات التركيز مقابل الزمن.', 'is-error', concentrationTimeStatus);
  }
}

function downloadConcentrationTimeTemplate() {
  const blob = new Blob([CONCENTRATION_TIME_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'chemverse-concentration-time-template.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function applyExperimentalFitToSimulator() {
  if (!latestExperimentalFit) return;
  playing = false;
  elapsed = 0;
  rateConstantInput.value = latestExperimentalFit.k.toPrecision(10);
  acidOrderInput.value = latestExperimentalFit.orderA.toFixed(8);
  bicarbonateOrderInput.value = latestExperimentalFit.orderB.toFixed(8);
  referenceTemperatureInput.value = latestExperimentalFit.temperatureC.toFixed(6);
  temperatureC = latestExperimentalFit.temperatureC;
  temperature.value = String(temperatureC);
  kineticsSourceInput.value =
    'CSV fit: ' + latestExperimentalFit.fileName +
    '; ' + latestExperimentalFit.experimentCount +
    ' initial-rate experiments at ' + latestExperimentalFit.temperatureC + ' °C';
  refreshView(true);
  setFitFileStatus(
    'تم نقل k وm وn ودرجة الحرارة إلى محرك المحاكاة. طاقة التنشيط Ea لم تُستنتج من ملف درجة حرارة واحدة.',
    'is-ready'
  );
  if (latestExperimentalFit.sourceMethod === 'concentration-time-derived-initial-rates') {
    setFitFileStatus('تم اعتماد معاملات الملاءمة المستخرجة من بيانات التركيز مقابل الزمن في محرك المحاكاة.', 'is-ready', concentrationTimeStatus);
  }
}

function downloadInitialRatesTemplate() {
  const blob = new Blob([INITIAL_RATES_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'chemverse-initial-rates-template.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function makeMaterial(color, roughness = 0.35, metalness = 0.1) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    transparent: true,
    opacity: 1
  });
}

function addBond(group, start, end, order, color = 0xb5c7c6) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  if (length < 0.001) return;

  const axis = direction.clone().normalize();
  let perpendicular = new THREE.Vector3(0, 0, 1).cross(axis);
  if (perpendicular.lengthSq() < 0.01) perpendicular.set(1, 0, 0);
  perpendicular.normalize();

  const count = order >= 2 ? 2 : 1;
  const offsets = count === 1 ? [0] : [-0.075, 0.075];
  for (const offset of offsets) {
    const midpoint = start.clone().add(end).multiplyScalar(0.5).addScaledVector(perpendicular, offset);
    const geometry = new THREE.CylinderGeometry(0.052, 0.052, length, 10, 1, false);
    const material = makeMaterial(color, 0.48, 0.12);
    const bond = new THREE.Mesh(geometry, material);
    bond.position.copy(midpoint);
    bond.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
    group.add(bond);
  }
}

function createSpecies(definition) {
  const group = new THREE.Group();
  group.name = definition.name;
  const positions = definition.atoms.map((atom) => new THREE.Vector3(...atom.position));

  for (let index = 0; index < definition.atoms.length; index += 1) {
    const atom = definition.atoms[index];
    const style = atomPalette[atom.element];
    const geometry = new THREE.SphereGeometry(style.radius, 28, 22);
    const material = makeMaterial(style.color, style.roughness, style.metalness);
    material.emissive = new THREE.Color(style.color);
    material.emissiveIntensity = atom.element === 'O' ? 0.055 : 0.025;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(positions[index]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.element = atom.element;
    group.add(mesh);
  }

  for (const [from, to, order] of definition.bonds) {
    addBond(group, positions[from], positions[to], order);
  }

  if (definition.ionicPair) {
    const [from, to] = definition.ionicPair;
    const points = [positions[from], positions[to]];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0xb39af0,
      dashSize: 0.09,
      gapSize: 0.075,
      transparent: true,
      opacity: 0.8
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    group.add(line);
  }

  group.userData.basePosition = new THREE.Vector3(...definition.position);
  group.userData.baseRotation = definition.rotation || [0, 0, 0];
  group.userData.visualScale = definition.scale || 0.78;
  group.scale.setScalar(group.userData.visualScale);
  group.position.copy(group.userData.basePosition);
  scene.add(group);
  return group;
}

function buildMolecularScene() {
  species.acetic = createSpecies({
    name: 'Acetic acid',
    position: [-2.05, 0.02, 0],
    atoms: [
      { element: 'C', position: [-0.85, 0, 0] },
      { element: 'C', position: [0.52, 0, 0] },
      { element: 'O', position: [1.15, 0.78, 0] },
      { element: 'O', position: [1.15, -0.78, 0] },
      { element: 'H', position: [2.02, -0.86, 0] },
      { element: 'H', position: [-1.17, 0.85, 0] },
      { element: 'H', position: [-1.43, -0.46, 0.72] },
      { element: 'H', position: [-1.43, -0.46, -0.72] }
    ],
    bonds: [[0,1,1],[1,2,2],[1,3,1],[3,4,1],[0,5,1],[0,6,1],[0,7,1]]
  });

  species.bicarbonate = createSpecies({
    name: 'Sodium bicarbonate',
    position: [2.05, -0.02, 0],
    atoms: [
      { element: 'Na', position: [1.75, 0.46, 0] },
      { element: 'C', position: [0, 0, 0] },
      { element: 'O', position: [0, 1.13, 0] },
      { element: 'O', position: [0.96, -0.56, 0] },
      { element: 'O', position: [-0.96, -0.56, 0] },
      { element: 'H', position: [-1.74, -0.96, 0] }
    ],
    bonds: [[1,2,2],[1,3,1],[1,4,1],[4,5,1]],
    ionicPair: [3,0]
  });

  species.acetate = createSpecies({
    name: 'Acetate ion',
    position: [-1.18, 0.03, 0],
    atoms: [
      { element: 'C', position: [-0.83, 0, 0] },
      { element: 'C', position: [0.52, 0, 0] },
      { element: 'O', position: [1.16, 0.77, 0] },
      { element: 'O', position: [1.16, -0.77, 0] },
      { element: 'H', position: [-1.16, 0.85, 0] },
      { element: 'H', position: [-1.42, -0.46, 0.72] },
      { element: 'H', position: [-1.42, -0.46, -0.72] }
    ],
    bonds: [[0,1,1],[1,2,2],[1,3,1],[0,4,1],[0,5,1],[0,6,1]]
  });

  species.carbonic = createSpecies({
    name: 'Carbonic acid',
    position: [1.16, 0, 0],
    atoms: [
      { element: 'C', position: [0, 0, 0] },
      { element: 'O', position: [-1.06, 0, 0] },
      { element: 'O', position: [0.58, 0.82, 0] },
      { element: 'H', position: [1.34, 1.02, 0] },
      { element: 'O', position: [0.58, -0.82, 0] },
      { element: 'H', position: [1.34, -1.02, 0] }
    ],
    bonds: [[0,1,2],[0,2,1],[2,3,1],[0,4,1],[4,5,1]]
  });

  species.sodiumAcetate = createSpecies({
    name: 'Sodium acetate',
    position: [-1.68, 0.16, 0],
    atoms: [
      { element: 'Na', position: [2.0, -0.28, 0] },
      { element: 'C', position: [-0.83, 0, 0] },
      { element: 'C', position: [0.52, 0, 0] },
      { element: 'O', position: [1.16, 0.77, 0] },
      { element: 'O', position: [1.16, -0.77, 0] },
      { element: 'H', position: [-1.16, 0.85, 0] },
      { element: 'H', position: [-1.42, -0.46, 0.72] },
      { element: 'H', position: [-1.42, -0.46, -0.72] }
    ],
    bonds: [[1,2,1],[2,3,2],[2,4,1],[1,5,1],[1,6,1],[1,7,1]],
    ionicPair: [4,0]
  });

  species.carbonDioxide = createSpecies({
    name: 'Carbon dioxide',
    position: [1.24, 0.7, 0],
    atoms: [
      { element: 'O', position: [-1.25, 0, 0] },
      { element: 'C', position: [0, 0, 0] },
      { element: 'O', position: [1.25, 0, 0] }
    ],
    bonds: [[0,1,2],[1,2,2]]
  });

  species.water = createSpecies({
    name: 'Water',
    position: [2.55, -1.03, 0.3],
    atoms: [
      { element: 'O', position: [0, 0, 0] },
      { element: 'H', position: [-0.78, 0.57, 0] },
      { element: 'H', position: [0.78, 0.57, 0] }
    ],
    bonds: [[0,1,1],[0,2,1]]
  });

  for (const group of Object.values(species)) setOpacity(group, 0);
}

function setOpacity(group, opacity) {
  group.visible = opacity > 0.015;
  group.traverse((object) => {
    if (object.material) {
      object.material.opacity = opacity;
      object.material.transparent = true;
      object.material.depthWrite = opacity > 0.94;
    }
  });
}

function moveSpecies(group, x, y, z, time, phase, amplitude) {
  if (!group) return;
  group.position.set(
    x + Math.sin(time * 2.2 + phase) * amplitude,
    y + Math.cos(time * 2.7 + phase) * amplitude * 0.7,
    z + Math.sin(time * 1.8 + phase) * amplitude
  );
  group.rotation.set(
    Math.sin(time * 0.72 + phase) * 0.08,
    Math.cos(time * 0.48 + phase) * 0.11,
    Math.sin(time * 0.91 + phase) * 0.065
  );
}

function updateMolecularScene(time, result, displayProgress, visualDemo) {
  // Temperature-dependent vibration is illustrative; only supplied Ea changes k(T).
  const temperatureFactor = 0.7 + ((temperatureC - 20) / 40) * 0.8;
  const vibration = 0.018 * temperatureFactor;
  const progress = displayProgress;
  const visuals = getStageVisuals(progress);
  const intermediateFade = visuals.intermediate;
  const acidVisibility = visualDemo
    ? visuals.reactants
    : (acidAmountMmol > 0 ? result.acidRemaining / acidAmountMmol : 0);
  const bicarbonateVisibility = visualDemo
    ? visuals.reactants
    : (bicarbonateAmountMmol > 0 ? result.bicarbonateRemaining / bicarbonateAmountMmol : 0);
  const acidX = THREE.MathUtils.lerp(-2.05, -0.88, visuals.approach);
  const bicarbonateX = THREE.MathUtils.lerp(2.05, 0.88, visuals.approach);
  moveSpecies(species.acetic, acidX, 0.03, 0, time, 0.4, vibration);
  moveSpecies(species.bicarbonate, bicarbonateX, -0.03, 0, time, 1.6, vibration);
  setOpacity(species.acetic, acidVisibility);
  setOpacity(species.bicarbonate, bicarbonateVisibility);
  moveSpecies(species.acetate, -1.12, 0.03, 0, time, 1.0, vibration * 0.7);
  moveSpecies(species.carbonic, 1.12, 0.02, 0, time, 2.1, vibration * 0.7);
  setOpacity(species.acetate, intermediateFade);
  setOpacity(species.carbonic, intermediateFade);
  moveSpecies(species.sodiumAcetate, -1.82, 0.12, 0, time, 0.7, vibration * 0.45);
  moveSpecies(species.carbonDioxide, 1.25, 0.72, 0, time, 1.8, vibration * 0.9);
  moveSpecies(species.water, 2.75, -1.03, 0.28, time, 2.7, vibration * 0.6);
  setOpacity(species.sodiumAcetate, visuals.products);
  setOpacity(species.carbonDioxide, visuals.products);
  setOpacity(species.water, visuals.products);
}

function updateStageUI(progress, chemistryResult, visualDemo) {
  const stage = getReactionStage(progress);
  const descriptions = {
    reactants: {
      caption: 'الجزيئات تقترب استعداداً للتفاعل',
      label: 'REACTANTS / MOLECULES APPROACHING',
      title: 'المواد المتفاعلة',
      description: 'تقترب جزيئات حمض الأسيتيك وبيكربونات الصوديوم.',
      icon: '◌'
    },
    intermediate: {
      caption: 'انتقال بروتون وتكوّن حمض الكربونيك',
      label: 'INTERMEDIATE / PROTON TRANSFER',
      title: 'مرحلة انتقال البروتون',
      description: 'ينتقل بروتون إلى أيون البيكربونات، فيتكوّن حمض الكربونيك وأيون الأسيتات.',
      icon: '↗'
    },
    products: {
      caption: 'تفكك حمض الكربونيك وظهور النواتج',
      label: 'PRODUCTS / REACTION COMPLETE',
      title: 'تكوّنت النواتج',
      description: 'يتفكك حمض الكربونيك إلى ماء وثاني أكسيد الكربون.',
      icon: '✓'
    }
  };
  const info = descriptions[stage];
  stageCaption.textContent = info.caption;
  moleculeLabel.textContent = info.label;
  statusTitle.textContent = info.title;
  statusDescription.textContent = info.description;
  statusIcon.textContent = info.icon;

  document.querySelectorAll('.stage-item').forEach((item) => {
    const itemStage = item.dataset.stage;
    item.classList.toggle('is-active', itemStage === stage);
    item.classList.toggle('is-done',
      (stage === 'intermediate' && itemStage === 'reactants') ||
      (stage === 'products' && itemStage !== 'products')
    );
  });

  progressReadout.textContent = visualDemo ? 'عرض بصري' : Math.round(chemistryResult.progress * 100) + '%';
}

function formatTime(value) {
  const total = Math.max(0, Math.floor(value));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0')
    : String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
}

function updatePlaybackUI() {
  const visualDemo = simulationAvailable && !kineticsConfigured;
  const finished = elapsed >= durationSeconds;
  playLabel.textContent = playing
    ? 'إيقاف مؤقت'
    : (finished
      ? (visualDemo ? 'إعادة العرض' : 'إعادة التفاعل')
      : (visualDemo ? 'ابدأ العرض المرئي' : 'ابدأ التفاعل'));
  playButton.querySelector('.play-icon').textContent = playing ? 'Ⅱ' : '▶';
  timeReadout.textContent = formatTime(elapsed) + ' / ' + formatTime(durationSeconds);
  timeline.max = String(durationSeconds);
  timeline.value = String(elapsed);
  timeline.style.background = 'linear-gradient(to left, #72d9c5 0%, #72d9c5 ' +
    (elapsed / durationSeconds * 100) + '%, #2a424a ' + (elapsed / durationSeconds * 100) + '%, #2a424a 100%)';
  temperatureReadout.textContent = temperatureC + '°C';
  temperature.style.background = 'linear-gradient(to left, #72d9c5 0%, #72d9c5 ' +
    ((temperatureC - 20) / 40 * 100) + '%, #2a424a ' + ((temperatureC - 20) / 40 * 100) + '%, #2a424a 100%)';
  playButton.disabled = !simulationAvailable;
  timeline.disabled = !simulationAvailable;
}

function drawChart(result, displayProgress, visualDemo) {
  const width = chart.clientWidth || 500;
  const height = chart.clientHeight || 70;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  chart.width = Math.round(width * ratio);
  chart.height = Math.round(height * ratio);
  chartContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  chartContext.clearRect(0, 0, width, height);

  const left = 9, right = width - 9, top = 7, bottom = height - 9;
  chartContext.lineWidth = 1;
  chartContext.strokeStyle = 'rgba(150,190,184,.12)';
  for (let i = 0; i <= 3; i += 1) {
    const y = top + (bottom - top) * i / 3;
    chartContext.beginPath();
    chartContext.moveTo(left, y);
    chartContext.lineTo(right, y);
    chartContext.stroke();
  }

  chartContext.beginPath();
  for (let i = 0; i <= 100; i += 1) {
    const x = left + (right - left) * i / 100;
    const sampleCount = kineticsCurve ? kineticsCurve.length : 0;
    const position = sampleCount > 1 ? (i / 100) * (sampleCount - 1) : 0;
    const leftIndex = Math.floor(position);
    const rightIndex = Math.min(Math.max(0, sampleCount - 1), leftIndex + 1);
    const fraction = position - leftIndex;
    const yValue = visualDemo
      ? (i / 100)
      : (sampleCount > 1
        ? kineticsCurve[leftIndex].progress +
          (kineticsCurve[rightIndex].progress - kineticsCurve[leftIndex].progress) * fraction
        : 0);
    const y = bottom - (bottom - top) * yValue;
    if (i === 0) chartContext.moveTo(x, y);
    else chartContext.lineTo(x, y);
  }
  chartContext.lineWidth = 2;
  chartContext.strokeStyle = '#72d9c5';
  chartContext.shadowColor = 'rgba(114,217,197,.3)';
  chartContext.shadowBlur = 7;
  chartContext.stroke();
  chartContext.shadowBlur = 0;

  const progressX = left + (right - left) * elapsed / durationSeconds;
  const chartProgress = visualDemo ? displayProgress : result.progress;
  const progressY = bottom - (bottom - top) * chartProgress;
  chartContext.beginPath();
  chartContext.arc(progressX, progressY, 3.5, 0, Math.PI * 2);
  chartContext.fillStyle = '#e1fff5';
  chartContext.fill();
  chartContext.beginPath();
  chartContext.arc(progressX, progressY, 6, 0, Math.PI * 2);
  chartContext.strokeStyle = 'rgba(114,217,197,.35)';
  chartContext.stroke();
}

function refreshView(rebuildKinetics = false) {
  if (rebuildKinetics) buildKineticsCurve();
  const result = calculateChemistry(elapsed);
  const visualDemo = simulationAvailable && !kineticsConfigured;
  const displayProgress = simulationAvailable
    ? getDisplayProgress(elapsed, durationSeconds)
    : result.progress;
  updateMolecularScene(elapsed, result, displayProgress, visualDemo);
  updateStageUI(displayProgress, result, visualDemo);
  updateChemistryReadouts(result);
  updatePlaybackUI();
  drawChart(result, displayProgress, visualDemo);
}

function togglePlayback() {
  if (!simulationAvailable) return;
  if (elapsed >= durationSeconds) elapsed = 0;
  playing = !playing;
  previousFrame = 0;
  refreshView();
}

function animate(timestamp) {
  animationFrame = window.requestAnimationFrame(animate);
  const delta = previousFrame ? Math.min((timestamp - previousFrame) / 1000, 0.05) : 0;
  previousFrame = timestamp;

  if (playing) {
    elapsed = Math.min(durationSeconds, elapsed + delta * playbackSpeed);
    if (elapsed >= durationSeconds) playing = false;
  }

  const result = calculateChemistry(elapsed);
  const visualDemo = simulationAvailable && !kineticsConfigured;
  const displayProgress = simulationAvailable
    ? getDisplayProgress(elapsed, durationSeconds)
    : result.progress;
  updateMolecularScene(elapsed, result, displayProgress, visualDemo);
  updateStageUI(displayProgress, result, visualDemo);
  updateChemistryReadouts(result);
  updatePlaybackUI();
  drawChart(result, displayProgress, visualDemo);
  orbit.update();
  renderer.render(scene, camera);
}

function initScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1d28);
  scene.fog = new THREE.Fog(0x0e1d28, 11, 24);

  camera = new THREE.PerspectiveCamera(40, view.clientWidth / view.clientHeight, 0.1, 60);
  camera.position.set(0, 0.3, 10.2);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(view.clientWidth, view.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute('aria-label', 'نموذج ثلاثي الأبعاد لجزيئات التفاعل الكيميائي');
  view.appendChild(renderer.domElement);

  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.06;
  orbit.enablePan = true;
  orbit.minDistance = 5.5;
  orbit.maxDistance = 15;
  orbit.target.set(0, 0, 0);
  orbit.autoRotate = false;
  orbit.update();

  scene.add(new THREE.HemisphereLight(0xd9f6f0, 0x253c4b, 2.15));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.0);
  keyLight.position.set(-4, 6, 7);
  scene.add(keyLight);
  const rimLight = new THREE.PointLight(0x45cbb4, 24, 14, 2);
  rimLight.position.set(3, -1, -3);
  scene.add(rimLight);
  const fillLight = new THREE.PointLight(0x6489dc, 15, 13, 2);
  fillLight.position.set(-4, 1, 2);
  scene.add(fillLight);

  const grid = new THREE.GridHelper(16, 32, 0x31545a, 0x203942);
  grid.position.y = -2.05;
  if (Array.isArray(grid.material)) {
    grid.material.forEach((material) => { material.transparent = true; material.opacity = 0.21; });
  } else {
    grid.material.transparent = true;
    grid.material.opacity = 0.21;
  }
  scene.add(grid);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(3.55, 0.008, 6, 120),
    new THREE.MeshBasicMaterial({ color: 0x3a8c83, transparent: true, opacity: 0.19 })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -1.97;
  scene.add(halo);

  buildMolecularScene();
  loading.classList.add('is-hidden');
}

function onResize() {
  if (!renderer || !camera) return;
  const width = Math.max(1, view.clientWidth);
  const height = Math.max(1, view.clientHeight);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const result = calculateChemistry(elapsed);
  const visualDemo = simulationAvailable && !kineticsConfigured;
  const displayProgress = simulationAvailable
    ? getDisplayProgress(elapsed, durationSeconds)
    : result.progress;
  drawChart(result, displayProgress, visualDemo);
}

playButton.addEventListener('click', togglePlayback);
initialRatesFileInput.addEventListener('change', () => {
  readInitialRatesFile(initialRatesFileInput.files && initialRatesFileInput.files[0]);
});
concentrationTimeFileInput.addEventListener('change', () => {
  readConcentrationTimeFile(concentrationTimeFileInput.files && concentrationTimeFileInput.files[0]);
});
downloadConcentrationTemplateButton.addEventListener('click', downloadConcentrationTimeTemplate);
analyzeConcentrationTimeButton.addEventListener('click', analyzeConcentrationTime);
downloadFitTemplateButton.addEventListener('click', downloadInitialRatesTemplate);
analyzeInitialRatesButton.addEventListener('click', analyzeInitialRates);
applyFittedParametersButton.addEventListener('click', applyExperimentalFitToSimulator);
applyConcentrationFitButton.addEventListener('click', applyExperimentalFitToSimulator);
document.getElementById('reset-sim').addEventListener('click', () => {
  playing = false;
  elapsed = 0;
  refreshView();
});
document.getElementById('reset-camera').addEventListener('click', () => {
  camera.position.set(0, 0.3, 10.2);
  orbit.target.set(0, 0, 0);
  orbit.update();
});
timeline.addEventListener('input', () => {
  playing = false;
  elapsed = Number(timeline.value);
  refreshView(false);
});
temperature.addEventListener('input', () => {
  playing = false;
  temperatureC = Number(temperature.value);
  refreshView(true);
});
speedSelect.addEventListener('change', () => {
  playbackSpeed = Number(speedSelect.value);
});
acidAmountInput.addEventListener('input', () => {
  playing = false;
  elapsed = 0;
  acidConcentrationM = Number(acidAmountInput.value);
  refreshView(true);
});
bicarbonateAmountInput.addEventListener('input', () => {
  playing = false;
  elapsed = 0;
  bicarbonateConcentrationM = Number(bicarbonateAmountInput.value);
  refreshView(true);
});
for (const input of [
  volumeInput, rateConstantInput, acidOrderInput, bicarbonateOrderInput,
  referenceTemperatureInput, activationEnergyInput, durationInput, kineticsSourceInput
]) {
  input.addEventListener('change', () => {
    playing = false;
    elapsed = 0;
    refreshView(true);
  });
}
window.addEventListener('resize', onResize);
window.addEventListener('beforeunload', () => {
  if (animationFrame) window.cancelAnimationFrame(animationFrame);
  if (orbit) orbit.dispose();
  if (renderer) renderer.dispose();
});

async function startSimulator() {
  try {
    await loadChemistryCore();
    initScene();
    refreshView(true);
    animate(0);
  } catch (error) {
    console.error('CHEMVERSE molecular simulator failed:', error);
    engineStatus.classList.add('is-error');
    engineState.textContent = 'فشل تحميل نواة C++ / WebAssembly';
    loading.textContent = 'تعذر تشغيل محرك الكيمياء. تأكد من وجود wasm/chemistry_core.wasm ثم حدّث الصفحة.';
  }
}
startSimulator();
