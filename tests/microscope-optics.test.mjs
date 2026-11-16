import test from 'node:test';
import assert from 'node:assert/strict';
import {
 OBJECTIVE_LENSES,EYEPIECE_MAGNIFICATION,FIELD_NUMBER_MM,ILLUMINATION_WAVELENGTH_NM,
 getOpticalObjective,getOpticalMetrics,getImagingPreset,getPhysicalScaleBar,
 getOpticalDefocusBlurPx,getTunnellingCurrentRelative,getObjectiveFocusingLimits
} from '../src/microscope-optics.mjs';

test('four parfocal objective records include calibrated NA, working distance and immersion',()=>{
 assert.deepEqual(OBJECTIVE_LENSES.map(item=>item.magnification),[4,10,40,100]);
 assert.ok(OBJECTIVE_LENSES.every(item=>item.numericalAperture>0&&item.workingDistanceMm>0));
 assert.equal(getOpticalObjective(100).immersion,'oil');
 assert.equal(getOpticalObjective(40).immersion,'dry');
 assert.equal(getOpticalObjective(999),null);
});

test('total magnification and field number produce specimen-plane field width',()=>{
 const four=getOpticalMetrics(4),ten=getOpticalMetrics(10),forty=getOpticalMetrics(40),hundred=getOpticalMetrics(100);
 assert.equal(EYEPIECE_MAGNIFICATION,10);
 assert.equal(FIELD_NUMBER_MM,18);
 assert.equal(four.totalMagnification,40);
 assert.equal(ten.totalMagnification,100);
 assert.equal(forty.totalMagnification,400);
 assert.equal(hundred.totalMagnification,1000);
 assert.equal(four.fieldWidthNm,4_500_000);
 assert.equal(ten.fieldWidthNm,1_800_000);
 assert.equal(forty.fieldWidthNm,450_000);
 assert.equal(hundred.fieldWidthNm,180_000);
});

test('Abbe resolution follows wavelength divided by twice the objective NA',()=>{
 const metrics=getOpticalMetrics(40);
 assert.equal(metrics.wavelengthNm,ILLUMINATION_WAVELENGTH_NM);
 assert.ok(Math.abs(metrics.abbeResolutionNm-(550/(2*.65)))<1e-12);
 assert.ok(getOpticalMetrics(100).abbeResolutionNm<getOpticalMetrics(40).abbeResolutionNm);
 assert.ok(getOpticalMetrics(40).abbeResolutionNm<getOpticalMetrics(10).abbeResolutionNm);
});

test('all imaging scan presets expose calibrated field widths and sensible scale bars',()=>{
 for(const mode of ['light','sem','tem','afm','stm']){
  const count=mode==='light'?4:5;
  for(let index=1;index<=count;index++){
   const preset=getImagingPreset(mode,index,mode==='light'?[4,10,40,100][index-1]:10);
   assert.ok(preset,mode+' '+index);
   assert.ok(preset.fieldWidthNm>0,mode+' field');
   assert.ok(preset.scale.length>0,mode+' scale');
  }
 }
 assert.ok(getImagingPreset('sem',1).fieldWidthNm>getImagingPreset('sem',5).fieldWidthNm);
 assert.ok(getImagingPreset('stm',1).fieldWidthNm>getImagingPreset('stm',5).fieldWidthNm);
});

test('scale-bar pixels are derived from the actual calibrated field width',()=>{
 const bar=getPhysicalScaleBar(450_000,1200);
 assert.ok(bar.lengthNm>0);
 assert.ok(bar.widthPx>80&&bar.widthPx<180);
 assert.equal(getPhysicalScaleBar(450_000,2400).widthPx,bar.widthPx*2);
});

test('defocus blur increases away from focus and with high-NA objectives',()=>{
 const sharp=getOpticalDefocusBlurPx(40,100,1200);
 const soft=getOpticalDefocusBlurPx(40,0,1200);
 const highNa=getOpticalDefocusBlurPx(100,0,1200);
 assert.ok(soft>sharp);
 assert.ok(highNa>soft);
});

test('STM current contrast follows an exponential tunnelling-distance relation',()=>{
 const atSetpoint=getTunnellingCurrentRelative(0);
 const above=getTunnellingCurrentRelative(.1);
 const below=getTunnellingCurrentRelative(-.1);
 assert.equal(atSetpoint,1);
 assert.ok(above>0&&above<1);
 assert.ok(below>1);
 assert.ok(getTunnellingCurrentRelative(.1,4.5)<getTunnellingCurrentRelative(.1,2));
 assert.equal(getTunnellingCurrentRelative(NaN),null);
});

test('high-power objectives lock coarse focusing and require oil immersion when specified',()=>{
 assert.equal(getObjectiveFocusingLimits(4).coarseFocusAllowed,true);
 assert.equal(getObjectiveFocusingLimits(10).coarseFocusAllowed,true);
 assert.equal(getObjectiveFocusingLimits(40).coarseFocusAllowed,false);
 assert.equal(getObjectiveFocusingLimits(100).requiresImmersionOil,true);
});
