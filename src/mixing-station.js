import { REAGENTS, evaluateMixture } from './reagent-mixer.mjs';
import { getReactionVisualProfile } from './reaction-visuals.mjs';

const bottleButtons = [...document.querySelectorAll('[data-reagent]')];
const selectedCount = document.getElementById('selected-count');
const selectionList = document.getElementById('selection-list');
const mixButton = document.getElementById('mix-button');
const mixButtonLabel = document.getElementById('mix-button-label');
const resetButton = document.getElementById('reset-button');
const stage = document.getElementById('reactor-stage');
const liquid = document.getElementById('vessel-liquid');
const bubbleLayer = document.getElementById('bubble-layer');
const precipitateLayer = document.getElementById('precipitate-layer');
const reactionParticleLayer = document.getElementById('reaction-particle-layer');
const colourSwirl = document.getElementById('colour-swirl');
const stageStatus = document.getElementById('stage-status');
const visualLabel = document.getElementById('visual-label');
const outcomeType = document.getElementById('outcome-type');
const outcomeTitle = document.getElementById('outcome-title');
const outcomeDescription = document.getElementById('outcome-description');
const outcomeExplanation = document.getElementById('outcome-explanation');
const outcomeObservation = document.getElementById('outcome-observation');
const outcomeEquation = document.getElementById('outcome-equation');
const pourSources = [
  { root: document.getElementById('pour-source-left'), fluid: document.getElementById('pour-fluid-left'), label: document.getElementById('pour-label-left') },
  { root: document.getElementById('pour-source-right'), fluid: document.getElementById('pour-fluid-right'), label: document.getElementById('pour-label-right') }
];

const selectedReagents = new Set();
let lastOutcomeKey = null;
let pourTimer = null;
let runToken = 0;

function getReagent(id) {
  return REAGENTS.find((item) => item.id === id);
}

function stopPourAnimation() {
  runToken += 1;
  if (pourTimer !== null) {
    window.clearTimeout(pourTimer);
    pourTimer = null;
  }
  mixButton.disabled = selectedReagents.size !== 2;
  mixButtonLabel.textContent = 'MIX REAGENTS';
}

function renderSelection() {
  selectedCount.textContent = String(selectedReagents.size).padStart(2, '0');
  mixButton.disabled = selectedReagents.size !== 2 || stage.dataset.phase === 'pouring';

  for (const button of bottleButtons) {
    const isSelected = selectedReagents.has(button.dataset.reagent);
    button.classList.toggle('is-selected', isSelected);
    button.setAttribute('aria-pressed', String(isSelected));
  }

  selectionList.replaceChildren();
  if (selectedReagents.size === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-selection';
    empty.textContent = 'Choose two bottles from the reagent library.';
    selectionList.append(empty);
    return;
  }

  for (const id of selectedReagents) {
    const reagent = getReagent(id);
    if (!reagent) continue;
    const row = document.createElement('div');
    row.className = 'selected-reagent';
    const name = document.createElement('span');
    name.textContent = reagent.name;
    const formula = document.createElement('small');
    formula.textContent = reagent.formula;
    row.append(name, formula);
    selectionList.append(row);
  }
}

function setPourSources() {
  const selected = [...selectedReagents].map(getReagent);
  pourSources.forEach((source, index) => {
    const reagent = selected[index];
    if (!reagent) {
      source.label.textContent = '';
      source.fluid.style.setProperty('--source-liquid', 'transparent');
      return;
    }
    source.label.textContent = reagent.shortName.toUpperCase();
    source.fluid.style.setProperty('--source-liquid', reagent.color);
    source.root.setAttribute('aria-label', reagent.name);
  });
}

function renderBubbles(count) {
  bubbleLayer.replaceChildren();
  for (let index = 0; index < count; index += 1) {
    const bubble = document.createElement('span');
    bubble.className = 'bubble';
    bubble.style.left = String(4 + ((index * 47) % 92)) + '%';
    bubble.style.setProperty('--bubble-size', String(5 + (index % 6) * 2) + 'px');
    bubble.style.setProperty('--bubble-delay', String((index % 9) * -0.13) + 's');
    bubble.style.setProperty('--bubble-duration', String(0.72 + (index % 5) * 0.14) + 's');
    bubbleLayer.append(bubble);
  }
}

function renderSplashParticles(count, colour) {
  reactionParticleLayer.replaceChildren();
  for (let index = 0; index < count; index += 1) {
    const angle = Math.PI + (Math.PI * index) / Math.max(1, count - 1);
    const distance = 58 + (index % 6) * 13;
    const travelX = Math.cos(angle) * distance;
    const peakY = Math.sin(angle) * distance - 24;
    const endY = peakY + 86;
    const particle = document.createElement('span');
    particle.className = 'reaction-splash-particle';
    particle.style.setProperty('--spray-x', String(travelX.toFixed(1)) + 'px');
    particle.style.setProperty('--spray-y-peak', String(peakY.toFixed(1)) + 'px');
    particle.style.setProperty('--spray-y-end', String(endY.toFixed(1)) + 'px');
    particle.style.setProperty('--spray-delay', String((index % 8) * 0.025) + 's');
    particle.style.setProperty('--spray-duration', String(1.05 + (index % 5) * 0.12) + 's');
    particle.style.setProperty('--spray-size', String(4 + (index % 5) * 2) + 'px');
    particle.style.setProperty('--spray-color', colour);
    reactionParticleLayer.append(particle);
  }
}

