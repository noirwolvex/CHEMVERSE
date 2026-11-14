export const STATION_INTERACTION_DISTANCE = 5.5;

export function resolveStationInteraction(stationNumber, distance) {
  if (!Number.isInteger(stationNumber) || stationNumber < 1 ||
      !Number.isFinite(distance) || distance < 0 ||
      distance > STATION_INTERACTION_DISTANCE) {
    return null;
  }

  return stationNumber === 1 ? 'open-reaction-001' : 'inspect-station';
}
