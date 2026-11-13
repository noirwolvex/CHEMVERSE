export function clampProgress(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function getDisplayProgress(elapsedSeconds, durationSeconds, kineticProgress, kineticsConfigured) {
  if (kineticsConfigured) return clampProgress(kineticProgress);
  if (!Number.isFinite(elapsedSeconds) || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  return clampProgress(elapsedSeconds / durationSeconds);
}

export function getReactionStage(progress, visualDemo = false) {
  const value = clampProgress(progress);
  const intermediateStart = visualDemo ? (1 / 3) : 0.34;
  const productsStart = visualDemo ? (2 / 3) : 0.82;
  if (value < intermediateStart) return 'reactants';
  if (value < productsStart) return 'intermediate';
  return 'products';
}

function smoothStep(edge0, edge1, value) {
  const t = clampProgress((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function getStageVisuals(progress, visualDemo = false) {
  const value = clampProgress(progress);
  if (visualDemo) {
    return {
      approach: smoothStep(0, 0.42, value),
      reactants: 1 - smoothStep(0.27, 0.39, value),
      intermediate: smoothStep(0.30, 0.40, value) * (1 - smoothStep(0.61, 0.72, value)),
      products: smoothStep(0.63, 0.78, value)
    };
  }

  return {
    approach: smoothStep(0, 0.45, value),
    reactants: null,
    intermediate: smoothStep(0.34, 0.48, value) * (1 - smoothStep(0.68, 0.82, value)),
    products: smoothStep(0.68, 0.88, value)
  };
}