function renderPrecipitate(count) {
  precipitateLayer.replaceChildren();
  for (let index = 0; index < count; index += 1) {
    const particle = document.createElement('i');
    particle.className = 'precipitate-particle';
    particle.style.left = String(4 + ((index * 29) % 92)) + '%';
    particle.style.setProperty('--particle-size', String(3 + (index % 5)) + 'px');
    particle.style.setProperty('--settle-delay', String((index % 9) * 0.045) + 's');
    particle.style.setProperty('--settle-duration', String(0.85 + (index % 5) * 0.16) + 's');
    precipitateLayer.append(particle);
  }
}

function renderOutcome(outcome) {
  const profile = getReactionVisualProfile(outcome.effect);
  if (!profile) return;

  stage.dataset.effect = outcome.effect;
  stage.dataset.phase = 'reaction';
  stage.style.setProperty('--liquid-color', outcome.color);
  liquid.style.height = profile.liquidHeight;

  bubbleLayer.replaceChildren();
  precipitateLayer.replaceChildren();
  reactionParticleLayer.replaceChildren();
  colourSwirl.classList.remove('is-active');
  if (profile.bubbleCount) renderBubbles(profile.bubbleCount);
  if (profile.splashCount) renderSplashParticles(profile.splashCount, outcome.color);
  if (profile.precipitateCount) renderPrecipitate(profile.precipitateCount);
  if (profile.colourSwirl) colourSwirl.classList.add('is-active');

  stageStatus.textContent = outcome.effect === 'foam-burst' ? 'VIGOROUS CO₂ RELEASE' : outcome.phenomenon;
  visualLabel.textContent = outcome.effect === 'foam-burst' ? 'BUBBLES / FOAM ERUPTION' : outcome.visualLabel;
  outcomeType.textContent = outcome.phenomenon;
  outcomeTitle.textContent = outcome.title;
  outcomeDescription.textContent = outcome.description;
  outcomeExplanation.textContent = outcome.explanation;
  outcomeObservation.textContent = outcome.observation;
  outcomeEquation.textContent = outcome.netIonicEquation
    ? outcome.equation + ' | Net ionic: ' + outcome.netIonicEquation
    : outcome.equation;

  mixButtonLabel.textContent = 'REACTION IN PROGRESS…';
  mixButton.disabled = true;
  const activeRun = runToken;
  pourTimer = window.setTimeout(() => {
    if (activeRun !== runToken) return;
    pourTimer = null;
    stage.dataset.phase = 'result';
    mixButtonLabel.textContent = 'MIX AGAIN';
    mixButton.disabled = selectedReagents.size !== 2;
  }, profile.phaseDurationMs);
}

function mixSelectedReagents() {
  const outcome = evaluateMixture([...selectedReagents]);
  if (!outcome || stage.dataset.phase === 'pouring') return;

  stopPourAnimation();
  lastOutcomeKey = outcome.key;
  setPourSources();
  stage.dataset.effect = 'idle';
  stage.dataset.phase = 'pouring';
  stageStatus.textContent = 'POURING SELECTED REAGENTS';
  visualLabel.textContent = 'TRANSFER IN PROGRESS';
  mixButton.disabled = true;
  mixButtonLabel.textContent = 'POURING…';
  bubbleLayer.replaceChildren();
  precipitateLayer.replaceChildren();
  reactionParticleLayer.replaceChildren();
  colourSwirl.classList.remove('is-active');

  const activeRun = runToken;
  pourTimer = window.setTimeout(() => {
    if (activeRun !== runToken) return;
    pourTimer = null;
    renderOutcome(outcome);
  }, 1450);
}

function resetSciencePanel() {
  outcomeType.textContent = 'STANDBY';
  outcomeTitle.textContent = 'Ready for an experiment';
  outcomeDescription.textContent = 'Select two reagents to start. The result will appear here with a reaction summary.';
  outcomeExplanation.textContent = 'The explanation will describe the chemical process after mixing.';
  outcomeObservation.textContent = 'Observe gas bubbles, a colour shift, a cloudy precipitate, or no visible change.';
  outcomeEquation.textContent = '—';
}

function clearPreviousOutcome() {
  if (!lastOutcomeKey && stage.dataset.phase !== 'pouring') return;
  stopPourAnimation();
  lastOutcomeKey = null;
  stage.dataset.phase = 'idle';
  stage.dataset.effect = 'idle';
  stage.style.setProperty('--liquid-color', '#82cfc0');
  liquid.style.height = '10%';
  bubbleLayer.replaceChildren();
  precipitateLayer.replaceChildren();
  reactionParticleLayer.replaceChildren();
  colourSwirl.classList.remove('is-active');
  stageStatus.textContent = 'AWAITING TWO REAGENTS';
  visualLabel.textContent = 'MIXTURE CHANGED';
  resetSciencePanel();
}

function resetVessel() {
  stopPourAnimation();
  selectedReagents.clear();
  lastOutcomeKey = null;
  stage.dataset.phase = 'idle';
  stage.dataset.effect = 'idle';
  stage.style.setProperty('--liquid-color', '#82cfc0');
  liquid.style.height = '10%';
  bubbleLayer.replaceChildren();
  precipitateLayer.replaceChildren();
  reactionParticleLayer.replaceChildren();
  colourSwirl.classList.remove('is-active');
  stageStatus.textContent = 'AWAITING TWO REAGENTS';
  visualLabel.textContent = 'NO MIXTURE';
  resetSciencePanel();
  renderSelection();
}

for (const button of bottleButtons) {
  button.addEventListener('click', () => {
    const id = button.dataset.reagent;
    if (!id) return;
    const previousSize = selectedReagents.size;
    if (selectedReagents.has(id)) {
      selectedReagents.delete(id);
    } else if (selectedReagents.size < 2) {
      selectedReagents.add(id);
    }
    if (selectedReagents.size !== previousSize) clearPreviousOutcome();
    renderSelection();
  });
}

mixButton.addEventListener('click', mixSelectedReagents);
resetButton.addEventListener('click', resetVessel);
renderSelection();
