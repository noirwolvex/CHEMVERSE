import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDisplayProgress,
  getReactionStage,
  getStageVisuals
} from '../src/reaction-stages.mjs';

test('visual demo uses elapsed presentation time, not the zero kinetic fallback', () => {
  assert.equal(getDisplayProgress(0, 18, 0, false), 0);
  assert.equal(getDisplayProgress(3, 18, 0, false), 1 / 6);
  assert.equal(getDisplayProgress(9, 18, 0, false), 0.5);
  assert.equal(getDisplayProgress(18, 18, 0, false), 1);
  assert.equal(getDisplayProgress(30, 18, 0, false), 1);
});

test('validated kinetics progress takes precedence over presentation time', () => {
  assert.equal(getDisplayProgress(1, 18, 0.58, true), 0.58);
  assert.equal(getDisplayProgress(12, 18, 1.4, true), 1);
  assert.equal(getDisplayProgress(12, 18, -0.1, true), 0);
});

test('visual demo transitions in order across three equal time phases', () => {
  assert.equal(getReactionStage(0.32, true), 'reactants');
  assert.equal(getReactionStage(1 / 3, true), 'intermediate');
  assert.equal(getReactionStage(0.66, true), 'intermediate');
  assert.equal(getReactionStage(2 / 3, true), 'products');
  assert.equal(getReactionStage(1, true), 'products');
});

test('scientific stages remain tied to calculated conversion thresholds', () => {
  assert.equal(getReactionStage(0.339, false), 'reactants');
  assert.equal(getReactionStage(0.34, false), 'intermediate');
  assert.equal(getReactionStage(0.819, false), 'intermediate');
  assert.equal(getReactionStage(0.82, false), 'products');
});

test('visual species fade in the intended sequence', () => {
  const first = getStageVisuals(0.12, true);
  const second = getStageVisuals(0.5, true);
  const third = getStageVisuals(0.9, true);

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
  assert.equal(getDisplayProgress(5, 0, 0, false), 0);
  assert.equal(getDisplayProgress(Number.NaN, 18, 0, false), 0);
});
