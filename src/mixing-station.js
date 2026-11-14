import { REAGENTS, evaluateMixture } from './reagent-mixer.mjs';

const bottleButtons = [...document.querySelectorAll('[data-reagent]')];
const selectedCount = document.getElementById('selected-count');
const selectionList = document.getElementById('selection-list');
const mixButton = document.getElementById('mix-button');
const resetButton = document.getElementById('reset-button');
const stage = document.getElementById('reactor-stage');
const liquid = document.getElementById('vessel-liquid');
const bubbleLayer = document.getElementById('bubble-layer');
const stageStatus = document.getElementById('stage-status');
const visualLabel = document.getElementById('visual-label');
const outcomeType = document.getElementById('outcome-type');
const outcomeTitle = document.getElementById('outcome-title');
const outcomeDescription = document.getElementById('outcome-description');
const outcomeEquation = document.getElementById('outcome-equation');

const selectedReagents = new Set();
let lastOutcomeKey = null;

function renderSelection() {
  selectedCount.textContent = String(selectedReagents.size).padStart(2, '0');
  mixButton.disabled = selectedReagents.size !== 2;

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
    const reagent = REAGENTS.find((item) => item.id === id);
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

function renderOutcome(outcome) {
  stage.dataset.effect = outcome.effect;
  stage.style.setProperty('--liquid-color', outcome.color);
  liquid.style.height = outcome.effect === 'foam-burst' ? '46%' : outcome.effect === 'quiet' ? '28%' : '36%';
  bubbleLayer.replaceChildren();

  if (outcome.effect === 'foam-burst') {
    for (let index = 0; index < 16; index += 1) {
      const bubble = document.createElement('span');
      bubble.className = 'bubble';
      bubble.style.left = `${8 + ((index * 37) % 84)}%`;
      bubble.style.setProperty('--bubble-size', `${5 + (index % 4) * 3}px`);
      bubble.style.setProperty('--bubble-delay', `${(index % 6) * -0.22}s`);
      bubble.style.setProperty('--bubble-duration', `${1.45 + (index % 4) * 0.2}s`);
      bubbleLayer.append(bubble);
    }
  }

  stageStatus.textContent = outcome.phenomenon;
  visualLabel.textContent = outcome.visualLabel;
  outcomeType.textContent = outcome.phenomenon;
  outcomeTitle.textContent = outcome.title;
  outcomeDescription.textContent = outcome.description;
  outcomeEquation.textContent = outcome.equation;
}

function mixSelectedReagents() {
  const outcome = evaluateMixture([...selectedReagents]);
  if (!outcome) return;
  lastOutcomeKey = outcome.key;
  renderOutcome(outcome);
}

function clearPreviousOutcome() {
  if (!lastOutcomeKey) return;
  lastOutcomeKey = null;
  stage.dataset.effect = 'idle';
  stage.style.setProperty('--liquid-color', '#82cfc0');
  liquid.style.height = '10%';
  bubbleLayer.replaceChildren();
  stageStatus.textContent = 'AWAITING TWO REAGENTS';
  visualLabel.textContent = 'MIXTURE CHANGED';
  outcomeType.textContent = 'READY TO MIX';
  outcomeTitle.textContent = 'Selection updated';
  outcomeDescription.textContent = 'Your bottle selection changed. Mix the new pair to calculate its qualitative outcome.';
  outcomeEquation.textContent = '—';
}

function resetVessel() {
  selectedReagents.clear();
  lastOutcomeKey = null;
  stage.dataset.effect = 'idle';
  stage.style.setProperty('--liquid-color', '#82cfc0');
  liquid.style.height = '10%';
  bubbleLayer.replaceChildren();
  stageStatus.textContent = 'AWAITING TWO REAGENTS';
  visualLabel.textContent = 'NO MIXTURE';
  outcomeType.textContent = 'STANDBY';
  outcomeTitle.textContent = 'Ready for an experiment';
  outcomeDescription.textContent = 'Select two reagents to start. The result will appear here with a reaction summary.';
  outcomeEquation.textContent = '—';
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
    if (selectedReagents.size !== previousSize || lastOutcomeKey) clearPreviousOutcome();
    renderSelection();
  });
}

mixButton.addEventListener('click', mixSelectedReagents);
resetButton.addEventListener('click', resetVessel);
renderSelection();
