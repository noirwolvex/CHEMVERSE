import test from 'node:test';
import assert from 'node:assert/strict';
import { REAGENTS, evaluateMixture } from '../src/reagent-mixer.mjs';

test('the mixing lab exposes six unique virtual reagent bottles', () => {
  assert.equal(REAGENTS.length, 6);
  assert.equal(new Set(REAGENTS.map((item) => item.id)).size, 6);
});

test('invalid, incomplete, duplicate, or oversized mixtures are rejected', () => {
  assert.equal(evaluateMixture([]), null);
  assert.equal(evaluateMixture(['vinegar']), null);
  assert.equal(evaluateMixture(['vinegar', 'vinegar']), null);
  assert.equal(evaluateMixture(['vinegar', 'bicarbonate', 'indicator']), null);
  assert.equal(evaluateMixture(['vinegar', 'unknown']), null);
  assert.equal(evaluateMixture(null), null);
});

test('diluted vinegar and bicarbonate produce a carbon-dioxide fizz outcome', () => {
  const result = evaluateMixture(['vinegar', 'bicarbonate']);
  assert.equal(result.key, 'vinegar-bicarbonate');
  assert.equal(result.effect, 'foam-burst');
  assert.match(result.equation, /CO₂↑/);
});

test('citric acid and bicarbonate use a balanced illustrative equation', () => {
  const result = evaluateMixture(['bicarbonate', 'citric-acid']);
  assert.equal(result.key, 'citric-bicarbonate');
  assert.match(result.equation, /3 NaHCO₃/);
  assert.match(result.equation, /3 CO₂↑/);
});

test('acid and red-cabbage indicator demonstrate an acidic colour response', () => {
  assert.equal(evaluateMixture(['vinegar', 'indicator']).key, 'acid-indicator');
  assert.equal(evaluateMixture(['indicator', 'citric-acid']).effect, 'colour-shift');
});

test('bicarbonate and indicator demonstrate an alkaline colour response', () => {
  assert.equal(evaluateMixture(['bicarbonate', 'indicator']).key, 'base-indicator');
});

test('neutral indicator and non-indicator pairs do not invent a reaction', () => {
  assert.equal(evaluateMixture(['salt', 'indicator']).key, 'neutral-indicator');
  assert.equal(evaluateMixture(['salt', 'sugar']).key, 'no-visible-reaction');
  assert.equal(evaluateMixture(['vinegar', 'citric-acid']).key, 'no-visible-reaction');
});
