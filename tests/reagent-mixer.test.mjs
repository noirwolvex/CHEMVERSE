import test from 'node:test';
import assert from 'node:assert/strict';
import { REAGENTS, evaluateMixture } from '../src/reagent-mixer.mjs';

test('the mixing lab exposes eight unique virtual reagent bottles', () => {
  assert.equal(REAGENTS.length, 8);
  assert.equal(new Set(REAGENTS.map((item) => item.id)).size, 8);
  assert.ok(REAGENTS.every((item) => item.color && item.formula));
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
  assert.match(result.explanation, /hydrogen carbonate/i);
});

test('citric acid and bicarbonate use a balanced illustrative equation', () => {
  const result = evaluateMixture(['bicarbonate', 'citric-acid']);
  assert.equal(result.key, 'citric-bicarbonate');
  assert.match(result.equation, /3 NaHCO₃/);
  assert.match(result.equation, /3 CO₂↑/);
});

test('acetic acid and sodium carbonate produce a balanced carbon-dioxide equation', () => {
  const result = evaluateMixture(['carbonate', 'vinegar']);
  assert.equal(result.key, 'vinegar-carbonate');
  assert.equal(result.effect, 'foam-burst');
  assert.match(result.equation, /2 CH₃COOH/);
  assert.match(result.equation, /2 CH₃COONa/);
});

test('citric acid and sodium carbonate produce a balanced carbon-dioxide equation', () => {
  const result = evaluateMixture(['citric-acid', 'carbonate']);
  assert.equal(result.key, 'citric-carbonate');
  assert.match(result.equation, /3 Na₂CO₃/);
  assert.match(result.equation, /3 CO₂↑/);
});

test('calcium chloride and sodium carbonate form a calcium carbonate precipitate', () => {
  const result = evaluateMixture(['calcium', 'carbonate']);
  assert.equal(result.key, 'calcium-carbonate-precipitate');
  assert.equal(result.effect, 'precipitate');
  assert.match(result.equation, /CaCO₃↓/);
  assert.match(result.netIonicEquation, /Ca²⁺ \+ CO₃²⁻/);
  assert.match(result.explanation, /spectator ions/i);
  assert.match(evaluateMixture(['carbonate', 'calcium']).equation, /CaCO₃↓/);
});

test('acid and red-cabbage indicator demonstrate an acidic colour response', () => {
  assert.equal(evaluateMixture(['vinegar', 'indicator']).key, 'acid-indicator');
  assert.equal(evaluateMixture(['indicator', 'citric-acid']).effect, 'colour-shift');
});

test('bicarbonate and carbonate each demonstrate an alkaline indicator response', () => {
  assert.equal(evaluateMixture(['bicarbonate', 'indicator']).key, 'base-indicator');
  assert.equal(evaluateMixture(['carbonate', 'indicator']).key, 'carbonate-indicator');
});

test('neutral indicator and non-indicator pairs do not invent a reaction', () => {
  const neutralIndicator = evaluateMixture(['salt', 'indicator']);
  assert.equal(neutralIndicator.key, 'neutral-indicator');
  assert.equal(neutralIndicator.effect, 'mixing-vortex');
  assert.equal(evaluateMixture(['salt', 'sugar']).effect, 'mixing-vortex');
  assert.equal(evaluateMixture(['vinegar', 'citric-acid']).effect, 'mixing-vortex');
});

test('every valid outcome includes explanation, observation, equation, and model limits', () => {
  const pairs = [
    ['vinegar', 'bicarbonate'], ['citric-acid', 'bicarbonate'],
    ['vinegar', 'carbonate'], ['citric-acid', 'carbonate'],
    ['calcium', 'carbonate'], ['vinegar', 'indicator'],
    ['bicarbonate', 'indicator'], ['carbonate', 'indicator'],
    ['salt', 'indicator'], ['salt', 'sugar']
  ];
  for (const pair of pairs) {
    const result = evaluateMixture(pair);
    assert.ok(result.explanation.length > 30, pair.join(' + '));
    assert.ok(result.observation.length > 10, pair.join(' + '));
    assert.ok(result.equation.length > 5, pair.join(' + '));
    assert.ok(result.modelLimit.includes('qualitative'), pair.join(' + '));
  }
});
