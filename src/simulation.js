import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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
const kineticsParameterStatus = document.getElementById('kinetics-parameter-status');
const rateConstantUnit = document.getElementById('rate-constant-unit');
const acidConcentrationOutput = document.getElementById('acid-concentration-output');
const bicarbonateConcentrationOutput = document.getElementById('bicarbonate-concentration-output');
const reactionRateOutput = document.getElementById('reaction-rate-output');
const effectiveKOutput = document.getElementById('effective-k-output');
const chartDuration = document.getElementById('chart-duration');

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
let acidAmountMmol = Number(acidAmountInput.value);
let bicarbonateAmountMmol = Number(bicarbonateAmountInput.value);
let volumeMl = Number(volumeInput.value);
let durationSeconds = Number(durationInput.value);
let rateConstant = null;
let acidReactionOrder = null;
let bicarbonateReactionOrder = null;
let referenceTemperatureC = Number(referenceTemperatureInput.value);
let activationEnergyKJ = null;
let kineticsCurve = null;
let kineticsConfigured = false;
let effectiveRateConstant = 0;
let chemistryCore = null;
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
  const required = ['memory', 'cv_calculate_reaction', 'cv_reaction_is_balanced', 'cv_engine_version', 'cv_kinetics_simulate', 'cv_kinetics_last_error', 'cv_kinetics_last_steps', 'cv_kinetics_effective_k', 'cv_kinetics_atom_balance_ok', 'cv_kinetics_engine_version'];
  for (const name of required) if (!(name in api)) throw new Error('Missing WebAssembly export: ' + name);
  if (api.cv_reaction_is_balanced() !== 1) throw new Error('C++ reaction formula validation failed.');
  chemistryCore = api;
  engineStatus.classList.add('is-ready');
  engineState.textContent = 'متصل · الإصدار ' + (api.cv_engine_version() / 100).toFixed(2);
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
  durationSeconds = Number(durationInput.value);
  referenceTemperatureC = Number(referenceTemperatureInput.value);
  updateRateConstantUnits();

  const hasOrders = acidReactionOrder !== null && bicarbonateReactionOrder !== null;
  const hasActivationEnergy = activationEnergyKJ !== null;
  const valid = Number.isFinite(volumeMl) && volumeMl > 0 &&
    Number.isFinite(durationSeconds) && durationSeconds > 0 && durationSeconds <= 1.0e7 &&
    Number.isFinite(referenceTemperatureC) && referenceTemperatureC > -273.15 &&
    Number.isFinite(rateConstant) && rateConstant > 0 &&
    hasOrders && Number.isFinite(acidReactionOrder) && Number.isFinite(bicarbonateReactionOrder) &&
    acidReactionOrder >= 0 && bicarbonateReactionOrder >= 0 &&
    acidReactionOrder <= 4 && bicarbonateReactionOrder <= 4 &&
    acidReactionOrder + bicarbonateReactionOrder <= 6 &&
    (!hasActivationEnergy || (Number.isFinite(activationEnergyKJ) && activationEnergyKJ >= 0));

  timeline.max = String(Number.isFinite(durationSeconds) && durationSeconds > 0 ? durationSeconds : 60);
  chartDuration.textContent = timeline.max + ' s';

  if (!valid) {
    kineticsCurve = null;
    kineticsConfigured = false;
    effectiveRateConstant = 0;
    kineticsParameterStatus.classList.remove('is-ready', 'is-error');
    kineticsParameterStatus.textContent =
      'الحركية غير مفعّلة: أدخل k موجبة ورتبتي التفاعل التجريبيتين وحجم المحلول.';
    playButton.disabled = true;
    timeline.disabled = true;
    return false;
  }

  const pointer = chemistryCore.cv_kinetics_simulate(
    acidAmountMmol, bicarbonateAmountMmol, volumeMl,
    rateConstant, acidReactionOrder, bicarbonateReactionOrder,
    temperatureC, referenceTemperatureC,
    hasActivationEnergy ? activationEnergyKJ : 0,
    hasActivationEnergy ? 1 : 0,
    durationSeconds,
    Math.min(KINETICS_MAX_STEP_SECONDS, durationSeconds / (KINETICS_SAMPLE_COUNT - 1)),
    KINETICS_SAMPLE_COUNT
  );

  if (pointer === 0 || chemistryCore.cv_kinetics_last_error() !== 0) {
    const errorCode = chemistryCore.cv_kinetics_last_error();
    kineticsCurve = null;
    kineticsConfigured = false;
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
    chemistryCore.memory.buffer,
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

  effectiveRateConstant = chemistryCore.cv_kinetics_effective_k();
  kineticsConfigured = chemistryCore.cv_kinetics_atom_balance_ok() === 1;
  if (!kineticsConfigured) throw new Error('Kinetics engine failed stoichiometric conservation validation.');

  kineticsParameterStatus.classList.remove('is-error');
  kineticsParameterStatus.classList.add('is-ready');
  kineticsParameterStatus.textContent =
    'اكتمل حساب المنحنى بـ ' + chemistryCore.cv_kinetics_last_steps() +
    ' خطوة تكامل. ' +
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
  const kineticBalanced = !kineticsConfigured || chemistryCore.cv_kinetics_atom_balance_ok() === 1;
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
  acidAmountReadout.textContent = formatMmol(acidAmountMmol);
  bicarbonateAmountReadout.textContent = formatMmol(bicarbonateAmountMmol);
  acidRemainingOutput.textContent = formatMmol(result.acidRemaining);
  bicarbonateRemainingOutput.textContent = formatMmol(result.bicarbonateRemaining);
  sodiumAcetateOutput.textContent = formatMmol(result.sodiumAcetate);
  waterOutput.textContent = formatMmol(result.water);
  carbonDioxideOutput.textContent = formatMmol(result.carbonDioxide);
  const labels = ['متساويان', 'حمض الأسيتيك', 'بيكربونات الصوديوم'];
  limitingReagentOutput.textContent = labels[result.limitingReagent] || 'غير محدد';
  atomIntegrity.classList.toggle('is-error', !result.atomBalanceOk);
  atomIntegrity.lastChild.textContent = result.atomBalanceOk
    ? ' حفظ الذرات متحقق'
    : ' فشل التحقق من حفظ الذرات';
  acidConcentrationOutput.textContent = result.acidConcentration.toExponential(3) + ' M';
  bicarbonateConcentrationOutput.textContent = result.bicarbonateConcentration.toExponential(3) + ' M';
  reactionRateOutput.textContent = result.rate.toExponential(3) + ' M/s';
  effectiveKOutput.textContent = kineticsConfigured ? result.effectiveK.toExponential(3) : '—';
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

function updateMolecularScene(time, result) {
  // Vibration remains schematic; only supplied Ea data can adjust k(T) via Arrhenius.
  const temperatureFactor = 0.7 + ((temperatureC - 20) / 40) * 0.8;
  const vibration = 0.018 * temperatureFactor;
  const progress = result.progress;
  const intermediateFade = smoothStep(0.34, 0.48, progress) * (1 - smoothStep(0.68, 0.82, progress));
  const acidVisibility = acidAmountMmol > 0 ? result.acidRemaining / acidAmountMmol : 0;
  const bicarbonateVisibility = bicarbonateAmountMmol > 0 ? result.bicarbonateRemaining / bicarbonateAmountMmol : 0;
  const approach = smoothStep(0, 0.45, progress);
  const acidX = THREE.MathUtils.lerp(-2.05, -0.88, approach);
  const bicarbonateX = THREE.MathUtils.lerp(2.05, 0.88, approach);
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
  const productVisibility = smoothStep(0.68, 0.88, progress);
  setOpacity(species.sodiumAcetate, productVisibility);
  setOpacity(species.carbonDioxide, productVisibility);
  setOpacity(species.water, productVisibility);
}

function currentStage(progress) {
  if (progress < 0.34) return 'reactants';
  if (progress < 0.82) return 'intermediate';
  return 'products';
}

function updateStageUI(progress, chemistryResult) {
  const stage = currentStage(progress);
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

  progressReadout.textContent = Math.round(chemistryResult.progress * 100) + '%';
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
  playLabel.textContent = playing ? 'إيقاف مؤقت' : (elapsed >= durationSeconds ? 'إعادة التشغيل' : 'ابدأ التفاعل');
  playButton.querySelector('.play-icon').textContent = playing ? 'Ⅱ' : '▶';
  timeReadout.textContent = formatTime(elapsed) + ' / ' + formatTime(durationSeconds);
  timeline.max = String(durationSeconds);
  timeline.value = String(elapsed);
  timeline.style.background = 'linear-gradient(to left, #72d9c5 0%, #72d9c5 ' +
    (elapsed / durationSeconds * 100) + '%, #2a424a ' + (elapsed / durationSeconds * 100) + '%, #2a424a 100%)';
  temperatureReadout.textContent = temperatureC + '°C';
  temperature.style.background = 'linear-gradient(to left, #72d9c5 0%, #72d9c5 ' +
    ((temperatureC - 20) / 40 * 100) + '%, #2a424a ' + ((temperatureC - 20) / 40 * 100) + '%, #2a424a 100%)';
  playButton.disabled = !kineticsConfigured;
  timeline.disabled = !kineticsConfigured;
}

function drawChart(result) {
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
    const yValue = sampleCount > 1
      ? kineticsCurve[leftIndex].progress +
        (kineticsCurve[rightIndex].progress - kineticsCurve[leftIndex].progress) * fraction
      : 0;
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
  const progressY = bottom - (bottom - top) * result.progress;
  chartContext.beginPath();
  chartContext.arc(progressX, progressY, 3.5, 0, Math.PI * 2);
  chartContext.fillStyle = '#e1fff5';
  chartContext.fill();
  chartContext.beginPath();
  chartContext.arc(progressX, progressY, 6, 0, Math.PI * 2);
  chartContext.strokeStyle = 'rgba(114,217,197,.35)';
  chartContext.stroke();
}

function refreshView() {
  buildKineticsCurve();
  const result = calculateChemistry(elapsed);
  updateMolecularScene(elapsed, result);
  updateStageUI(elapsed, result);
  updateChemistryReadouts(result);
  updatePlaybackUI();
  drawChart(result);
}

function togglePlayback() {
  if (!kineticsConfigured) return;
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
  updateMolecularScene(elapsed, result);
  updateStageUI(elapsed, result);
  updateChemistryReadouts(result);
  updatePlaybackUI();
  drawChart(result);
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
  drawChart(calculateChemistry(elapsed));
}

playButton.addEventListener('click', togglePlayback);
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
  refreshView();
});
temperature.addEventListener('input', () => {
  temperatureC = Number(temperature.value);
  refreshView();
});
speedSelect.addEventListener('change', () => {
  playbackSpeed = Number(speedSelect.value);
});
acidAmountInput.addEventListener('input', () => {
  playing = false;
  elapsed = 0;
  acidAmountMmol = Number(acidAmountInput.value);
  refreshView();
});
bicarbonateAmountInput.addEventListener('input', () => {
  playing = false;
  elapsed = 0;
  bicarbonateAmountMmol = Number(bicarbonateAmountInput.value);
  refreshView();
});
for (const input of [
  volumeInput, rateConstantInput, acidOrderInput, bicarbonateOrderInput,
  referenceTemperatureInput, activationEnergyInput, durationInput
]) {
  input.addEventListener('change', () => {
    playing = false;
    elapsed = 0;
    refreshView();
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
    refreshView();
    animate(0);
  } catch (error) {
    console.error('CHEMVERSE molecular simulator failed:', error);
    engineStatus.classList.add('is-error');
    engineState.textContent = 'فشل تحميل نواة C++ / WebAssembly';
    loading.textContent = 'تعذر تشغيل محرك الكيمياء. تأكد من وجود wasm/chemistry_core.wasm ثم حدّث الصفحة.';
  }
}
startSimulator();
