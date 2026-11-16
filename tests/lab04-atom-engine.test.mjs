import test from 'node:test';
import assert from 'node:assert/strict';
import {NEUTRALIZATION_ATOMS,NEUTRALIZATION_BONDS,createNeutralizationInput,SILVER_CHLORIDE_ATOMS,SILVER_CHLORIDE_BONDS,AGCL_KSP_25C,createAtomEngineInput,calculateAgClPrecipitationQuotient} from '../src/lab04-atom-engine.mjs';

test('neutralization mechanism has stable unique atom identities and conserved elemental inventory',()=>{
 const input=createNeutralizationInput(),ids=input.atoms.map(atom=>atom.id);
 assert.equal(input.atoms.length,8);
 assert.equal(new Set(ids).size,8);
 const inventory=input.atoms.reduce((result,atom)=>{result[atom.element]=(result[atom.element]||0)+1;return result},{});
 assert.deepEqual(inventory,{O:2,H:4,Na:1,Cl:1});
});

test('hydronium and hydroxide map to two water molecules with spectator ions retained',()=>{
 assert.deepEqual(NEUTRALIZATION_ATOMS.slice(0,4).map(atom=>atom.element),['O','H','H','H']);
 assert.deepEqual(NEUTRALIZATION_ATOMS.slice(4,6).map(atom=>atom.element),['O','H']);
 assert.equal(NEUTRALIZATION_ATOMS[6].element,'Na');
 assert.equal(NEUTRALIZATION_ATOMS[7].element,'Cl');
 assert.equal(NEUTRALIZATION_BONDS.length,5);
 assert.deepEqual(NEUTRALIZATION_BONDS.filter(bond=>bond.start===1&&bond.end===0).map(bond=>[bond.a,bond.b]),[[0,3]]);
 assert.deepEqual(NEUTRALIZATION_BONDS.filter(bond=>bond.start===0&&bond.end===1).map(bond=>[bond.a,bond.b]),[[4,3]]);
});

test('all keyframe coordinates and bond-order transitions remain finite and in range',()=>{
 for(const atom of NEUTRALIZATION_ATOMS)for(const point of [atom.start,atom.transition,atom.end]){
  assert.equal(point.length,3);for(const value of point)assert.ok(Number.isFinite(value));
 }
 for(const bond of NEUTRALIZATION_BONDS){
  assert.ok(bond.a>=0&&bond.a<NEUTRALIZATION_ATOMS.length);
  assert.ok(bond.b>=0&&bond.b<NEUTRALIZATION_ATOMS.length);
  assert.ok(bond.a!==bond.b);
  for(const order of [bond.start,bond.transition,bond.end])assert.ok(order>=0&&order<=3);
 }
});

test('AgCl precipitation map conserves every atom and spectator ion charge',()=>{
 const ids=SILVER_CHLORIDE_ATOMS.map(atom=>atom.id);
 assert.equal(SILVER_CHLORIDE_ATOMS.length,28);
 assert.equal(new Set(ids).size,28);
 const inventory=SILVER_CHLORIDE_ATOMS.reduce((result,atom)=>{result[atom.element]=(result[atom.element]||0)+1;return result},{});
 assert.deepEqual(inventory,{Ag:4,Cl:4,N:4,O:12,Na:4});
 const charge=SILVER_CHLORIDE_ATOMS.reduce((total,atom)=>total+(atom.formalCharge||0)+(atom.ionCharge||0),0);
 assert.equal(charge,0);
 assert.equal(SILVER_CHLORIDE_BONDS.length,24);
 assert.equal(SILVER_CHLORIDE_BONDS.filter(bond=>bond.kind===0).length,12);
 assert.equal(SILVER_CHLORIDE_BONDS.filter(bond=>bond.kind===1).length,12);
 for(const bond of SILVER_CHLORIDE_BONDS){
  assert.ok(bond.a>=0&&bond.a<SILVER_CHLORIDE_ATOMS.length);
  assert.ok(bond.b>=0&&bond.b<SILVER_CHLORIDE_ATOMS.length);
  assert.notEqual(bond.a,bond.b);
  if(bond.kind===1){
   const pair=[SILVER_CHLORIDE_ATOMS[bond.a].element,SILVER_CHLORIDE_ATOMS[bond.b].element].sort();
   assert.deepEqual(pair,['Ag','Cl']);
  }else{
   const pair=[SILVER_CHLORIDE_ATOMS[bond.a].element,SILVER_CHLORIDE_ATOMS[bond.b].element].sort();
   assert.deepEqual(pair,['N','O']);
  }
 }
});

