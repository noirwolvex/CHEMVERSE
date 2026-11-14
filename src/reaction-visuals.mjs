const profiles = Object.freeze({
  'foam-burst': Object.freeze({
    phaseDurationMs: 3800, bubbleCount: 34, splashCount: 28, precipitateCount: 0,
    currentCount: 48, liquidHeight: '58%', colourSwirl: false, fluidVortex: true, visibleMotion: true,
    fx: Object.freeze({ bubbleRate: 34, maxBubbles: 76, foamRate: 23, maxFoam: 68, sprayCount: 42, sedimentCount: 0, currentCount: 58, pigmentCount: 0, turbulence: 1.75, vortexSpeed: 2.5 })
  }),
  precipitate: Object.freeze({
    phaseDurationMs: 3600, bubbleCount: 0, splashCount: 10, precipitateCount: 88,
    currentCount: 38, liquidHeight: '50%', colourSwirl: false, fluidVortex: true, visibleMotion: true,
    fx: Object.freeze({ bubbleRate: 0, maxBubbles: 0, foamRate: 0, maxFoam: 0, sprayCount: 10, sedimentCount: 74, currentCount: 52, pigmentCount: 0, turbulence: 1.2, vortexSpeed: 1.7 })
  }),
  'colour-shift': Object.freeze({
    phaseDurationMs: 3500, bubbleCount: 0, splashCount: 22, precipitateCount: 0,
    currentCount: 44, liquidHeight: '42%', colourSwirl: true, fluidVortex: true, visibleMotion: true,
    fx: Object.freeze({ bubbleRate: 0, maxBubbles: 0, foamRate: 0, maxFoam: 0, sprayCount: 22, sedimentCount: 0, currentCount: 70, pigmentCount: 25, turbulence: 1.55, vortexSpeed: 2.2 })
  }),
  'mixing-vortex': Object.freeze({
    phaseDurationMs: 3500, bubbleCount: 0, splashCount: 18, precipitateCount: 0,
    currentCount: 50, liquidHeight: '44%', colourSwirl: true, fluidVortex: true, visibleMotion: true,
    fx: Object.freeze({ bubbleRate: 0, maxBubbles: 0, foamRate: 0, maxFoam: 0, sprayCount: 28, sedimentCount: 0, currentCount: 86, pigmentCount: 0, turbulence: 1.85, vortexSpeed: 2.65 })
  })
});

export function getReactionVisualProfile(effect) {
  return profiles[effect] || null;
}
