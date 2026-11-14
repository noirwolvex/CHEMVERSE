export const MAX_MIXED_REAGENTS = 2;

export const REAGENTS = Object.freeze([
  Object.freeze({ id: 'vinegar', name: 'Diluted vinegar', formula: 'CH₃COOH (aq)', shortName: 'Vinegar', category: 'acid', color: '#ddc878' }),
  Object.freeze({ id: 'bicarbonate', name: 'Sodium bicarbonate', formula: 'NaHCO₃ (aq)', shortName: 'Bicarbonate', category: 'base', color: '#69b4db' }),
  Object.freeze({ id: 'citric-acid', name: 'Citric acid solution', formula: 'C₆H₈O₇ (aq)', shortName: 'Citric acid', category: 'acid', color: '#dd8eaa' }),
  Object.freeze({ id: 'indicator', name: 'Red-cabbage indicator', formula: 'Anthocyanins (aq)', shortName: 'Indicator', category: 'indicator', color: '#987dc8' }),
  Object.freeze({ id: 'salt', name: 'Salt solution', formula: 'NaCl (aq)', shortName: 'Saltwater', category: 'neutral', color: '#b8d9df' }),
  Object.freeze({ id: 'sugar', name: 'Sugar solution', formula: 'C₁₂H₂₂O₁₁ (aq)', shortName: 'Sugar', category: 'neutral', color: '#82d6b6' }),
  Object.freeze({ id: 'carbonate', name: 'Sodium carbonate solution', formula: 'Na₂CO₃ (aq)', shortName: 'Carbonate', category: 'base', color: '#9acb85' }),
  Object.freeze({ id: 'calcium', name: 'Calcium chloride solution', formula: 'CaCl₂ (aq)', shortName: 'Calcium chloride', category: 'salt', color: '#c6d5e4' })
]);

const reagentIds = new Set(REAGENTS.map((reagent) => reagent.id));
const commonLimit = 'The model is qualitative: it does not measure bottle volumes, concentrations, temperature, gas volume, exact pH, or product yield. The balanced equation represents the idealised reaction, not a measured result for this run.';

