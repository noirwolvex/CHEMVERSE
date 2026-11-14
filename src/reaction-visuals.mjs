const profiles = Object.freeze({
  'foam-burst': Object.freeze({
    phaseDurationMs: 3000, bubbleCount: 72, splashCount: 46, precipitateCount: 0,
    currentCount: 28, liquidHeight: '58%', colourSwirl: false, fluidVortex: true, visibleMotion: true
  }),
  precipitate: Object.freeze({
    phaseDurationMs: 2900, bubbleCount: 0, splashCount: 0, precipitateCount: 104,
    currentCount: 42, liquidHeight: '50%', colourSwirl: false, fluidVortex: true, visibleMotion: true
  }),
  'colour-shift': Object.freeze({
    phaseDurationMs: 2700, bubbleCount: 0, splashCount: 32, precipitateCount: 0,
    currentCount: 44, liquidHeight: '42%', colourSwirl: true, fluidVortex: true, visibleMotion: true
  }),
  'mixing-vortex': Object.freeze({
    phaseDurationMs: 2700, bubbleCount: 0, splashCount: 20, precipitateCount: 0,
    currentCount: 50, liquidHeight: '44%', colourSwirl: true, fluidVortex: true, visibleMotion: true
  })
});

export function getReactionVisualProfile(effect) {
  return profiles[effect] || null;
}
