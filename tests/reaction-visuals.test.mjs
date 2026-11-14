import test from 'node:test';
import assert from 'node:assert/strict';
import { getReactionVisualProfile } from '../src/reaction-visuals.mjs';
import { REAGENTS, evaluateMixture } from '../src/reagent-mixer.mjs';

test('gas-producing reactions use vigorous bubbles, foam and splash', () => {
  const profile = getReactionVisualProfile('foam-burst');
  assert.ok(profile.bubbleCount >= 65);
  assert.ok(profile.splashCount >= 40);
  assert.ok(profile.currentCount >= 20);
  assert.equal(profile.colourSwirl, false);
  assert.equal(profile.visibleMotion, true);
  assert.ok(profile.phaseDurationMs >= 2800);
});

test('precipitation uses a dense settling cloud and visible liquid currents', () => {
  const profile = getReactionVisualProfile('precipitate');
  assert.ok(profile.precipitateCount >= 100);
  assert.ok(profile.currentCount >= 35);
  assert.equal(profile.bubbleCount, 0);
  assert.equal(profile.fluidVortex, true);
  assert.equal(profile.liquidHeight, '50%');
});

test('indicator reactions show a strong coloured bloom without inventing gas', () => {
  const profile = getReactionVisualProfile('colour-shift');
  assert.equal(profile.colourSwirl, true);
  assert.equal(profile.fluidVortex, true);
  assert.ok(profile.splashCount >= 28);
  assert.equal(profile.bubbleCount, 0);
  assert.ok(profile.phaseDurationMs >= 2500);
});

test('mixtures without a visible chemical reaction still show physical fluid mixing', () => {
  const profile = getReactionVisualProfile('mixing-vortex');
  assert.equal(profile.visibleMotion, true);
  assert.equal(profile.fluidVortex, true);
  assert.ok(profile.currentCount >= 45);
  assert.ok(profile.splashCount >= 16);
  assert.equal(profile.bubbleCount, 0);
  assert.ok(profile.phaseDurationMs >= 2500);
});

test('all 28 unique pairs in the eight-bottle rack receive a visible effect profile', () => {
  let pairCount = 0;
  for (let first = 0; first < REAGENTS.length; first += 1) {
    for (let second = first + 1; second < REAGENTS.length; second += 1) {
      const pair = [REAGENTS[first].id, REAGENTS[second].id];
      const outcome = evaluateMixture(pair);
      assert.ok(outcome, pair.join(' + '));
      const profile = getReactionVisualProfile(outcome.effect);
      assert.ok(profile, `Missing visual profile for ${pair.join(' + ')}`);
      assert.equal(profile.visibleMotion, true, pair.join(' + '));
      assert.ok(profile.phaseDurationMs >= 2500, pair.join(' + '));
      assert.ok(profile.currentCount >= 20 || profile.bubbleCount >= 40 || profile.precipitateCount >= 60, pair.join(' + '));
      pairCount += 1;
    }
  }
  assert.equal(pairCount, 28);
});

test('unknown visual effect identifiers are rejected', () => {
  assert.equal(getReactionVisualProfile('quiet'), null);
  assert.equal(getReactionVisualProfile('explosion'), null);
  assert.equal(getReactionVisualProfile('unknown'), null);
});


test('every visual profile includes tuned real-time particle dynamics', () => {
  for (const effect of ['foam-burst', 'precipitate', 'colour-shift', 'mixing-vortex']) {
    const profile = getReactionVisualProfile(effect);
    assert.ok(profile.fx, effect);
    assert.ok(profile.fx.currentCount >= 50, effect);
    assert.ok(profile.fx.vortexSpeed > 1, effect);
    assert.ok(profile.phaseDurationMs >= 3500, effect);
  }
  assert.ok(getReactionVisualProfile('foam-burst').fx.bubbleRate >= 30);
  assert.ok(getReactionVisualProfile('foam-burst').fx.foamRate >= 20);
  assert.ok(getReactionVisualProfile('foam-burst').fx.maxBubbles >= 70);
  assert.equal(getReactionVisualProfile('precipitate').fx.bubbleRate, 0);
  assert.ok(getReactionVisualProfile('precipitate').fx.sedimentCount >= 70);
  assert.ok(getReactionVisualProfile('colour-shift').fx.pigmentCount >= 20);
  assert.equal(getReactionVisualProfile('mixing-vortex').fx.bubbleRate, 0);
});
