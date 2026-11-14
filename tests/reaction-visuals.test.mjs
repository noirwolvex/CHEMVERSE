import test from 'node:test';
import assert from 'node:assert/strict';
import { getReactionVisualProfile } from '../src/reaction-visuals.mjs';

test('gas-producing reactions use vigorous bubbles and foam eruption', () => {
  const profile = getReactionVisualProfile('foam-burst');
  assert.ok(profile.bubbleCount >= 40);
  assert.ok(profile.splashCount >= 30);
  assert.equal(profile.colourSwirl, false);
  assert.ok(profile.phaseDurationMs >= 2000);
});
test('precipitation uses a dense settling-particle visual', () => {
  const profile = getReactionVisualProfile('precipitate');
  assert.ok(profile.precipitateCount >= 60);
  assert.equal(profile.bubbleCount, 0);
  assert.equal(profile.liquidHeight, '48%');
});
test('indicator reactions use a colour-swirling visual', () => {
  const profile = getReactionVisualProfile('colour-shift');
  assert.equal(profile.colourSwirl, true);
  assert.ok(profile.phaseDurationMs > 1000);
});
test('quiet mixtures do not invent a dramatic reaction effect', () => {
  const profile = getReactionVisualProfile('quiet');
  assert.equal(profile.bubbleCount, 0);
  assert.equal(profile.splashCount, 0);
  assert.equal(profile.precipitateCount, 0);
});
test('unknown visual effects are rejected', () => {
  assert.equal(getReactionVisualProfile('explosion'), null);
  assert.equal(getReactionVisualProfile('unknown'), null);
});
