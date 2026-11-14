export const STATION_INTERACTION_DISTANCE = 5.5;
export const LAB_STATION_COUNT = 6;

export function resolveStationInteraction(stationNumber, distance) {
  if (!Number.isInteger(stationNumber) || stationNumber < 1 ||
      stationNumber > LAB_STATION_COUNT ||
      !Number.isFinite(distance) || distance < 0 ||
      distance > STATION_INTERACTION_DISTANCE) {
    return null;
  }

  return stationNumber === 1 ? 'open-reaction-001' : 'inspect-station';
}
