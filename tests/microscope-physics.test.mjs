import test from 'node:test';
import assert from 'node:assert/strict';
import {getMicroscopeSample} from '../src/microscope-samples.mjs';
import {
 getElectronMaterial,getElectronRunDefaults,generateAFMSurface,
 runElectronTransport,runAFMInteraction,MICROSCOPE_PHYSICS_LAYOUT
} from '../src/microscope-physics.mjs';

function makeElectronEngine(){
 const memory=new WebAssembly.Memory({initial:2});
 const summaryPointer=64,histogramPointer=256,tracksPointer=1024,secondaryTracksPointer=50000;
 const summary=new Float64Array(memory.buffer,summaryPointer,22);
 const histogram=new Float64Array(memory.buffer,histogramPointer,32);
 const tracks=new Float64Array(memory.buffer,tracksPointer,24*243);
 const secondaryTracks=new Float64Array(memory.buffer,secondaryTracksPointer,24*243);
 return {
  memory,
  cv_electron_engine_version:()=>110,
  cv_electron_last_error:()=>0,
  cv_electron_summary:()=>summaryPointer,
  cv_electron_histogram:()=>histogramPointer,
  cv_electron_tracks:()=>tracksPointer,
  cv_electron_secondary_tracks:()=>secondaryTracksPointer,
  cv_electron_secondary_track_count:()=>1,
  cv_electron_simulate:(count,z,mass,density,energy,thickness,tilt,seed,recorded,maxCollisions)=>{
   summary.fill(0);histogram.fill(0);tracks.fill(0);
   summary[0]=count;summary[1]=count*.2;summary[2]=count*.3;summary[3]=count*.5;
   summary[4]=count*.4;summary[5]=10;summary[6]=20;summary[7]=energy*count-30;
   summary[8]=.4;summary[9]=thickness*.25;summary[10]=24;summary[11]=.2;
   summary[12]=.3;summary[13]=.4;summary[14]=0;summary[15]=count*24;
   summary[16]=20;summary[17]=20;summary[18]=1;summary[19]=.1;summary[20]=.3;summary[21]=.4;
   histogram[2]=10;secondaryTracks.fill(0);
   tracks[0]=2;tracks[1]=1;tracks[2]=energy;
   tracks[3]=0;tracks[4]=0;tracks[5]=0;tracks[6]=energy;tracks[7]=0;
   tracks[8]=2;tracks[9]=0;tracks[10]=thickness*.25;tracks[11]=energy*.8;tracks[12]=2;
   secondaryTracks[0]=2;secondaryTracks[1]=1;secondaryTracks[2]=.02;
   secondaryTracks[3]=0;secondaryTracks[4]=0;secondaryTracks[5]=1;secondaryTracks[6]=.02;secondaryTracks[7]=6;
   secondaryTracks[8]=2;secondaryTracks[9]=0;secondaryTracks[10]=.2;secondaryTracks[11]=0;secondaryTracks[12]=.01;secondaryTracks[13]=8;
   return summaryPointer;
  }
 };
}
function makeAfmEngine(){
 const memory=new WebAssembly.Memory({initial:8});
 const inputPointer=0,summaryPointer=8000,outputPointer=8200;
 const summary=new Float64Array(memory.buffer,summaryPointer,12);
 const output=new Float64Array(memory.buffer,outputPointer,96*96*6);
 return {
  memory,
  cv_afm_engine_version:()=>110,
  cv_afm_last_error:()=>0,
  cv_afm_height_input:()=>inputPointer,
  cv_afm_summary:()=>summaryPointer,
  cv_afm_output:()=>outputPointer,
  cv_afm_scan(grid,width,amplitude,setpoint,spring,freq,q,radius,young,poisson,adhesion,hamaker,mode,force,cycles,steps,tipGeometry,tipAngle){
   const count=grid*grid,input=new Float64Array(memory.buffer,inputPointer,count);
   output.fill(0);summary.fill(0);
   summary[0]=grid;summary[1]=2;summary[2]=4;summary[3]=.2;
   summary[4]=1;summary[5]=amplitude*setpoint;summary[6]=setpoint;
   summary[7]=.15;summary[8]=4;summary[9]=.01;summary[10]=.8;summary[11]=mode;
   for(let i=0;i<count;i++){
    const p=i*6;output[p]=input[i];output[p+1]=.2;output[p+2]=2;
    output[p+3]=amplitude*setpoint;output[p+4]=12;output[p+5]=4;
   }
   return outputPointer;
  }
 };
}