const outcomes = Object.freeze({
  vinegarFizz: Object.freeze({
    key: 'vinegar-bicarbonate', title: 'Carbon dioxide is released',
    phenomenon: 'ACID–BICARBONATE REACTION',
    description: 'Acetic acid reacts with bicarbonate and releases carbon dioxide gas. Rising bubbles and contained foam illustrate gas formation.',
    explanation: 'Acid supplies H⁺ ions. They react with hydrogen carbonate ions to form carbonic acid, which decomposes into water and carbon dioxide.',
    observation: 'Look for streams of bubbles and a short-lived foam cap. The gas represented is CO₂.',
    equation: 'CH₃COOH + NaHCO₃ → CH₃COONa + H₂O + CO₂↑',
    effect: 'foam-burst', color: '#8bdacb', visualLabel: 'CO₂ / FIZZ', modelLimit: commonLimit
  }),
  citricFizz: Object.freeze({
    key: 'citric-bicarbonate', title: 'Carbon dioxide is released',
    phenomenon: 'ACID–BICARBONATE REACTION',
    description: 'Citric acid reacts with bicarbonate to form sodium citrate, water and carbon dioxide.',
    explanation: 'Citric acid can donate three protons. In the fully neutralised equation, three hydrogen carbonate ions produce three CO₂ molecules and three water molecules.',
    observation: 'Watch the bubbles rise and foam briefly collect near the top. The equation is written for complete neutralisation.',
    equation: 'C₆H₈O₇ + 3 NaHCO₃ → Na₃C₆H₅O₇ + 3 H₂O + 3 CO₂↑',
    effect: 'foam-burst', color: '#a8e6cb', visualLabel: 'CO₂ / FIZZ', modelLimit: commonLimit
  }),
  vinegarCarbonateFizz: Object.freeze({
    key: 'vinegar-carbonate', title: 'A carbonate–acid reaction releases CO₂',
    phenomenon: 'ACID–CARBONATE REACTION',
    description: 'Acetic acid reacts with carbonate ions. Carbon dioxide escapes while sodium acetate remains dissolved.',
    explanation: 'The acid protonates carbonate ions. Further proton transfer forms carbonic acid, which decomposes into water and CO₂.',
    observation: 'A sustained stream of gas bubbles forms. Foam height is only a visual effect, not a real measurement.',
    equation: 'Na₂CO₃ + 2 CH₃COOH → 2 CH₃COONa + H₂O + CO₂↑',
    effect: 'foam-burst', color: '#a6dfc3', visualLabel: 'CO₂ / CARBONATE', modelLimit: commonLimit
  }),
  citricCarbonateFizz: Object.freeze({
    key: 'citric-carbonate', title: 'Citric acid releases carbon dioxide',
    phenomenon: 'ACID–CARBONATE REACTION',
    description: 'Citric acid neutralises carbonate, forming sodium citrate, water and carbon dioxide.',
    explanation: 'Two citric-acid molecules can provide six acidic protons. Three carbonate ions accept them, producing three CO₂ and three water molecules.',
    observation: 'Look for bubbling and a brief foam layer. The equation is written for complete neutralisation.',
    equation: '3 Na₂CO₃ + 2 C₆H₈O₇ → 2 Na₃C₆H₅O₇ + 3 H₂O + 3 CO₂↑',
    effect: 'foam-burst', color: '#a6dfc3', visualLabel: 'CO₂ / CARBONATE', modelLimit: commonLimit
  }),
  calciumCarbonate: Object.freeze({
    key: 'calcium-carbonate-precipitate', title: 'A white solid precipitate forms',
    phenomenon: 'PRECIPITATION REACTION',
    description: 'Calcium ions and carbonate ions combine to form solid calcium carbonate, which is only slightly soluble in water.',
    explanation: 'The dissolved salts separate into ions. Ca²⁺ and CO₃²⁻ form CaCO₃(s); sodium and chloride ions remain dissolved as spectator ions.',
    observation: 'The clear liquid turns cloudy as tiny white particles form and settle toward the bottom.',
    equation: 'CaCl₂ + Na₂CO₃ → CaCO₃↓ + 2 NaCl',
    netIonicEquation: 'Ca²⁺ + CO₃²⁻ → CaCO₃(s)↓',
    effect: 'precipitate', color: '#e0e8df', visualLabel: 'CaCO₃ / WHITE PRECIPITATE', modelLimit: commonLimit
  }),
  acidIndicator: Object.freeze({
    key: 'acid-indicator', title: 'The indicator turns pink',
    phenomenon: 'ACIDIC INDICATOR RESPONSE',
    description: 'Red-cabbage anthocyanins shift toward pink or red in an acidic solution.',
    explanation: 'Anthocyanin pigments change structure and light absorption as the solution becomes acidic. The visible colour therefore depends on pH.',
    observation: 'The purple indicator shifts toward pink. The exact shade depends on indicator preparation and pH.',
    equation: 'Anthocyanin colour ⇄ pH-dependent forms',
    effect: 'colour-shift', color: '#e77caa', visualLabel: 'PINK / ACIDIC', modelLimit: commonLimit
  }),
  baseIndicator: Object.freeze({
    key: 'base-indicator', title: 'The indicator turns blue-green',
    phenomenon: 'ALKALINE INDICATOR RESPONSE',
    description: 'The indicator shifts toward blue or green in a mildly alkaline bicarbonate solution.',
    explanation: 'A basic solution changes the protonation state of anthocyanin pigments, changing which wavelengths are absorbed.',
    observation: 'The purple indicator shifts toward blue-green. This is a qualitative colour cue, not a pH measurement.',
    equation: 'Anthocyanin colour ⇄ pH-dependent forms',
    effect: 'colour-shift', color: '#65cbb5', visualLabel: 'BLUE-GREEN / BASIC', modelLimit: commonLimit
  }),
  carbonateIndicator: Object.freeze({
    key: 'carbonate-indicator', title: 'The indicator shifts green',
    phenomenon: 'ALKALINE INDICATOR RESPONSE',
    description: 'Sodium carbonate makes the model solution more alkaline, shifting red-cabbage indicator toward greenish tones.',
    explanation: 'Carbonate ions react with water to produce some hydroxide ions. The higher pH changes the structure and colour of anthocyanin pigments.',
    observation: 'Look for a purple-to-green colour shift. The simulator does not assign a numeric pH.',
    equation: 'CO₃²⁻ + H₂O ⇌ HCO₃⁻ + OH⁻',
    effect: 'colour-shift', color: '#8dc66d', visualLabel: 'GREEN / ALKALINE', modelLimit: commonLimit
  }),
  neutralIndicator: Object.freeze({
    key: 'neutral-indicator', title: 'No strong colour shift',
    phenomenon: 'NEAR-NEUTRAL INDICATOR',
    description: 'Salt or sugar solution does not make this indicator strongly acidic or alkaline in the simplified model.',
    explanation: 'Sodium chloride is a salt of a strong acid and a strong base, while sucrose does not appreciably ionise in water. Neither is represented as strongly changing indicator pH here.',
    observation: 'The purple shade remains mostly unchanged.',
    equation: 'No net chemical reaction represented',
    effect: 'quiet', color: '#927cc7', visualLabel: 'PURPLE / NEAR NEUTRAL', modelLimit: commonLimit
  }),
  noVisibleReaction: Object.freeze({
    key: 'no-visible-reaction', title: 'No visible chemical reaction',
    phenomenon: 'MIXTURE / NO VISIBLE CHANGE',
    description: 'These solutions mix without a visible gas, precipitate or indicator response in this teaching model.',
    explanation: 'The selected pair has no represented driving process such as gas formation, an insoluble product, or an indicator colour response under these simplified assumptions.',
    observation: 'The liquid remains clear; no gas or solid is shown. No visible change does not prove that no particles interact.',
    equation: 'No net ionic reaction represented',
    effect: 'quiet', color: '#9bb8c1', visualLabel: 'NO VISIBLE CHANGE', modelLimit: commonLimit
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

  if (has('calcium') && has('carbonate')) return outcomes.calciumCarbonate;
  if (acidId && has('carbonate')) {
    return acidId === 'vinegar' ? outcomes.vinegarCarbonateFizz : outcomes.citricCarbonateFizz;
  }
  if (acidId && has('bicarbonate')) {
    return acidId === 'vinegar' ? outcomes.vinegarFizz : outcomes.citricFizz;
  }
  if (has('indicator') && acidId) return outcomes.acidIndicator;
  if (has('indicator') && has('carbonate')) return outcomes.carbonateIndicator;
  if (has('indicator') && has('bicarbonate')) return outcomes.baseIndicator;
  if (has('indicator')) return outcomes.neutralIndicator;

  return outcomes.noVisibleReaction;
}
