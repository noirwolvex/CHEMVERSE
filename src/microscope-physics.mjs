const ELECTRON_TRACKS=24;
const ELECTRON_SECONDARY_TRACKS=24;
const ELECTRON_POINTS=48;
const ELECTRON_POINT_FIELDS=5;
const ELECTRON_TRACK_HEADER=3;
const ELECTRON_TRACK_STRIDE=ELECTRON_TRACK_HEADER+ELECTRON_POINTS*ELECTRON_POINT_FIELDS;
const ELECTRON_SUMMARY_FIELDS=22;
const ELECTRON_HISTOGRAM_BINS=32;
const AFM_OUTPUT_FIELDS=6;
const AFM_SUMMARY_FIELDS=12;

const MATERIALS=Object.freeze({
 'nacl-crystals':{label:'Sodium chloride',z:14,mass:29.22,density:2.16,young:40,poisson:.25,adhesion:55,hamaker:1.0e-19},
 'sucrose-crystals':{label:'Sucrose',z:4.04,mass:7.61,density:1.59,young:15,poisson:.30,adhesion:24,hamaker:0.8e-19},
 'copper-sulfate':{label:'Copper sulfate pentahydrate',z:9.8,mass:15.3,density:2.28,young:35,poisson:.28,adhesion:38,hamaker:1.0e-19},
 'iodine-crystals':{label:'Iodine',z:53,mass:126.9,density:4.93,young:8,poisson:.32,adhesion:42,hamaker:1.1e-19},
 'barium-sulfate':{label:'Barium sulfate',z:36,mass:68.67,density:4.5,young:70,poisson:.24,adhesion:62,hamaker:1.0e-19},
 'oil-emulsion':{label:'Oil droplets in water',z:5,mass:8,density:.95,young:.002,poisson:.49,adhesion:3,hamaker:.5e-19},
 'cellulose-fibres':{label:'Cellulose',z:3.43,mass:6.00,density:1.5,young:10,poisson:.32,adhesion:28,hamaker:.8e-19},
 'insoluble-powder':{label:'Mixed mineral powder (effective medium)',z:12,mass:24,density:2.5,young:30,poisson:.27,adhesion:35,hamaker:.9e-19},
 'gold-nanoparticles':{label:'Gold',z:79,mass:196.967,density:19.32,young:79,poisson:.44,adhesion:65,hamaker:3.0e-19},
 'silver-nanoparticles':{label:'Silver',z:47,mass:107.868,density:10.49,young:83,poisson:.37,adhesion:58,hamaker:2.0e-19},
 'tio2-nanoparticles':{label:'Titanium dioxide (effective medium)',z:12.67,mass:26.62,density:4.23,young:230,poisson:.27,adhesion:72,hamaker:1.5e-19},
 'carbon-nanotubes':{label:'Graphitic carbon',z:6,mass:12.011,density:2.2,young:1000,poisson:.19,adhesion:16,hamaker:1.0e-19},
 'graphene-sheet':{label:'Graphitic carbon',z:6,mass:12.011,density:2.2,young:1000,poisson:.19,adhesion:16,hamaker:1.0e-19},
 'porous-catalyst':{label:'Silica-rich porous catalyst (effective medium)',z:10,mass:20,density:2.2,young:50,poisson:.22,adhesion:34,hamaker:.9e-19},
 'graphite-atomic-lattice':{label:'Graphite',z:6,mass:12.011,density:2.2,young:1000,poisson:.19,adhesion:16,hamaker:1.0e-19}
});
function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
const between=(rng,min,max)=>min+rng()*(max-min);
function xorshift(seed){
 let state=(seed>>>0)||0x6d2b79f5;
 return()=>{state^=state<<13;state^=state>>>17;state^=state<<5;return (state>>>0)/4294967296};
}
function hashSeed(text){
 let value=2166136261;
 for(const ch of String(text)){value^=ch.charCodeAt(0);value=Math.imul(value,16777619)}
 return value>>>0;
}
function sampleMaterial(sample){
 return MATERIALS[sample?.id]||MATERIALS['insoluble-powder'];
}
function copyF64(memory,pointer,length){
 if(pointer===null||pointer===undefined)throw new Error('Physics engine returned an empty result buffer');
 return new Float64Array(memory.buffer,pointer,length).slice();
}
async function instantiateWasm(path){
 const response=await fetch(path,{cache:'no-cache'});
 if(!response.ok)throw new Error('Unable to load '+path+' ('+response.status+')');
 const bytes=await response.arrayBuffer();
 const result=await WebAssembly.instantiate(bytes,{});
 return result.instance.exports;
}
let enginesPromise=null;
export function loadMicroscopePhysics(basePath='./wasm/'){
 if(!enginesPromise){
  const root=basePath.endsWith('/')?basePath:basePath+'/';
  enginesPromise=Promise.all([
   instantiateWasm(root+'electron_transport.wasm'),
   instantiateWasm(root+'afm_interaction.wasm')
  ]).then(([electron,afm])=>{
   const requiredElectron=['memory','cv_electron_simulate','cv_electron_summary','cv_electron_histogram','cv_electron_tracks','cv_electron_secondary_tracks','cv_electron_secondary_track_count','cv_electron_last_error','cv_electron_engine_version'];
   const requiredAfm=['memory','cv_afm_height_input','cv_afm_scan_begin','cv_afm_scan_advance','cv_afm_scan_progress','cv_afm_scan_complete','cv_afm_scan','cv_afm_summary','cv_afm_output','cv_afm_last_error','cv_afm_engine_version'];
   for(const name of requiredElectron)if(!(name in electron))throw new Error('Electron WASM export missing: '+name);
   for(const name of requiredAfm)if(!(name in afm))throw new Error('AFM WASM export missing: '+name);
   if(electron.cv_electron_engine_version()!==110||afm.cv_afm_engine_version()!==120){
    throw new Error('Unsupported microscope physics engine version');
   }
   return Object.freeze({electron,afm});
  }).catch(error=>{enginesPromise=null;throw error});
 }
 return enginesPromise;
}
export function getElectronMaterial(sample){return Object.freeze({...sampleMaterial(sample)})}
export function getElectronRunDefaults(mode,sample){
 const material=sampleMaterial(sample);
 return Object.freeze({
  energyKeV:mode==='tem'?200:15,
  thicknessNm:mode==='tem'?80:500,
  particleCount:1200,
  beamTiltDegrees:0,
  seed:hashSeed((sample?.id||'specimen')+':'+mode+':CHEMVERSE'),
  material
 });
}
export function runElectronTransport(engines,{sample,mode='sem',energyKeV,thicknessNm,particleCount=1200,
 beamTiltDegrees=0,seed,recordedTracks=ELECTRON_TRACKS,maximumCollisions=500}={}){
 if(!engines?.electron)throw new TypeError('Electron WASM engine is not loaded');
 if(mode!=='sem'&&mode!=='tem')throw new RangeError('Electron transport is available in SEM and TEM modes');
 const material=sampleMaterial(sample),defaults=getElectronRunDefaults(mode,sample);
 const z=Number(energyKeV??defaults.energyKeV),thickness=Number(thicknessNm??defaults.thicknessNm);
 const count=Math.round(Number(particleCount)),randomSeed=(Number(seed??defaults.seed)>>>0)||1;
 const pointer=engines.electron.cv_electron_simulate(
  count,material.z,material.mass,material.density,z,thickness,
  Number(beamTiltDegrees),randomSeed,clamp(Math.round(recordedTracks),0,ELECTRON_TRACKS),
  clamp(Math.round(maximumCollisions),1,2000)
 );
 if(pointer===null||pointer===undefined||engines.electron.cv_electron_last_error()!==0){
  throw new Error('Electron Monte Carlo failed (engine error '+engines.electron.cv_electron_last_error()+')');
 }
 const summary=copyF64(engines.electron.memory,engines.electron.cv_electron_summary(),ELECTRON_SUMMARY_FIELDS);
 const histogram=copyF64(engines.electron.memory,engines.electron.cv_electron_histogram(),ELECTRON_HISTOGRAM_BINS);
 const tracks=copyF64(engines.electron.memory,engines.electron.cv_electron_tracks(),ELECTRON_TRACKS*ELECTRON_TRACK_STRIDE);
 const secondaryTrackCount=clamp(Math.round(engines.electron.cv_electron_secondary_track_count()),0,ELECTRON_SECONDARY_TRACKS);
 const secondaryTracks=copyF64(engines.electron.memory,engines.electron.cv_electron_secondary_tracks(),ELECTRON_SECONDARY_TRACKS*ELECTRON_TRACK_STRIDE);
 const decodeTracks=(buffer,maximum)=>{
  const output=[];
  for(let index=0;index<maximum;index++){
   const base=index*ELECTRON_TRACK_STRIDE,pointCount=Math.min(ELECTRON_POINTS,Math.round(buffer[base]||0));
   if(!pointCount)continue;
   const points=[];
   for(let p=0;p<pointCount;p++){
    const offset=base+ELECTRON_TRACK_HEADER+p*ELECTRON_POINT_FIELDS;
    points.push(Object.freeze({xNm:buffer[offset],yNm:buffer[offset+1],depthNm:buffer[offset+2],energyKeV:buffer[offset+3],event:Math.round(buffer[offset+4])}));
   }
   output.push(Object.freeze({outcome:Math.round(buffer[base+1]),initialEnergyKeV:buffer[base+2],points:Object.freeze(points)}));
  }
  return Object.freeze(output);
 };
 const trajectory=decodeTracks(tracks,ELECTRON_TRACKS);
 const secondaryTrajectories=decodeTracks(secondaryTracks,secondaryTrackCount);
 return Object.freeze({
  mode,material,energyKeV:z,thicknessNm:thickness,particleCount:count,
  backscattered:Math.round(summary[1]),transmitted:Math.round(summary[2]),
  absorbed:Math.round(summary[3]),secondaryElectrons:Math.round(summary[4]),
  backscatterCoefficient:summary[11],transmissionCoefficient:summary[12],
  secondaryYield:summary[13],backscatterEnergyKeV:summary[5],
  transmittedEnergyKeV:summary[6],depositedEnergyKeV:summary[7],
  secondaryEnergyKeV:summary[21],secondaryEscapedEnergyKeV:summary[19],
  secondaryDepositedEnergyKeV:summary[20],secondaryEscaped:Math.round(summary[16]),
  secondaryAbsorbed:Math.round(summary[17]),secondaryTracksRecorded:Math.round(summary[18]),
  meanPenetrationNm:summary[9],
  meanCollisions:summary[10],energyClosureKeV:summary[14],
  eventCount:Math.round(summary[15]),histogram,trajectories:trajectory,secondaryTrajectories
 });
}
function featureProfile(sample){
 const shape=sample?.shape||'particle';
 const material=sampleMaterial(sample);
 const range=sample?.physicalSizeRangeNm||[10,100];
 return {shape,material,minSize:range[0],maxSize:range[1]};
}
export function generateAFMSurface(sample,{gridSize=32,scanWidthNm=2000,seed}={}){
 const grid=Math.round(gridSize),width=Number(scanWidthNm);
 if(!Number.isInteger(grid)||grid<8||grid>96||!Number.isFinite(width)||width<10)throw new RangeError('Invalid AFM sample grid or scan width');
 const profile=featureProfile(sample),random=xorshift(seed??hashSeed((sample?.id||'sample')+':AFM:'+width));
 const features=[];
 const count=profile.shape==='porous'?44:profile.shape==='fibre'?22:profile.shape==='sheet'?28:32;
 for(let i=0;i<count;i++){
  let rx=between(random,profile.minSize,profile.maxSize)*.45;
  let ry=rx*between(random,.5,1.2),height=between(random,1,12),sign=1;
  if(profile.shape==='fibre'){
   rx=clamp(between(random,width*.12,width*.6),width/grid*.8,width*.8);
   ry=clamp(between(random,profile.minSize*.2,profile.maxSize*.5),width/grid*.45,width*.12);
   height=between(random,35,260);
  }else if(profile.shape==='porous'){
   rx=clamp(between(random,profile.minSize*.2,profile.maxSize*.45),width/grid*.7,width*.16);
   ry=rx*between(random,.45,1.5);
   height=between(random,15,180);sign=i%3===0?-1:1;
  }else if(profile.shape==='sheet'){
   rx=clamp(between(random,width*.08,width*.48),width/grid,width*.7);
   ry=clamp(between(random,width*.012,width*.08),width/grid*.4,width*.16);
   height=between(random,.34,3.4);
  }else{
   rx=clamp(rx,width/grid*.6,width*.25);ry=rx*between(random,.6,1.3);
   height=between(random,2,45);
  }
  features.push({x:random()*width,y:random()*width,rx,ry,angle:random()*Math.PI*2,height,sign});
 }
 const map=new Float64Array(grid*grid),pixel=width/(grid-1);
 let minimum=Infinity,maximum=-Infinity;
 for(let y=0;y<grid;y++){
  for(let x=0;x<grid;x++){
   const px=x*pixel,py=y*pixel;let value=0;
   for(const feature of features){
    const dx=px-feature.x,dy=py-feature.y,cos=Math.cos(feature.angle),sin=Math.sin(feature.angle);
    const lx=(dx*cos+dy*sin)/feature.rx,ly=(-dx*sin+dy*cos)/feature.ry;
    const radius=lx*lx+ly*ly;
    if(radius<8)value+=feature.sign*feature.height*Math.exp(-radius*1.8);
   }
   if(profile.shape==='sheet')value+=.12*Math.sin(px*.045)+.06*Math.sin((px+py)*.028);
   if(profile.shape==='porous')value+=.8*Math.sin(px*.019)*Math.cos(py*.017);
   map[y*grid+x]=value;minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);
  }
 }
 const offset=minimum<0?-minimum:0;
 if(offset!==0)for(let i=0;i<map.length;i++)map[i]+=offset;
 return Object.freeze({gridSize:grid,scanWidthNm:width,heightsNm:map,
  minimumHeightNm:minimum+offset,maximumHeightNm:maximum+offset,heightRangeNm:maximum-minimum});
}
export function startAFMInteraction(engines,{sample,scanWidthNm=2000,gridSize=32,seed,
 mode='tapping',freeAmplitudeNm=8,amplitudeSetpointRatio=.72,
 springConstantNPerM=2,resonanceFrequencyKHz=300,qualityFactor=80,
 tipRadiusNm=10,tipGeometry='sphere',tipHalfAngleDegrees=30,
 youngModulusGPa,poissonRatio,adhesionEnergyMilliJPerM2,hamakerConstantJ,contactForceSetpointNn=3,
 cyclesPerPixel=6,stepsPerCycle=24}={}){
 if(!engines?.afm)throw new TypeError('AFM WASM engine is not loaded');
 if(mode!=='tapping'&&mode!=='contact')throw new RangeError('AFM mode must be tapping or contact');
 const material=sampleMaterial(sample),surface=generateAFMSurface(sample,{gridSize,scanWidthNm,seed});
 const api=engines.afm,count=surface.heightsNm.length;
 const inputPointer=api.cv_afm_height_input();
 new Float64Array(api.memory.buffer,inputPointer,count).set(surface.heightsNm);
 const pointer=api.cv_afm_scan_begin(
  surface.gridSize,surface.scanWidthNm,Number(freeAmplitudeNm),
  Number(amplitudeSetpointRatio),Number(springConstantNPerM),
  Number(resonanceFrequencyKHz),Number(qualityFactor),Number(tipRadiusNm),
  Number(youngModulusGPa??material.young),Number(poissonRatio??material.poisson),
  Number(adhesionEnergyMilliJPerM2??material.adhesion),Number(hamakerConstantJ??material.hamaker),
  mode==='tapping'?0:1,Number(contactForceSetpointNn),
  Math.round(cyclesPerPixel),Math.round(stepsPerCycle),
  ({sphere:0,cone:1,pyramid:2}[tipGeometry]??0),Number(tipHalfAngleDegrees)
 );
 if(pointer===null||pointer===undefined||api.cv_afm_last_error()!==0){
  throw new Error('AFM interaction solver could not begin (engine error '+api.cv_afm_last_error()+')');
 }
 const result={
  mode,material,tipGeometry,tipHalfAngleDegrees:Number(tipHalfAngleDegrees),
  gridSize:surface.gridSize,scanWidthNm:surface.scanWidthNm,sourceHeightsNm:surface.heightsNm,
  topographyNm:surface.heightsNm.slice(),deflectionNm:new Float64Array(count),
  peakForceNn:new Float64Array(count),amplitudeNm:new Float64Array(count),
  phaseDegrees:new Float64Array(count),feedbackIterations:new Uint8Array(count),
  meanPeakForceNn:0,maximumPeakForceNn:0,meanDeflectionNm:0,meanTopographyNm:0,
  meanAmplitudeNm:0,amplitudeRatio:0,maximumIndentationNm:0,
  meanFeedbackIterations:0,meanAmplitudeErrorNm:0,contactFraction:0,
  scannedPixels:0,scanProgress:0,scanComplete:false
 };
 return {api,result,count,copiedPixels:0};
}
export function advanceAFMInteraction(session,maxPixels=12){
 if(!session?.api||!session?.result)throw new TypeError('An active AFM scan session is required');
 const {api,result,count}=session;
 if(result.scanComplete)return result;
 const batch=Math.max(1,Math.min(count,Math.round(Number(maxPixels)||1)));
 const progressReturned=api.cv_afm_scan_advance(batch);
 if(progressReturned<0||api.cv_afm_last_error()!==0){
  throw new Error('AFM scan step failed (engine error '+api.cv_afm_last_error()+')');
 }
 const progress=Math.max(0,Math.min(count,api.cv_afm_scan_progress()));
 if(progress<session.copiedPixels||progressReturned!==progress){
  throw new Error('AFM scan progress counter is inconsistent');
 }
 const records=new Float64Array(api.memory.buffer,api.cv_afm_output(),progress*AFM_OUTPUT_FIELDS);
 for(let i=session.copiedPixels;i<progress;i++){
  const base=i*AFM_OUTPUT_FIELDS;
  result.topographyNm[i]=records[base];
  result.deflectionNm[i]=records[base+1];
  result.peakForceNn[i]=records[base+2];
  result.amplitudeNm[i]=records[base+3];
  result.phaseDegrees[i]=records[base+4];
  result.feedbackIterations[i]=records[base+5];
 }
 session.copiedPixels=progress;
 result.scannedPixels=progress;
 result.scanProgress=progress/count;
 result.scanComplete=api.cv_afm_scan_complete()===1;
 if(result.scanComplete!==(progress===count)){
  throw new Error('AFM solver completion flag does not match its pixel count');
 }
 const summary=copyF64(api.memory,api.cv_afm_summary(),AFM_SUMMARY_FIELDS);
 result.meanPeakForceNn=summary[1];
 result.maximumPeakForceNn=summary[2];
 result.meanDeflectionNm=summary[3];
 result.meanTopographyNm=summary[4];
 result.meanAmplitudeNm=summary[5];
 result.amplitudeRatio=summary[6];
 result.maximumIndentationNm=summary[7];
 result.meanFeedbackIterations=summary[8];
 result.meanAmplitudeErrorNm=summary[9];
 result.contactFraction=summary[10];
 return result;
}
export function runAFMInteraction(engines,options={}){
 const session=startAFMInteraction(engines,options);
 while(!session.result.scanComplete)advanceAFMInteraction(session,session.count);
 return session.result;
}
export const MICROSCOPE_PHYSICS_LAYOUT=Object.freeze({
 electron:{summaryFields:ELECTRON_SUMMARY_FIELDS,histogramBins:ELECTRON_HISTOGRAM_BINS,
  maxTracks:ELECTRON_TRACKS,maxSecondaryTracks:ELECTRON_SECONDARY_TRACKS,maxPoints:ELECTRON_POINTS,trackStride:ELECTRON_TRACK_STRIDE},
 afm:{summaryFields:AFM_SUMMARY_FIELDS,outputFields:AFM_OUTPUT_FIELDS,maxGrid:96,incrementalScan:true,tipGeometries:Object.freeze(['sphere','cone','pyramid'])}
});
