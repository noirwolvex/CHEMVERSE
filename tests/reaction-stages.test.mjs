import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDisplayProgress,
  getReactionStage,
  getStageVisuals
} from '../src/reaction-stages.mjs';

test('stage choreography follows elapsed time even when kinetic conversion is low', () => {
  assert.equal(getDisplayProgress(0, 18), 0);
  assert.equal(getDisplayProgress(3, 18), 1 / 6);
  assert.equal(getDisplayProgress(6, 18), 1 / 3);
  assert.equal(getDisplayProgress(9, 18), 0.5);
  assert.equal(getDisplayProgress(12, 18), 2 / 3);
  assert.equal(getDisplayProgress(18, 18), 1);
});

test('low, medium, and high kinetic conversion do not change presentation stage timing', () => {
  for (const kineticConversion of [0, 0.01, 0.2, 0.58, 0.99]) {
    // Kinetic conversion is intentionally not an input to the presentation clock.
    assert.equal(getDisplayProgress(6, 18), 1 / 3, `kinetic conversion ${kineticConversion}`);
    assert.equal(getDisplayProgress(12, 18), 2 / 3, `kinetic conversion ${kineticConversion}`);
  }
});

test('the three presentation stages activate in sequence', () => {
  assert.equal(getReactionStage(0.32), 'reactants');
  assert.equal(getReactionStage(1 / 3), 'intermediate');
  assert.equal(getReactionStage(0.66), 'intermediate');
  assert.equal(getReactionStage(2 / 3), 'products');
  assert.equal(getReactionStage(1), 'products');
});

test('molecular species fade in the intended sequence', () => {
  const first = getStageVisuals(0.12);
  const second = getStageVisuals(0.5);
  const third = getStageVisuals(0.9);

  assert.ok(first.reactants > 0.9);
  assert.ok(first.intermediate < 0.01);
  assert.ok(first.products < 0.01);

  assert.ok(second.intermediate > 0.95);
  assert.ok(second.reactants < 0.01);
  assert.ok(second.products < 0.01);

  assert.ok(third.products > 0.99);
  assert.ok(third.intermediate < 0.01);
  assert.ok(third.reactants < 0.01);
});

test('invalid or zero duration safely holds the visual stage at its start', () => {
  assert.equal(getDisplayProgress(5, 0), 0);
  assert.equal(getDisplayProgress(Number.NaN, 18), 0);
  assert.equal(getDisplayProgress(-4, 18), 0);
  assert.equal(getDisplayProgress(30, 18), 1);
});
