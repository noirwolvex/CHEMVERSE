import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MECHANISM_CHECKPOINTS,
  getAdjacentMechanismCheckpoint
} from '../src/mechanism-timeline.mjs';

test('mechanism timeline exposes the three stable presentation checkpoints', () => {
  assert.deepEqual(MECHANISM_CHECKPOINTS, [0, 0.5, 1]);
});

test('step forward advances to the next checkpoint and clamps at products', () => {
  assert.equal(getAdjacentMechanismCheckpoint(0, 1), 0.5);
  assert.equal(getAdjacentMechanismCheckpoint(0.2, 1), 0.5);
  assert.equal(getAdjacentMechanismCheckpoint(0.5, 1), 1);
  assert.equal(getAdjacentMechanismCheckpoint(0.75, 1), 1);
  assert.equal(getAdjacentMechanismCheckpoint(1, 1), 1);
});

test('step backward returns to the prior checkpoint and clamps at reactants', () => {
  assert.equal(getAdjacentMechanismCheckpoint(1, -1), 0.5);
  assert.equal(getAdjacentMechanismCheckpoint(0.8, -1), 0.5);
  assert.equal(getAdjacentMechanismCheckpoint(0.5, -1), 0);
  assert.equal(getAdjacentMechanismCheckpoint(0.2, -1), 0);
  assert.equal(getAdjacentMechanismCheckpoint(0, -1), 0);
});

test('navigation handles invalid progress and ignores unknown directions', () => {
  assert.equal(getAdjacentMechanismCheckpoint(Number.NaN, 1), 0.5);
  assert.equal(getAdjacentMechanismCheckpoint(-4, -1), 0);
  assert.equal(getAdjacentMechanismCheckpoint(4, 1), 1);
  assert.equal(getAdjacentMechanismCheckpoint(0.4, 0), 0.4);
});