test('electron material presets distinguish high-Z and low-Z specimen materials',()=>{
 const gold=getElectronMaterial(getMicroscopeSample('gold-nanoparticles'));
 const carbon=getElectronMaterial(getMicroscopeSample('graphene-sheet'));
 assert.equal(gold.z,79);assert.equal(gold.density,19.32);
 assert.equal(carbon.z,6);assert.equal(carbon.density,2.2);
});
test('SEM and TEM choose different physically meaningful accelerating voltages and thicknesses',()=>{
 const sample=getMicroscopeSample('gold-nanoparticles');
 const sem=getElectronRunDefaults('sem',sample),tem=getElectronRunDefaults('tem',sample);
 assert.equal(sem.energyKeV,15);assert.equal(tem.energyKeV,200);
 assert.ok(tem.thicknessNm<sem.thicknessNm);
 assert.ok(sem.seed!==0&&tem.seed!==0);
});
test('AFM source surfaces are reproducible and have finite nonzero topographic range',()=>{
 for(const id of ['cellulose-fibres','graphene-sheet','porous-catalyst']){
  const sample=getMicroscopeSample(id);
  const a=generateAFMSurface(sample,{gridSize:16,scanWidthNm:2000,seed:101});
  const b=generateAFMSurface(sample,{gridSize:16,scanWidthNm:2000,seed:101});
  assert.equal(a.heightsNm.length,256);
  assert.deepEqual(Array.from(a.heightsNm),Array.from(b.heightsNm));
  assert.ok(a.heightRangeNm>0,id);
  assert.ok(Array.from(a.heightsNm).every(Number.isFinite),id);
 }
});
test('AFM surface generation rejects invalid scan geometry',()=>{
 assert.throws(()=>generateAFMSurface(getMicroscopeSample('cellulose-fibres'),{gridSize:4,scanWidthNm:2000}),RangeError);
 assert.throws(()=>generateAFMSurface(getMicroscopeSample('cellulose-fibres'),{gridSize:16,scanWidthNm:0}),RangeError);
});
test('electron wrapper decodes Monte Carlo summary, histogram and tracks from WASM memory',()=>{
 const result=runElectronTransport({electron:makeElectronEngine()},{
  sample:getMicroscopeSample('gold-nanoparticles'),mode:'sem',
  energyKeV:20,thicknessNm:500,particleCount:100,seed:12
 });
 assert.equal(result.material.z,79);
 assert.equal(result.backscattered,20);
 assert.equal(result.transmitted,30);
 assert.equal(result.absorbed,50);
 assert.equal(result.secondaryElectrons,40);
 assert.equal(result.trajectories.length,1);
 assert.equal(result.trajectories[0].points.length,2);
 assert.equal(result.trajectories[0].points[1].depthNm,125);
 assert.equal(result.trajectories[0].points[1].energyKeV,16);
 assert.equal(result.histogram[2],10);
 assert.equal(result.secondaryTrajectories.length,1);
 assert.equal(result.secondaryTrajectories[0].points[0].event,6);
 assert.equal(result.secondaryTrajectories[0].outcome,1);
 assert.equal(result.secondaryEscaped,20);
 assert.equal(result.secondaryAbsorbed,20);
 assert.equal(result.secondaryEnergyKeV,.4);
});
test('electron wrapper rejects unsupported imaging modes',()=>{
 assert.throws(()=>runElectronTransport({electron:makeElectronEngine()},{
  sample:getMicroscopeSample('gold-nanoparticles'),mode:'afm'
 }),RangeError);
});
test('AFM wrapper writes a physical height map and returns force, deflection and amplitude channels',()=>{
 const result=runAFMInteraction({afm:makeAfmEngine()},{
  sample:getMicroscopeSample('cellulose-fibres'),scanWidthNm:2000,gridSize:8,
  mode:'tapping',freeAmplitudeNm:8,amplitudeSetpointRatio:.72,tipGeometry:'pyramid',tipHalfAngleDegrees:28,seed:24
 });
 assert.equal(result.topographyNm.length,64);
 assert.ok(Math.abs(result.topographyNm[0]-result.sourceHeightsNm[0])<1e-5);
 assert.equal(result.peakForceNn[0],2);
 assert.equal(result.deflectionNm[0],.2);
 assert.equal(result.amplitudeNm[0],5.76);
 assert.ok(Math.abs(result.amplitudeRatio-.72)<1e-9);
 assert.equal(result.tipGeometry,'pyramid');
 assert.equal(result.tipHalfAngleDegrees,28);
 assert.equal(result.material.poisson,.32);
 assert.equal(result.material.adhesion,28);
});
test('AFM wrapper rejects an invalid operation mode',()=>{
 assert.throws(()=>runAFMInteraction({afm:makeAfmEngine()},{
  sample:getMicroscopeSample('cellulose-fibres'),mode:'sem'
 }),RangeError);
});
test('physics memory layouts remain fixed for C++ and JavaScript ABI compatibility',()=>{
 assert.equal(MICROSCOPE_PHYSICS_LAYOUT.electron.summaryFields,22);
 assert.equal(MICROSCOPE_PHYSICS_LAYOUT.electron.maxSecondaryTracks,24);
 assert.equal(MICROSCOPE_PHYSICS_LAYOUT.electron.trackStride,243);
 assert.equal(MICROSCOPE_PHYSICS_LAYOUT.afm.outputFields,6);
 assert.deepEqual(MICROSCOPE_PHYSICS_LAYOUT.afm.tipGeometries,['sphere','cone','pyramid']);
});
