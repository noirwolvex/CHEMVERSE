import test from 'node:test';
import assert from 'node:assert/strict';
import {NEUTRALIZATION_ATOMS,NEUTRALIZATION_BONDS,createNeutralizationInput} from '../src/lab04-atom-engine.mjs';

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
