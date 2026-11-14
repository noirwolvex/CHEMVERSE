const profiles = Object.freeze({
  'foam-burst': Object.freeze({ phaseDurationMs: 2700, bubbleCount: 46, splashCount: 36, precipitateCount: 0, liquidHeight: '58%', colourSwirl: false }),
  precipitate: Object.freeze({ phaseDurationMs: 2300, bubbleCount: 0, splashCount: 0, precipitateCount: 72, liquidHeight: '48%', colourSwirl: false }),
  'colour-shift': Object.freeze({ phaseDurationMs: 1900, bubbleCount: 0, splashCount: 0, precipitateCount: 0, liquidHeight: '36%', colourSwirl: true }),
  quiet: Object.freeze({ phaseDurationMs: 1000, bubbleCount: 0, splashCount: 0, precipitateCount: 0, liquidHeight: '28%', colourSwirl: false })
});

export function getReactionVisualProfile(effect) {
  return profiles[effect] || null;
}
