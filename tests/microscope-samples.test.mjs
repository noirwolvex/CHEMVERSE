import test from 'node:test';
import assert from 'node:assert/strict';
import {MICROSCOPE_MODES,MICROSCOPE_SAMPLES,MICROSCOPE_ZOOM_PRESETS,getMicroscopeMode,getMicroscopeSample,getMicroscopeSamples,getMicroscopeZoomPreset} from '../src/microscope-samples.mjs';
test('five distinct imaging techniques are available',()=>{assert.deepEqual(MICROSCOPE_MODES.map(m=>m.id),['light','sem','tem','afm','stm']);assert.equal(new Set(MICROSCOPE_MODES.map(m=>m.id)).size,5)});
test('all specimens include scientific notes, supported methods and physical feature sizes',()=>{assert.equal(MICROSCOPE_SAMPLES.length,15);for(const s of MICROSCOPE_SAMPLES){assert.ok(s.name&&s.formula&&s.description&&s.observation&&s.preparation,s.id);assert.ok(s.modes.length>0,s.id);assert.ok(s.modes.every(m=>getMicroscopeMode(m)),s.id);if(s.shape==='lattice'){assert.ok(s.latticeSpacingNm>0,s.id)}else{assert.ok(Array.isArray(s.physicalSizeRangeNm)&&s.physicalSizeRangeNm.length===2,s.id);assert.ok(s.physicalSizeRangeNm[0]>0&&s.physicalSizeRangeNm[1]>=s.physicalSizeRangeNm[0],s.id)}}});
test('optical collection includes crystals, precipitate, emulsion, fibres and powder',()=>{const p=getMicroscopeSamples('light').map(s=>s.pattern);for(const v of ['nacl','sucrose','copper','iodine','precipitate','emulsion','fibres','powder'])assert.ok(p.includes(v),v)});
test('advanced imaging covers nanoparticles, nanotubes, graphene and catalyst surfaces',()=>{assert.ok(getMicroscopeSample('gold-nanoparticles').modes.includes('sem'));assert.ok(getMicroscopeSample('gold-nanoparticles').modes.includes('tem'));assert.ok(getMicroscopeSample('carbon-nanotubes').modes.includes('tem'));assert.ok(getMicroscopeSample('porous-catalyst').modes.includes('afm'));assert.ok(getMicroscopeSample('graphite-atomic-lattice').modes.includes('stm'));assert.ok(getMicroscopeSample('graphene-sheet').modes.includes('stm'))});
test('optical technique does not offer atomic lattice or nanoparticle samples',()=>{const ids=new Set(getMicroscopeSamples('light').map(s=>s.id));assert.equal(ids.has('gold-nanoparticles'),false);assert.equal(ids.has('graphite-atomic-lattice'),false);assert.deepEqual(getMicroscopeSamples('invalid'),[])});
test('all five techniques provide magnification/scan and scale-bar presets',()=>{for(const m of MICROSCOPE_MODES){const p=MICROSCOPE_ZOOM_PRESETS[m.id];assert.ok(p.length>=4,m.id);assert.ok(p.every(v=>v.label&&v.scale),m.id);assert.equal(getMicroscopeZoomPreset(m.id,p[0].value).label,p[0].label);assert.equal(getMicroscopeZoomPreset(m.id,999),null)}});
test('graphite STM reference records the 0.246 nm in-plane lattice constant',()=>{
 const graphite=getMicroscopeSample('graphite-atomic-lattice');
 assert.equal(graphite.latticeSpacingNm,.246);
 assert.equal(graphite.shape,'lattice');
});
test('optical objective presets map total magnification to objective magnification',()=>{
 assert.deepEqual(MICROSCOPE_ZOOM_PRESETS.light.map(p=>p.label),['40× total','100× total','400× total','1,000× total']);
 assert.ok(MICROSCOPE_ZOOM_PRESETS.light.every(p=>p.fieldWidthNm>0&&p.metrics?.numericalAperture>0));
});
test('electron, AFM and STM controls describe scan field widths rather than invented objective magnification',()=>{
 for(const mode of ['sem','tem','afm','stm']){
  const presets=MICROSCOPE_ZOOM_PRESETS[mode];
  assert.ok(presets.every(p=>/scan|field/.test(p.label)),mode);
  assert.ok(presets.every(p=>p.fieldWidthNm>0),mode);
 }
});
