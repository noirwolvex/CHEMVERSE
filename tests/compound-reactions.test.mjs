import test from 'node:test';
import assert from 'node:assert/strict';
import {ELEMENTS,MATERIALS,REACTIONS,calculateStoichiometry,findReactionsForSpecies,getMaterialById,getReactionAtomBalance,getReactionById,parseChemicalFormula,validateReactionBalance} from '../src/compound-reactions.mjs';
test('the reaction explorer has nineteen unique examples across six reaction classes',()=>{assert.equal(REACTIONS.length,19);assert.equal(new Set(REACTIONS.map(r=>r.id)).size,12);assert.deepEqual(new Set(REACTIONS.map(r=>r.category)),new Set(['synthesis','combustion','decomposition','displacement','precipitation','neutralization']))});
test('every stored equation is atom-balanced and every referenced species exists',()=>{for(const r of REACTIONS){assert.equal(validateReactionBalance(r),true,r.id);for(const entry of [...r.reactants,...r.products]){assert.ok(getMaterialById(entry.species),r.id+': '+entry.species);assert.ok(Number.isSafeInteger(entry.coefficient)&&entry.coefficient>0,r.id)}}});
test('formula parser handles multi-letter symbols and subscripts expressed as digits',()=>{assert.deepEqual(parseChemicalFormula('CuSO4'),{Cu:1,S:1,O:4});assert.deepEqual(parseChemicalFormula('BaCl2'),{Ba:1,Cl:2});assert.deepEqual(parseChemicalFormula('Na2SO4'),{Na:2,S:1,O:4});assert.equal(parseChemicalFormula('2H2O'),null);assert.equal(parseChemicalFormula(''),null)});
test('atom balance report shows conservation for methane combustion',()=>{const r=getReactionAtomBalance(getReactionById('methane-combustion'));assert.equal(r.balanced,true);assert.deepEqual(r.left,{C:1,H:4,O:4});assert.deepEqual(r.right,{C:1,H:4,O:4})});
test('stoichiometry reports limiting reactant and theoretical products',()=>{const r=calculateStoichiometry(getReactionById('water-synthesis'),{h2:.5,o2:.4});assert.ok(Math.abs(r.extent-.25)<1e-12);assert.deepEqual(r.limiting,['h2']);assert.ok(Math.abs(r.produced.h2o-.5)<1e-12);assert.ok(Math.abs(r.remaining.o2-.15)<1e-12)});
test('precipitation calculation preserves molar coefficients',()=>{const r=calculateStoichiometry(getReactionById('silver-chloride-precipitation'),{agno3:.08,nacl:.03});assert.deepEqual(r.limiting,['nacl']);assert.ok(Math.abs(r.produced.agcl-.03)<1e-12);assert.ok(Math.abs(r.remaining.agno3-.05)<1e-12)});
test('invalid inputs and unknown species do not create apparent valid reactions',()=>{assert.equal(calculateStoichiometry(getReactionById('water-synthesis'),{h2:-1,o2:.2}),null);assert.equal(calculateStoichiometry(getReactionById('water-synthesis'),{h2:.1}),null);assert.equal(validateReactionBalance({reactants:[],products:[]}),false);assert.equal(validateReactionBalance({reactants:[{species:'unknown',coefficient:1}],products:[]}),false);assert.equal(getReactionById('missing'),null)});
test('model atom counts match formulas and all bond indexes are valid',()=>{for(const item of MATERIALS){const expected=parseChemicalFormula(item.formula),actual={};for(const a of item.atoms)actual[a.element]=(actual[a.element]||0)+1;assert.deepEqual(actual,expected,item.id);for(const [a,b] of item.bonds)assert.ok(a>=0&&b>=0&&a<item.atoms.length&&b<item.atoms.length&&a!==b,item.id)}});
test('element reference covers all elements used by the models',()=>{const symbols=new Set(ELEMENTS.map(e=>e.symbol));for(const item of MATERIALS)for(const a of item.atoms)assert.ok(symbols.has(a.element),item.id+': '+a.element);assert.equal(new Set(ELEMENTS.map(e=>e.symbol)).size,ELEMENTS.length)});
test('element and compound selections lead to related reactions',()=>{assert.ok(findReactionsForSpecies('fe').some(r=>r.id==='iron-copper-displacement'));assert.ok(findReactionsForSpecies('baso4').some(r=>r.id==='barium-sulfate-precipitation'));assert.deepEqual(findReactionsForSpecies('not-a-material'),[])});

test('every reaction declares physical states and a scientifically qualified mechanism note',()=>{
 for(const reaction of REACTIONS){
  for(const entry of [...reaction.reactants,...reaction.products])assert.match(reaction.phases?.[entry.species]||'',/^(s|l|g|aq)$/ ,reaction.id+': missing phase for '+entry.species);
  assert.ok(typeof reaction.mechanism==='string'&&reaction.mechanism.length>20,reaction.id);
  assert.ok(typeof reaction.ionicNote==='string'&&reaction.ionicNote.length>10,reaction.id);
 }
});
test('net ionic equations are present for displacement, acid-base and precipitation examples',()=>{
 for(const id of ['iron-copper-displacement','silver-chloride-precipitation','acid-base-neutralization','zinc-acid-displacement','barium-sulfate-precipitation','sodium-bicarbonate-acid','copper-hydroxide-precipitation','calcium-sulfate-precipitation']){
  assert.ok(getReactionById(id)?.ionicEquation,id);
 }
});
test('molecular topology distinguishes multiple bonds and ionic associations',()=>{
 assert.equal(getMaterialById('o2').bonds[0][2],2);
 assert.equal(getMaterialById('co2').bonds.every(b=>b[2]===2),true);
 assert.equal(getMaterialById('n2').bonds[0][2],3);
 assert.equal(getMaterialById('co').bonds[0][2],3);
 assert.equal(getMaterialById('nacl').bonds[0][3],'ionic');
 assert.equal(getMaterialById('mgo').bonds[0][3],'ionic');
});
test('new station 04 catalogue examples are atom balanced and their formula models match atom inventories',()=>{
 for(const id of ['water-electrolysis','bicarbonate-thermal-decomposition','sodium-bicarbonate-acid','copper-hydroxide-precipitation','calcium-sulfate-precipitation','calcium-oxide-hydration','copper-oxidation']){
  const reaction=getReactionById(id);assert.ok(reaction,id);assert.equal(validateReactionBalance(reaction),true,id);
 }
 for(const id of ['nahco3','na2co3','cuo','cuoh2','cacl2','caso4','caoh2']){
  const item=getMaterialById(id);assert.ok(item,id);const expected=parseChemicalFormula(item.formula),actual={};
  for(const atom of item.atoms)actual[atom.element]=(actual[atom.element]||0)+1;
  assert.deepEqual(actual,expected,id);
 }
});