test('AgCl nucleus begins as a four-ion face and expands to twelve alternating ionic contacts',()=>{
 const seed=SILVER_CHLORIDE_BONDS.filter(bond=>bond.kind===1);
 assert.equal(seed.filter(bond=>bond.start===0&&bond.transition===1&&bond.end===1).length,4);
 assert.equal(seed.filter(bond=>bond.start===0&&bond.transition===0&&bond.end===1).length,8);
 assert.ok(SILVER_CHLORIDE_BONDS.filter(bond=>bond.role==='nitrate-resonance').every(bond=>
  bond.start===4/3&&bond.transition===4/3&&bond.end===4/3));
 const ids=new Set(SILVER_CHLORIDE_ATOMS.filter(atom=>atom.role==='spectator-nitrate'||atom.role==='spectator-cation').map(atom=>atom.id));
 assert.equal(ids.size,20);
 for(const atom of SILVER_CHLORIDE_ATOMS.filter(atom=>ids.has(atom.id))){
  assert.deepEqual(atom.start,atom.transition);
  assert.deepEqual(atom.start,atom.end);
 }
});

test('AgCl precipitation is gated by the ion product compared with Ksp at 25 degrees C',()=>{
 const saturated=calculateAgClPrecipitationQuotient({
  silverNitrateMoles:1e-5,sodiumChlorideMoles:1e-5,volumeMl:100
 });
 assert.equal(AGCL_KSP_25C,1.6e-10);
 assert.equal(saturated.silverConcentration,1e-4);
 assert.equal(saturated.chlorideConcentration,1e-4);
 assert.equal(saturated.quotient,1e-8);
 assert.equal(saturated.supersaturated,true);
 const below=calculateAgClPrecipitationQuotient({
  silverNitrateMoles:5e-7,sodiumChlorideMoles:5e-7,volumeMl:100
 });
 assert.ok(below.quotient<AGCL_KSP_25C);
 assert.equal(below.supersaturated,false);
 assert.equal(calculateAgClPrecipitationQuotient({
  silverNitrateMoles:-1,sodiumChlorideMoles:1e-5,volumeMl:100
 }),null);
 assert.equal(calculateAgClPrecipitationQuotient({
  silverNitrateMoles:1e-5,sodiumChlorideMoles:1e-5,volumeMl:0
 }),null);
});

test('generic atom engine input holds Ag and Cl ions apart when the solution is not supersaturated',()=>{
 const active=createAtomEngineInput('silver-chloride-precipitation',{precipitationAllowed:true});
 const inactive=createAtomEngineInput('silver-chloride-precipitation',{precipitationAllowed:false});
 const activeContacts=active.bonds.filter(bond=>bond.kind===1);
 const inactiveContacts=inactive.bonds.filter(bond=>bond.kind===1);
 assert.equal(active.atoms.length,28);
 assert.equal(active.bonds.length,24);
 assert.equal(activeContacts.filter(bond=>bond.end===1).length,12);
 assert.ok(inactiveContacts.every(bond=>bond.start===0&&bond.transition===0&&bond.end===0));
 for(let index=0;index<inactive.atoms.length;index++){
  assert.deepEqual(inactive.atoms[index].start,inactive.atoms[index].transition);
  assert.deepEqual(inactive.atoms[index].start,inactive.atoms[index].end);
 }
});
