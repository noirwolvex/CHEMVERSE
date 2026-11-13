export function clampProgress(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

// Stage choreography follows presentation time, independently from kinetic conversion.
export function getDisplayProgress(elapsedSeconds, durationSeconds) {
  if (!Number.isFinite(elapsedSeconds) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  return clampProgress(elapsedSeconds / durationSeconds);
}

export function getReactionStage(progress) {
  const value = clampProgress(progress);
  if (value < 1 / 3) return 'reactants';
  if (value < 2 / 3) return 'intermediate';
  return 'products';
}

function smoothStep(edge0, edge1, value) {
  const t = clampProgress((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function getStageVisuals(progress) {
  const value = clampProgress(progress);
  return {
    approach: smoothStep(0, 0.42, value),
    reactants: 1 - smoothStep(0.27, 0.39, value),
    intermediate: smoothStep(0.30, 0.40, value) * (1 - smoothStep(0.61, 0.72, value)),
    products: smoothStep(0.63, 0.78, value)
  };
}
