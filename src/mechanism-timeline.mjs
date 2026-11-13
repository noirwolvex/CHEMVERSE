export const MECHANISM_CHECKPOINTS = Object.freeze([0, 0.5, 1]);

function clampProgress(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function getAdjacentMechanismCheckpoint(progress, direction) {
  const current = clampProgress(progress);
  const epsilon = 1e-9;

  if (direction === 1) {
    return MECHANISM_CHECKPOINTS.find((checkpoint) => checkpoint > current + epsilon) ?? 1;
  }
  if (direction === -1) {
    for (let index = MECHANISM_CHECKPOINTS.length - 1; index >= 0; index -= 1) {
      const checkpoint = MECHANISM_CHECKPOINTS[index];
      if (checkpoint < current - epsilon) return checkpoint;
    }
    return 0;
  }
  return current;
}
