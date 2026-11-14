import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATION_INTERACTION_DISTANCE,
  resolveStationInteraction
} from '../src/station-interaction.mjs';

test('station 01 opens REACTION 001 only inside interaction range', () => {
  assert.equal(resolveStationInteraction(1, 0), 'open-reaction-001');
  assert.equal(resolveStationInteraction(1, 3.2), 'open-reaction-001');
  assert.equal(resolveStationInteraction(1, STATION_INTERACTION_DISTANCE), 'open-reaction-001');
  assert.equal(resolveStationInteraction(1, STATION_INTERACTION_DISTANCE + 0.01), null);
});

test('other stations keep their existing inspection action', () => {
  for (let station = 2; station <= 6; station += 1) {
    assert.equal(resolveStationInteraction(station, 2), 'inspect-station');
  }
});

test('invalid station targets and invalid distances are rejected', () => {
  assert.equal(resolveStationInteraction(0, 2), null);
  assert.equal(resolveStationInteraction(7, 2), null);
  assert.equal(resolveStationInteraction(1, -1), null);
  assert.equal(resolveStationInteraction(1, Number.NaN), null);
  assert.equal(resolveStationInteraction(1, Infinity), null);
  assert.equal(resolveStationInteraction(1.5, 2), null);
});
