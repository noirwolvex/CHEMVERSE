import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATION_INTERACTION_DISTANCE,
  REACTION_STATION_NUMBER,
  isInteractionKey,
  resolveStationInteraction
} from '../src/station-interaction.mjs';

test('station 06 opens REACTION 001 only inside interaction range', () => {
  assert.equal(REACTION_STATION_NUMBER, 6);
  assert.equal(resolveStationInteraction(6, 0), 'open-reaction-001');
  assert.equal(resolveStationInteraction(6, 3.2), 'open-reaction-001');
  assert.equal(resolveStationInteraction(6, STATION_INTERACTION_DISTANCE), 'open-reaction-001');
  assert.equal(resolveStationInteraction(6, STATION_INTERACTION_DISTANCE + 0.01), null);
});

test('stations 01–05 keep their existing inspection action', () => {
  for (let station = 1; station <= 5; station += 1) {
    assert.equal(resolveStationInteraction(station, 2), 'inspect-station');
  }
});

test('the E interaction uses the physical key code on non-English keyboard layouts', () => {
  assert.equal(isInteractionKey('KeyE', 'ث'), true);
  assert.equal(isInteractionKey('KeyE', 'e'), true);
  assert.equal(isInteractionKey('KeyF', 'e'), true);
  assert.equal(isInteractionKey('KeyF', 'ف'), false);
});

test('invalid station targets and invalid distances are rejected', () => {
  assert.equal(resolveStationInteraction(0, 2), null);
  assert.equal(resolveStationInteraction(7, 2), null);
  assert.equal(resolveStationInteraction(1, -1), null);
  assert.equal(resolveStationInteraction(1, Number.NaN), null);
  assert.equal(resolveStationInteraction(1, Infinity), null);
  assert.equal(resolveStationInteraction(1.5, 2), null);
});
