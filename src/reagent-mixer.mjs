export const MAX_MIXED_REAGENTS = 2;

export const REAGENTS = Object.freeze([
  Object.freeze({ id: 'vinegar', name: 'Diluted vinegar', formula: 'CH₃COOH (aq)', shortName: 'Vinegar', category: 'acid' }),
  Object.freeze({ id: 'bicarbonate', name: 'Sodium bicarbonate', formula: 'NaHCO₃ (aq)', shortName: 'Bicarbonate', category: 'base' }),
  Object.freeze({ id: 'citric-acid', name: 'Citric acid solution', formula: 'C₆H₈O₇ (aq)', shortName: 'Citric acid', category: 'acid' }),
  Object.freeze({ id: 'indicator', name: 'Red-cabbage indicator', formula: 'Anthocyanins (aq)', shortName: 'Indicator', category: 'indicator' }),
  Object.freeze({ id: 'salt', name: 'Salt solution', formula: 'NaCl (aq)', shortName: 'Saltwater', category: 'neutral' }),
  Object.freeze({ id: 'sugar', name: 'Sugar solution', formula: 'C₁₂H₂₂O₁₁ (aq)', shortName: 'Sugar', category: 'neutral' })
]);

const reagentIds = new Set(REAGENTS.map((reagent) => reagent.id));

const outcomes = Object.freeze({
  vinegarFizz: Object.freeze({
    key: 'vinegar-bicarbonate',
    title: 'Carbon dioxide is released',
    phenomenon: 'ACID–CARBONATE FIZZ',
    description: 'The acid reacts with bicarbonate, producing dissolved sodium acetate, water and carbon dioxide gas. The bubbles shown in the vessel represent the released CO₂.',
    equation: 'CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂↑',
    effect: 'foam-burst',
    color: '#8bdacb',
    visualLabel: 'CO₂ / FIZZ'
  }),
  citricFizz: Object.freeze({
    key: 'citric-bicarbonate',
    title: 'Carbon dioxide is released',
    phenomenon: 'ACID–CARBONATE FIZZ',
    description: 'Citric acid reacts with sodium bicarbonate to form sodium citrate, water and carbon dioxide. The energetic-looking foam is only a contained visualisation of gas bubbles.',
    equation: 'C₆H₈O₇ + 3 NaHCO₃ → Na₃C₆H₅O₇ + 3 H₂O + 3 CO₂↑',
    effect: 'foam-burst',
    color: '#a8e6cb',
    visualLabel: 'CO₂ / FIZZ'
  }),
  acidIndicator: Object.freeze({
    key: 'acid-indicator',
    title: 'The indicator turns pink',
    phenomenon: 'ACIDIC COLOUR CHANGE',
    description: 'Red-cabbage anthocyanins shift toward pink or red in an acidic solution. This is a colour-indicator response, not a gas-producing reaction.',
    equation: 'Indicator colour ⇄ pH-dependent form',
    effect: 'colour-shift',
    color: '#e77caa',
    visualLabel: 'PINK / ACIDIC'
  }),
  baseIndicator: Object.freeze({
    key: 'base-indicator',
    title: 'The indicator turns blue-green',
    phenomenon: 'ALKALINE COLOUR CHANGE',
    description: 'The indicator changes toward blue or green in a mildly alkaline bicarbonate solution. The displayed shade is illustrative rather than a measured pH value.',
    equation: 'Indicator colour ⇄ pH-dependent form',
    effect: 'colour-shift',
    color: '#65cbb5',
    visualLabel: 'BLUE-GREEN / BASIC'
  }),
  neutralIndicator: Object.freeze({
    key: 'neutral-indicator',
    title: 'No strong colour shift',
    phenomenon: 'NEAR-NEUTRAL INDICATOR',
    description: 'Salt or sugar solution does not make this indicator strongly acidic or alkaline in the simplified model, so the purple colour is mostly retained.',
    equation: 'No net chemical reaction represented',
    effect: 'quiet',
    color: '#927cc7',
    visualLabel: 'PURPLE / NEAR NEUTRAL'
  }),
  noVisibleReaction: Object.freeze({
    key: 'no-visible-reaction',
    title: 'No visible chemical reaction',
    phenomenon: 'MIXTURE / NO VISIBLE CHANGE',
    description: 'These two solutions can mix without producing a visible gas, precipitate or indicator response in this teaching model. A lack of visible change does not mean that no particles are interacting.',
    equation: 'No net ionic reaction represented',
    effect: 'quiet',
    color: '#9bb8c1',
    visualLabel: 'NO VISIBLE CHANGE'
  })
});

export function evaluateMixture(selectedIds) {
  if (!Array.isArray(selectedIds) ||
      selectedIds.length !== MAX_MIXED_REAGENTS ||
      new Set(selectedIds).size !== selectedIds.length ||
      selectedIds.some((id) => !reagentIds.has(id))) {
    return null;
  }

  const selected = new Set(selectedIds);
  const has = (id) => selected.has(id);
  const acidId = has('vinegar') ? 'vinegar' : has('citric-acid') ? 'citric-acid' : null;

  if (acidId && has('bicarbonate')) {
    return acidId === 'vinegar' ? outcomes.vinegarFizz : outcomes.citricFizz;
  }

  if (has('indicator') && acidId) return outcomes.acidIndicator;
  if (has('indicator') && has('bicarbonate')) return outcomes.baseIndicator;
  if (has('indicator')) return outcomes.neutralIndicator;

  return outcomes.noVisibleReaction;
}
