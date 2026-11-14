export const STATION_INTERACTION_DISTANCE = 7.5;
export const LAB_STATION_COUNT = 6;
export const REACTION_STATION_NUMBER = 6;

export function isInteractionKey(code, key) {
  return code === 'KeyE' || String(key ?? '').toLowerCase() === 'e';
}

export function resolveStationInteraction(stationNumber, distance) {
  if (!Number.isInteger(stationNumber) || stationNumber < 1 ||
      stationNumber > LAB_STATION_COUNT ||
      !Number.isFinite(distance) || distance < 0 ||
      distance > STATION_INTERACTION_DISTANCE) {
    return null;
  }

  return stationNumber === REACTION_STATION_NUMBER ? 'open-reaction-001' : 'inspect-station';
}
