import {
 MICROSCOPE_MODES,MICROSCOPE_ZOOM_PRESETS,getMicroscopeMode,getMicroscopeSample,
 getMicroscopeSamples,getMicroscopeZoomPreset
} from './microscope-samples.mjs';
import {
 getOpticalMetrics,getImagingPreset,getPhysicalScaleBar,getOpticalDefocusBlurPx,
 getTunnellingCurrentRelative,getObjectiveFocusingLimits
} from './microscope-optics.mjs';
import {createMicroscopeInstrument} from './microscope-instrument.js';
import {
 createSlidePreparationState,completeSlidePreparationStep,
 getSlidePreparationPlan,getSlidePreparationProgress
} from './microscope-workflow.mjs';

const canvas=document.getElementById('microscope-canvas');
const viewport=document.getElementById('scope-viewport');
const ctx=canvas?.getContext('2d');
const buttons=[...document.querySelectorAll('[data-mode]')];
const list=document.getElementById('sample-list');
const zoom=document.getElementById('zoom-control');
const focus=document.getElementById('focus-control');
const gain=document.getElementById('light-control');
const OBJECTIVES=[4,10,40,100];
let mode='light',objective=10,scanValue=2;
let sample=getMicroscopeSample('nacl-crystals');
let slideState=createSlidePreparationState(sample.id),instrument=null;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const mix=(a,b,t)=>a+(b-a)*t;
const between=(rng,min,max)=>min+rng()*(max-min);
const formatNumber=value=>Number(value).toLocaleString('en-US',{maximumFractionDigits:2});
function randomFor(seed){
 let value=2166136261;
 for(const ch of seed){value^=ch.charCodeAt(0);value=Math.imul(value,16777619)}
 return()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296}
}
function rounded(context,x,y,width,height,radius){
 radius=Math.min(radius,width/2,height/2);
 context.beginPath();context.moveTo(x+radius,y);
 context.arcTo(x+width,y,x+width,y+height,radius);
 context.arcTo(x+width,y+height,x,y+height,radius);
 context.arcTo(x,y+height,x,y,radius);
 context.arcTo(x,y,x+width,y,radius);
 context.closePath();
}
function getActivePreset(){
 return mode==='light'
  ?getImagingPreset('light',Number(zoom.value),objective)
  :getImagingPreset(mode,Number(zoom.value));
}
function fieldToPixels(sizeNm,fieldWidthNm,width){
 return sizeNm/fieldWidthNm*width;
}
function drawCrystal(context,x,y,widthPx,heightPx,shape,tones,rotation,rng){
 context.save();context.translate(x,y);context.rotate(rotation);
 const rx=Math.max(.35,widthPx/2),ry=Math.max(.35,heightPx/2);
 const fill=context.createLinearGradient(-rx,-ry,rx,ry);
 fill.addColorStop(0,tones[0]);fill.addColorStop(.48,tones[1]);fill.addColorStop(1,tones[2]);
 context.shadowColor='rgba(22,38,39,.20)';context.shadowBlur=Math.max(1,Math.min(9,rx*.06));
 context.fillStyle=fill;context.strokeStyle='rgba(48,70,70,.40)';context.lineWidth=Math.max(.65,Math.min(1.8,rx*.012));
 const vertices=shape==='cube'?[[ -.78,-.40],[-.17,-.78],[.78,-.39],[.77,.48],[.12,.80],[-.77,.46]]:
  shape==='needle'?[[-.18,-1],[.18,-.83],[.34,.85],[-.12,1]]:
  shape==='plate'?[[-1,-.19],[-.42,-.76],[.82,-.49],[1,.27],[.3,.75],[-.82,.52]]:
  [[-.72,-.44],[-.11,-.82],[.7,-.4],[.52,.65],[-.44,.78]];
 context.beginPath();vertices.forEach(([px,py],index)=>{const xx=px*rx,yy=py*ry;if(index===0)context.moveTo(xx,yy);else context.lineTo(xx,yy)});context.closePath();context.fill();context.stroke();
 context.shadowBlur=0;
 context.beginPath();context.moveTo(-rx*.76,-ry*.30);context.lineTo(-rx*.12,-ry*.76);context.lineTo(rx*.28,-ry*.38);context.lineTo(-rx*.08,ry*.02);context.closePath();
 context.fillStyle='rgba(255,255,255,.32)';context.fill();
 context.beginPath();context.moveTo(rx*.2,-ry*.25);context.lineTo(rx*.78,-ry*.38);context.lineTo(rx*.75,ry*.48);context.lineTo(rx*.08,ry*.80);context.closePath();
 context.fillStyle='rgba(12,40,48,.13)';context.fill();
 if(rng()>.58&&rx>18){context.beginPath();context.moveTo(-rx*.5,ry*.15);context.lineTo(-rx*.1,ry*.34);context.lineTo(rx*.38,ry*.22);context.strokeStyle='rgba(255,255,255,.3)';context.lineWidth=.8;context.stroke()}
 context.restore();
}
function opticalPalette(id){
 return ({
  'nacl-crystals':['rgba(252,255,251,.82)','rgba(216,233,225,.62)','rgba(132,165,162,.55)'],
  'sucrose-crystals':['rgba(255,247,222,.92)','rgba(220,203,159,.66)','rgba(139,126,97,.52)'],
  'copper-sulfate':['rgba(149,227,251,.93)','rgba(42,144,190,.82)','rgba(10,59,105,.88)'],
  'iodine-crystals':['rgba(182,147,197,.90)','rgba(91,55,105,.92)','rgba(35,22,48,.95)']
 })[id]||['rgba(248,250,243,.9)','rgba(189,207,195,.75)','rgba(93,121,113,.65)'];
}
function drawOpticalCrystals(context,w,h,fieldWidth,rng){
 const range=sample.physicalSizeRangeNm||[30000,150000];
 const shapes=sample.shape==='cube'?'cube':sample.shape==='needle'?'needle':sample.shape==='plate'?'plate':'prism';
 const palette=opticalPalette(sample.id);
 const count=sample.id==='nacl-crystals'?23:sample.id==='copper-sulfate'?12:sample.id==='iodine-crystals'?17:16;
 for(let index=0;index<count;index++){
  const size=between(rng,range[0],range[1]);
  const widthPx=fieldToPixels(size,fieldWidth,w);
  const aspect=sample.shape==='needle'?between(rng,.13,.32):sample.shape==='plate'?between(rng,.38,.72):between(rng,.58,.95);
  const heightPx=widthPx*aspect*(h/w);
  const x=between(rng,-.02*w,1.02*w),y=between(rng,-.03*h,1.03*h);
  drawCrystal(context,x,y,widthPx,heightPx,shapes,palette,rng()*Math.PI,rng);
 }
}
function drawOpticalPrecipitate(context,w,h,fieldWidth,rng){
 const count=420,range=sample.physicalSizeRangeNm||[250,1800];
 for(let index=0;index<count;index++){
  const diameter=between(rng,range[0],range[1]);
  const radius=Math.max(.25,fieldToPixels(diameter,fieldWidth,w)/2);
  const x=rng()*w,y=rng()*h;
  const aggregate=index%11===0;
  if(aggregate){
   const cloud=context.createRadialGradient(x,y,0,x,y,Math.max(2,radius*5));
   cloud.addColorStop(0,'rgba(190,197,180,.22)');cloud.addColorStop(1,'rgba(190,197,180,0)');
   context.fillStyle=cloud;context.beginPath();context.arc(x,y,Math.max(2,radius*5),0,Math.PI*2);context.fill();
  }
  context.beginPath();context.arc(x,y,Math.max(.35,radius),0,Math.PI*2);
  context.fillStyle='rgba(229,234,220,'+between(rng,.16,.54)+')';context.fill();
  context.strokeStyle='rgba(90,111,104,'+between(rng,.12,.32)+')';context.lineWidth=.55;context.stroke();
 }
}
function drawOpticalEmulsion(context,w,h,fieldWidth,rng){
 const range=sample.physicalSizeRangeNm||[2000,18000];
 for(let index=0;index<130;index++){
  const diameter=between(rng,range[0],range[1]),radius=Math.max(.7,fieldToPixels(diameter,fieldWidth,w)/2);
  const x=rng()*w,y=rng()*h;
  const gradient=context.createRadialGradient(x-radius*.28,y-radius*.34,Math.max(.3,radius*.04),x,y,radius);
  gradient.addColorStop(0,'rgba(255,255,255,.78)');
  gradient.addColorStop(.44,'rgba(225,242,231,.32)');
  gradient.addColorStop(.82,'rgba(114,164,156,.13)');
  gradient.addColorStop(.95,'rgba(51,99,95,.31)');
  gradient.addColorStop(1,'rgba(248,255,250,.62)');
  context.beginPath();context.arc(x,y,radius,0,Math.PI*2);context.fillStyle=gradient;context.fill();
  context.strokeStyle='rgba(49,95,91,.36)';context.lineWidth=Math.max(.65,radius*.025);context.stroke();
  context.beginPath();context.arc(x-radius*.23,y-radius*.24,Math.max(.4,radius*.18),0,Math.PI*2);context.fillStyle='rgba(255,255,255,.35)';context.fill();
 }
}
function drawOpticalFibres(context,w,h,fieldWidth,rng){
 const range=sample.physicalSizeRangeNm||[8000,30000];
 for(let index=0;index<34;index++){
  const width=fieldToPixels(between(rng,range[0],range[1]),fieldWidth,w);
  const x=rng()*w,y=rng()*h;
  const length=fieldToPixels(between(rng,180000,850000),fieldWidth,w);
  const bend=between(rng,-.24,.24)*length;
  context.beginPath();context.moveTo(x-length*.5,y);
  context.bezierCurveTo(x-length*.22,y+bend,x+length*.18,y-bend*.85,x+length*.5,y+bend*.32);
  context.strokeStyle=index%4?'rgba(225,217,187,.73)':'rgba(97,121,105,.79)';
  context.lineWidth=Math.max(.5,width);context.lineCap='round';context.stroke();
  context.beginPath();context.moveTo(x-length*.5,y-width*.22);
  context.bezierCurveTo(x-length*.22,y+bend-width*.22,x+length*.18,y-bend*.85-width*.22,x+length*.5,y+bend*.32-width*.22);
  context.strokeStyle='rgba(255,250,226,.56)';context.lineWidth=Math.max(.45,width*.13);context.stroke();
 }
}
function drawOpticalPowder(context,w,h,fieldWidth,rng){
 const range=sample.physicalSizeRangeNm||[5000,120000];
 for(let index=0;index<170;index++){
  const diameter=between(rng,range[0],range[1]),size=Math.max(.35,fieldToPixels(diameter,fieldWidth,w));
  const x=rng()*w,y=rng()*h,rx=size*between(rng,.35,.7),ry=size*between(rng,.25,.6);
  context.save();context.translate(x,y);context.rotate(rng()*Math.PI);
  context.beginPath();context.ellipse(0,0,Math.max(.4,rx),Math.max(.4,ry),0,0,Math.PI*2);
  context.fillStyle=index%4?'rgba(212,216,202,.72)':'rgba(96,111,103,.65)';context.fill();
  context.strokeStyle='rgba(45,61,58,.32)';context.lineWidth=.7;context.stroke();context.restore();
 }
}
function drawOptical(context,w,h,fieldWidth,rng,metrics){
 const background=context.createLinearGradient(0,0,w,h);
 const level=Number(gain.value)/100;
 background.addColorStop(0,'rgb('+Math.round(232*level)+','+Math.round(241*level)+','+Math.round(233*level)+')');
 background.addColorStop(1,'rgb('+Math.round(193*level)+','+Math.round(211*level)+','+Math.round(204*level)+')');
 context.fillStyle=background;context.fillRect(0,0,w,h);
 for(let index=0;index<1800;index++){
  const shade=between(rng,0,1)*.11;
  context.fillStyle='rgba(39,66,58,'+shade+')';context.fillRect(rng()*w,rng()*h,.7,.7);
 }
 const defocus=getOpticalDefocusBlurPx(objective,Number(focus.value),w);
 context.save();context.filter='blur('+defocus.toFixed(2)+'px) contrast('+(95+Number(focus.value)*.12)+'%)';
 if(sample.shape==='cube'||sample.shape==='prism'||sample.shape==='needle'||sample.shape==='plate')drawOpticalCrystals(context,w,h,fieldWidth,rng);
 else if(sample.shape==='particle')drawOpticalPrecipitate(context,w,h,fieldWidth,rng);
 else if(sample.shape==='droplet')drawOpticalEmulsion(context,w,h,fieldWidth,rng);
 else if(sample.shape==='fibre')drawOpticalFibres(context,w,h,fieldWidth,rng);
 else drawOpticalPowder(context,w,h,fieldWidth,rng);
 context.restore();
 context.fillStyle='rgba(248,252,248,.045)';context.fillRect(0,0,w,h);
 return {blurPx:defocus,metrics};
}
function drawSEMParticle(context,x,y,diameter,shade,rng){
 const radius=Math.max(.45,diameter/2),gradient=context.createRadialGradient(x-radius*.34,y-radius*.38,Math.max(.2,radius*.025),x,y,radius);
 const base=shade;
 gradient.addColorStop(0,'rgb('+Math.min(255,base+72)+','+Math.min(255,base+72)+','+Math.min(255,base+72)+')');
 gradient.addColorStop(.58,'rgb('+base+','+base+','+base+')');
 gradient.addColorStop(.88,'rgb('+Math.max(0,base-42)+','+Math.max(0,base-42)+','+Math.max(0,base-42)+')');
 gradient.addColorStop(1,'rgb('+Math.max(0,base-82)+','+Math.max(0,base-82)+','+Math.max(0,base-82)+')');
 context.beginPath();context.arc(x,y,radius,0,Math.PI*2);context.fillStyle=gradient;context.fill();
 context.strokeStyle='rgba(235,240,237,.72)';context.lineWidth=Math.max(.55,radius*.045);context.stroke();
 if(radius>4){context.beginPath();context.arc(x-radius*.08,y-radius*.04,radius*.72,-.8,.65);context.strokeStyle='rgba(17,23,27,.22)';context.lineWidth=1;context.stroke()}
 if(rng()>.78&&radius>2){context.beginPath();context.arc(x+radius*.26,y-radius*.2,radius*.12,0,Math.PI*2);context.fillStyle='rgba(10,15,17,.42)';context.fill()}
}
function drawSEM(context,w,h,fieldWidth,rng){
 const bg=context.createLinearGradient(w*.2,0,w*.8,h);
 bg.addColorStop(0,'#8b9290');bg.addColorStop(.45,'#555e60');bg.addColorStop(1,'#252d31');
 context.fillStyle=bg;context.fillRect(0,0,w,h);
 const range=sample.physicalSizeRangeNm||[10000,80000];
 if(sample.shape==='tube'){
  for(let index=0;index<75;index++){
   const length=fieldToPixels(between(rng,250000,1800000),fieldWidth,w),diameter=fieldToPixels(between(rng,range[0],range[1]),fieldWidth,w);
   const x=rng()*w,y=rng()*h,angle=rng()*Math.PI;
   context.save();context.translate(x,y);context.rotate(angle);
   context.lineCap='round';context.strokeStyle='rgba(14,20,23,.9)';context.lineWidth=Math.max(.55,diameter);context.beginPath();context.moveTo(-length/2,0);context.quadraticCurveTo(0,between(rng,-8,8),length/2,0);context.stroke();
   context.strokeStyle='rgba(225,230,228,.83)';context.lineWidth=Math.max(.35,diameter*.18);context.beginPath();context.moveTo(-length/2, -Math.max(.5,diameter*.22));context.lineTo(length/2,-Math.max(.5,diameter*.22));context.stroke();
   context.restore();
  }
 }else if(sample.shape==='sheet'){
  for(let index=0;index<17;index++){
   const x=rng()*w,y=rng()*h,size=fieldToPixels(between(rng,250000,1800000),fieldWidth,w);
   context.save();context.translate(x,y);context.rotate(rng()*Math.PI);
   context.beginPath();context.moveTo(-size,-size*.18);context.lineTo(-size*.48,-size*.62);context.lineTo(size*.84,-size*.38);context.lineTo(size,size*.22);context.lineTo(size*.13,size*.6);context.lineTo(-size*.72,size*.42);context.closePath();
   context.fillStyle='rgba(18,24,27,.34)';context.fill();context.strokeStyle='rgba(236,240,237,.65)';context.lineWidth=Math.max(.7,size*.012);context.stroke();context.restore();
  }
 }else if(sample.shape==='porous'){
  for(let index=0;index<360;index++){
   const size=fieldToPixels(between(rng,range[0],range[1]),fieldWidth,w),x=rng()*w,y=rng()*h,radius=Math.max(.5,size/2);
   context.beginPath();context.arc(x,y,radius*between(rng,.65,1.45),0,Math.PI*2);
   context.fillStyle=index%4?'rgba(18,23,25,.9)':'rgba(169,178,173,.68)';context.fill();
   context.strokeStyle='rgba(233,238,234,.38)';context.lineWidth=.75;context.stroke();
  }
 }else{
  const count=sample.shape==='sphere'?220:170;
  for(let index=0;index<count;index++){
   const size=fieldToPixels(between(rng,range[0],range[1]),fieldWidth,w);
   drawSEMParticle(context,rng()*w,rng()*h,size,Math.round(between(rng,74,174)),rng);
  }
 }
 const scanNoise=context.createLinearGradient(0,0,0,h);
 scanNoise.addColorStop(0,'rgba(255,255,255,.025)');scanNoise.addColorStop(1,'rgba(0,0,0,.065)');
 context.fillStyle=scanNoise;context.fillRect(0,0,w,h);
 for(let y=0;y<h;y+=3){context.fillStyle='rgba(0,0,0,.025)';context.fillRect(0,y,w,1)}
}
function drawTEMParticle(context,x,y,diameter,rng){
 const radius=Math.max(.4,diameter/2);
 const gradient=context.createRadialGradient(x-radius*.15,y-radius*.15,Math.max(.1,radius*.03),x,y,radius);
 gradient.addColorStop(0,'rgba(31,37,39,.64)');gradient.addColorStop(.65,'rgba(61,68,69,.86)');gradient.addColorStop(1,'rgba(14,20,23,.96)');
 context.beginPath();context.arc(x,y,radius,0,Math.PI*2);context.fillStyle=gradient;context.fill();
 if(radius>5){
  for(let fringe=1;fringe<=Math.min(3,Math.floor(radius/8));fringe++){
   context.beginPath();context.arc(x,y,radius*(.55+fringe*.12),0,Math.PI*2);
   context.strokeStyle='rgba(236,240,237,'+(0.13/fringe)+')';context.lineWidth=.75;context.stroke();
  }
 }
 context.strokeStyle='rgba(248,249,245,.32)';context.lineWidth=.65;context.stroke();
}
function drawTEM(context,w,h,fieldWidth,rng){
 const background=context.createLinearGradient(0,0,w,h);background.addColorStop(0,'#d9ddda');background.addColorStop(.5,'#aeb6b4');background.addColorStop(1,'#e1e4e0');
 context.fillStyle=background;context.fillRect(0,0,w,h);
 for(let index=0;index<3300;index++){
  const tone=Math.round(between(rng,82,145));context.fillStyle='rgba('+tone+','+tone+','+tone+','+between(rng,.018,.07)+')';context.fillRect(rng()*w,rng()*h,between(rng,.5,1.8),between(rng,.5,1.8));
 }
 const range=sample.physicalSizeRangeNm||[12000,80000];
 if(sample.shape==='tube'){
  for(let index=0;index<62;index++){
   const diameter=fieldToPixels(between(rng,range[0],range[1]),fieldWidth,w),length=fieldToPixels(between(rng,180000,1200000),fieldWidth,w);
   const x=rng()*w,y=rng()*h;context.save();context.translate(x,y);context.rotate(rng()*Math.PI);
   context.beginPath();context.ellipse(0,0,Math.max(1,length/2),Math.max(.5,diameter/2),0,0,Math.PI*2);
   context.strokeStyle='rgba(28,36,39,.9)';context.lineWidth=Math.max(.8,diameter*.32);context.stroke();
   context.beginPath();context.ellipse(0,0,Math.max(1,length/2),Math.max(.5,diameter/2),0,0,Math.PI*2);context.strokeStyle='rgba(245,247,244,.55)';context.lineWidth=.65;context.stroke();
   context.restore();
  }
 }else if(sample.shape==='sheet'){
  for(let index=0;index<12;index++){
   const x=rng()*w,y=rng()*h,size=fieldToPixels(between(rng,150000,900000),fieldWidth,w);
   context.save();context.translate(x,y);context.rotate(rng()*Math.PI);context.beginPath();context.moveTo(-size,-size*.15);context.lineTo(-size*.4,-size*.6);context.lineTo(size,.0);context.lineTo(size*.3,size*.4);context.lineTo(-size*.6,size*.5);context.closePath();
   context.fillStyle='rgba(35,42,44,.25)';context.fill();context.strokeStyle='rgba(22,29,31,.7)';context.lineWidth=1;context.stroke();context.restore();
  }
 }else{
  for(let index=0;index<150;index++){
   const diameter=fieldToPixels(between(rng,range[0],range[1]),fieldWidth,w);
   drawTEMParticle(context,rng()*w,rng()*h,diameter,rng);
  }
 }
}
const AFM_STOPS=[[16,43,70],[19,124,141],[217,132,66],[250,225,145]];
function afmColour(value){
 const scaled=clamp(value,0,.9999)*3,index=Math.floor(scaled),fraction=scaled-index,a=AFM_STOPS[index],b=AFM_STOPS[index+1];
 return [Math.round(mix(a[0],b[0],fraction)),Math.round(mix(a[1],b[1],fraction)),Math.round(mix(a[2],b[2],fraction))];
}
function createTopographyFeatures(rng,w,h){
 const features=[],count=sample.shape==='porous'?38:sample.shape==='fibre'?12:sample.shape==='sheet'?17:28;
 for(let index=0;index<count;index++){
  const x=between(rng,-.08*w,1.08*w),y=between(rng,-.08*h,1.08*h);
  const radius=between(rng,Math.min(w,h)*.018,Math.min(w,h)*.09);
  features.push({
   x,y,rx:sample.shape==='fibre'?radius*between(rng,2,5):radius,
   ry:sample.shape==='fibre'?radius*between(rng,.14,.3):radius*between(rng,.55,1.15),
   angle:between(rng,-Math.PI,Math.PI),
   height:sample.shape==='porous'?between(rng,-.8,.8):sample.shape==='fibre'?between(rng,.3,1.2):sample.shape==='sheet'?between(rng,.3,1.0):between(rng,.2,1)
  });
 }
 return features;
}
function sampleHeight(x,y,features){
 let height=0;
 for(const feature of features){
  const dx=x-feature.x,dy=y-feature.y,cos=Math.cos(feature.angle),sin=Math.sin(feature.angle);
  const localX=(dx*cos+dy*sin)/feature.rx,localY=(-dx*sin+dy*cos)/feature.ry;
  const radius=localX*localX+localY*localY;
  if(radius<8)height+=feature.height*Math.exp(-radius*1.8);
 }
 if(sample.shape==='sheet'){
  height+=.13*Math.sin(x*.045)+.06*Math.sin((x+y)*.028);
 }
 if(sample.shape==='porous'){
  height+=.035*Math.sin(x*.19)*Math.cos(y*.17);
 }
 return height;
}
function drawAFM(context,w,h,rng){
 const rasterWidth=240,rasterHeight=Math.max(120,Math.round(rasterWidth*h/w));
 const image=context.createImageData(rasterWidth,rasterHeight);
 const features=createTopographyFeatures(rng,rasterWidth,rasterHeight);
 const heights=new Float32Array(rasterWidth*rasterHeight);
 let min=Infinity,max=-Infinity;
 for(let y=0;y<rasterHeight;y++)for(let x=0;x<rasterWidth;x++){
  const value=sampleHeight(x,y,features);heights[y*rasterWidth+x]=value;min=Math.min(min,value);max=Math.max(max,value);
 }
 const span=Math.max(.001,max-min);
 for(let y=0;y<rasterHeight;y++)for(let x=0;x<rasterWidth;x++){
  const index=y*rasterWidth+x,value=(heights[index]-min)/span;
  const left=heights[y*rasterWidth+Math.max(0,x-1)],right=heights[y*rasterWidth+Math.min(rasterWidth-1,x+1)];
  const up=heights[Math.max(0,y-1)*rasterWidth+x],down=heights[Math.min(rasterHeight-1,y+1)*rasterWidth+x];
  const nx=-(right-left)*2,ny=-(down-up)*2,nz=1,norm=Math.hypot(nx,ny,nz),shade=clamp((nx*.34+ny*-.42+nz*.86)/norm,.55,1.18);
  const rgb=afmColour(value),offset=index*4;
  image.data[offset]=Math.round(clamp(rgb[0]*shade,0,255));
  image.data[offset+1]=Math.round(clamp(rgb[1]*shade,0,255));
  image.data[offset+2]=Math.round(clamp(rgb[2]*shade,0,255));
  image.data[offset+3]=255;
 }
 const offscreen=document.createElement('canvas');offscreen.width=rasterWidth;offscreen.height=rasterHeight;
 offscreen.getContext('2d').putImageData(image,0,0);
 context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(offscreen,0,0,w,h);
 context.strokeStyle='rgba(230,246,238,.12)';context.lineWidth=.6;
 for(let x=0;x<w;x+=w/12){context.beginPath();context.moveTo(x,0);context.lineTo(x,h);context.stroke()}
 for(let y=0;y<h;y+=h/10){context.beginPath();context.moveTo(0,y);context.lineTo(w,y);context.stroke()}
 return {heightRange:span};
}
function drawSTM(context,w,h,fieldWidth,rng){
 const bg=context.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#1b1820');bg.addColorStop(.48,'#342a32');bg.addColorStop(1,'#1a1c27');context.fillStyle=bg;context.fillRect(0,0,w,h);
 const lattice=sample.latticeSpacingNm||.246;
 const spacingPx=w*lattice/fieldWidth,verticalSpacing=spacingPx*Math.sqrt(3)/2;
 const kappa=10.246*Math.sqrt(4.5),jitterX=spacingPx*.018,jitterY=verticalSpacing*.018;
 for(let row=-1;row<h/verticalSpacing+2;row++){
  for(let column=-1;column<w/spacingPx+2;column++){
   const x=column*spacingPx+(row%2)*spacingPx*.5+(rng()-.5)*jitterX;
   const y=row*verticalSpacing+(rng()-.5)*jitterY;
   const dz=between(rng,-.012,.012),current=getTunnellingCurrentRelative(dz,4.5)||0;
   const radius=Math.max(1,spacingPx*.48),strength=clamp(current*.74,.12,1);
   const glow=context.createRadialGradient(x,y,0,x,y,radius);
   glow.addColorStop(0,'rgba(255,235,181,'+(strength*.98)+')');
   glow.addColorStop(.2,'rgba(240,167,101,'+(strength*.82)+')');
   glow.addColorStop(.52,'rgba(151,83,72,'+(strength*.4)+')');
   glow.addColorStop(1,'rgba(44,29,42,0)');
   context.fillStyle=glow;context.beginPath();context.arc(x,y,radius,0,Math.PI*2);context.fill();
  }
 }
 context.strokeStyle='rgba(244,208,159,.18)';context.lineWidth=.6;
 for(let y=0;y<h;y+=Math.max(6,verticalSpacing)){context.beginPath();context.moveTo(0,y);context.lineTo(w,y);context.stroke()}
 context.fillStyle='rgba(255,238,201,.74)';context.font='600 9px "Space Grotesk"';context.fillText('GRAPHITE SURFACE / a = 0.246 nm',16,h-18);
}
function drawScaleBar(context,w,h,fieldWidthNm){
 const calibration=getPhysicalScaleBar(fieldWidthNm,w),barWidth=calibration.widthPx;
 const x=w-barWidth-27,y=h-31;
 context.fillStyle='rgba(4,10,15,.82)';rounded(context,x-10,y-23,barWidth+20,36,5);context.fill();
 context.fillStyle='#fff';context.fillRect(x,y,barWidth,2.5);
 context.fillRect(x,y-3,2,8);context.fillRect(x+barWidth-2,y-3,2,8);
 context.font='600 10px "Space Grotesk"';context.textAlign='center';context.fillText(calibration.label,x+barWidth/2,y-8);
}
function draw(){
 if(!ctx||!sample)return;
 const width=canvas.clientWidth||900,height=canvas.clientHeight||540,dpr=Math.min(2,window.devicePixelRatio||1);
 const pixelWidth=Math.round(width*dpr),pixelHeight=Math.round(height*dpr);
 if(canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
 const preset=getActivePreset();if(!preset)return;
 const fieldWidthNm=preset.fieldWidthNm;
 const rng=randomFor(sample.id+':'+mode+':'+zoom.value);
 const optical=mode==='light',margin=optical?18:12,cx=width/2,cy=height/2;
 const background=ctx.createLinearGradient(0,0,width,height);
 background.addColorStop(0,'#111d26');background.addColorStop(1,'#050b11');ctx.fillStyle=background;ctx.fillRect(0,0,width,height);
 ctx.save();
 if(optical){ctx.beginPath();ctx.arc(cx,cy,Math.min(width-margin*2,height-margin*2)*.48,0,Math.PI*2);ctx.clip()}
 else{rounded(ctx,margin,margin,width-margin*2,height-margin*2,8);ctx.clip()}
 const gainPercent=Number(gain.value)/100;
 if(optical){
  const metrics=getOpticalMetrics(objective);
  drawOptical(ctx,width,height,fieldWidthNm,rng,metrics);
  ctx.filter='brightness('+gainPercent.toFixed(2)+')';
 }else if(mode==='sem'){
  drawSEM(ctx,width,height,fieldWidthNm,rng);
  ctx.filter='brightness('+gainPercent.toFixed(2)+') contrast('+(90+Number(focus.value)*.12)+'%)';
 }else if(mode==='tem'){
  drawTEM(ctx,width,height,fieldWidthNm,rng);
  ctx.filter='brightness('+gainPercent.toFixed(2)+') contrast('+(94+Number(focus.value)*.08)+'%)';
 }else if(mode==='afm'){
  drawAFM(ctx,width,height,rng);
  ctx.filter='brightness('+gainPercent.toFixed(2)+') contrast('+(95+Number(focus.value)*.08)+'%)';
 }else{
  drawSTM(ctx,width,height,fieldWidthNm,rng);
  ctx.filter='brightness('+gainPercent.toFixed(2)+') contrast('+(94+Number(focus.value)*.08)+'%)';
 }
 ctx.restore();
 if(optical){
  const radius=Math.min(width-margin*2,height-margin*2)*.48;
  const vignette=ctx.createRadialGradient(cx,cy,radius*.65,cx,cy,radius*1.04);
  vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(1,'rgba(0,0,0,.82)');
  ctx.fillStyle=vignette;ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(222,248,239,.7)';ctx.lineWidth=2;ctx.stroke();
 }else{
  ctx.strokeStyle='rgba(199,231,222,.28)';rounded(ctx,margin,margin,width-margin*2,height-margin*2,8);ctx.stroke();
 }
 ctx.fillStyle=optical?'rgba(20,44,43,.78)':'rgba(237,247,243,.76)';
 ctx.font='700 10px "Space Grotesk"';ctx.textAlign='left';
 ctx.fillText(mode.toUpperCase()+' / '+sample.category,16,25);
 ctx.font='600 8px "Space Grotesk"';ctx.fillText('CHEMVERSE · SYNTHETIC SCIENTIFIC MODEL',16,41);
 if(mode==='afm'||mode==='stm'){
  ctx.fillStyle='rgba(245,235,196,.9)';
  ctx.fillText(mode==='afm'?'SURFACE HEIGHT / FALSE COLOUR':'TUNNELLING-CURRENT MAP',16,57);
 }
 drawScaleBar(ctx,width,height,fieldWidthNm);
}
function updateDetails(){
 const preset=getActivePreset(),method=getMicroscopeMode(mode);
 if(!preset||!method)return;
 const total=mode==='light'?preset.metrics.totalMagnification:preset.label;
 document.getElementById('mode-status').textContent=mode==='light'?'OPTICAL / BRIGHTFIELD':mode==='sem'?'SCANNING ELECTRON / SURFACE':mode==='tem'?'TRANSMISSION ELECTRON / MASS-THICKNESS':mode==='afm'?'ATOMIC FORCE / HEIGHT TOPOGRAPHY':'SCANNING TUNNELLING / CURRENT';
 document.getElementById('viewport-mode').textContent=method.name.toUpperCase();
 document.getElementById('method-name').textContent=method.name.toUpperCase();
 document.getElementById('method-resolution').textContent=method.resolution;
 document.getElementById('method-principle').textContent=method.principle;
 document.getElementById('method-limitation').textContent=method.limitation;
 document.getElementById('viewer-title').textContent=sample.name;
 document.getElementById('viewport-sample').textContent=sample.formula+' · '+sample.category;
 document.getElementById('specimen-category').textContent=sample.category;
 document.getElementById('specimen-name').textContent=sample.name;
 document.getElementById('specimen-formula').textContent=sample.formula;
 document.getElementById('specimen-observation').textContent=sample.observation;
 document.getElementById('specimen-preparation').textContent=sample.preparation;
 document.getElementById('zoom-value').textContent=mode==='light'?total.toLocaleString('en-US')+'× total':preset.label;
 document.getElementById('focus-value').textContent=focus.value+'%';
 document.getElementById('light-value').textContent=gain.value+'%';
 document.getElementById('viewport-scale').textContent=getPhysicalScaleBar(preset.fieldWidthNm,1000).label;
 const optics=document.getElementById('optics-readout');
 const objectiveLine=document.getElementById('optics-objective');
 const resolutionLine=document.getElementById('optics-resolution');
 const fieldLine=document.getElementById('optics-field');
 const workingLine=document.getElementById('optics-working-distance');
 if(optics&&objectiveLine&&resolutionLine&&fieldLine&&workingLine){
  optics.hidden=false;
  if(mode==='light'){
   const m=preset.metrics;
   objectiveLine.textContent=m.objective.magnification+'× objective · NA '+m.numericalAperture.toFixed(2)+' · 10× eyepiece';
   resolutionLine.textContent='Abbe limit '+m.abbeResolutionLabel+' at 550 nm';
   fieldLine.textContent='Field '+m.fieldWidthLabel+' · FN 18';
   workingLine.textContent='Working distance '+m.workingDistanceMm+' mm'+(m.immersion==='oil'?' · oil immersion':' · dry');
  }else{
   objectiveLine.textContent=mode.toUpperCase()+' · '+(mode==='sem'?'surface secondary-electron contrast':mode==='tem'?'transmission mass-thickness contrast':mode==='afm'?'probe topography':'tunnelling-current contrast');
   resolutionLine.textContent=mode==='stm'?'Graphite lattice constant 0.246 nm':mode==='afm'?'Height map · relative z contrast':'Synthetic contrast model · not measured resolution';
   fieldLine.textContent='Calibrated scan width '+preset.label;
   workingLine.textContent='Field '+formatNumber(preset.fieldWidthNm)+' nm';
  }
 }
 const zoomLabel=document.querySelector('label[for="zoom-control"]');
 const focusLabel=document.querySelector('label[for="focus-control"]');
 const gainLabel=document.querySelector('label[for="light-control"]');
 if(zoomLabel)zoomLabel.textContent=mode==='light'?'OBJECTIVE / TOTAL MAGNIFICATION':'SCAN FIELD / WIDTH';
 if(focusLabel)focusLabel.textContent=mode==='light'?'FOCUS / DEFOCUS':'FOCUS / STIGMATION';
 if(gainLabel)gainLabel.textContent=mode==='light'?'ILLUMINATION INTENSITY':mode==='afm'?'HEIGHT DISPLAY RANGE':mode==='stm'?'CURRENT DISPLAY GAIN':'DETECTOR GAIN';
}
function renderPreparation(){
 const plan=getSlidePreparationPlan(sample.id),progress=getSlidePreparationProgress(slideState),container=document.getElementById('prep-steps');
 if(!container)return;
 container.replaceChildren();
 plan.forEach((step,index)=>{
  const complete=index<progress.completed,active=index===progress.completed,button=document.createElement('button');
  button.type='button';button.className='prep-step'+(complete?' is-complete':'')+(active?' is-next':'');
  button.disabled=!active||mode!=='light';
  const number=document.createElement('span');number.className='prep-step-index';number.textContent=complete?'✓':String(index+1).padStart(2,'0');
  const copy=document.createElement('span');copy.className='prep-step-copy';
  const title=document.createElement('b');title.textContent=step.title;const detail=document.createElement('small');detail.textContent=step.detail;copy.append(title,detail);
  const action=document.createElement('span');action.className='prep-step-action';action.textContent=complete?'DONE':active?(mode==='light'?step.action:'OPTICAL ONLY'):'LOCKED';
  button.append(number,copy,action);
  button.addEventListener('click',()=>{
   const result=completeSlidePreparationStep(slideState,step.id);if(!result.accepted)return;
   slideState=result.state;renderPreparation();instrument?.setPreparationState(slideState);
  });
  container.append(button);
 });
 const progressLabel=document.getElementById('prep-progress-label'),percentLabel=document.getElementById('prep-progress-percent');
 const bar=document.getElementById('prep-progress-bar'),status=document.getElementById('slide-status'),graphic=document.querySelector('.slide-graphic');
 progressLabel.textContent=progress.completed+' / '+progress.total+' ACTIONS';
 percentLabel.textContent=progress.percent+'%';bar.style.width=progress.percent+'%';
 status.textContent=progress.mounted?'SLIDE MOUNTED':progress.completed?'PREPARATION IN PROGRESS':'SLIDE EMPTY';
 status.classList.toggle('is-ready',progress.mounted);
 graphic.classList.toggle('is-loaded',slideState.completed.includes('transfer-specimen'));
 graphic.classList.toggle('is-covered',slideState.completed.includes('apply-coverslip'));
 document.getElementById('tray-sample-name').textContent=sample.name;
 document.getElementById('tray-sample-type').textContent=sample.category+' / '+sample.formula;
 const eye=document.getElementById('look-through-eyepiece');
 if(eye)eye.disabled=!progress.mounted||mode!=='light';
}
function renderSamples(){
 const items=getMicroscopeSamples(mode);list.replaceChildren();
 document.getElementById('sample-count').textContent=String(items.length).padStart(2,'0')+' SAMPLES';
 items.forEach((item,index)=>{
  const button=document.createElement('button');button.type='button';
  button.className='sample-button'+(item.id===sample.id?' is-active':'');
  button.setAttribute('aria-pressed',String(item.id===sample.id));
  const number=document.createElement('span');number.className='sample-index';number.textContent=String(index+1).padStart(2,'0');
  const copy=document.createElement('span'),title=document.createElement('b'),formula=document.createElement('small');
  title.textContent=item.name;formula.textContent=item.formula;copy.append(title,formula);button.append(number,copy);
  button.addEventListener('click',()=>{
   sample=item;slideState=createSlidePreparationState(sample.id);instrument?.setSample(sample.id);
   renderSamples();updateDetails();renderPreparation();instrument?.setPreparationState(slideState);draw();
  });
  list.append(button);
 });
}
function opticalIndexForObjective(value){return OBJECTIVES.indexOf(Number(value))+1}
function setObjectiveFromControl(value){
 const target=OBJECTIVES[Number(value)-1];if(!target)return;
 if(target===100&&(!instrument?.getState()?.oilApplied||!instrument?.getState()?.mounted)){
  const current=instrument?.getState()?.objective||objective;
  zoom.value=String(opticalIndexForObjective(current));updateDetails();draw();return;
 }
 const changed=instrument?.setObjective(target);
 if(changed===false){zoom.value=String(opticalIndexForObjective(instrument?.getState()?.objective||objective))}
 objective=instrument?.getState()?.objective||target;
 updateDetails();draw();
}
function setMode(id){
 if(!getMicroscopeMode(id))return;
 mode=id;
 buttons.forEach(button=>{
  const active=button.dataset.mode===id;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));
 });
 const available=getMicroscopeSamples(id);
 if(!available.some(item=>item.id===sample.id))sample=available[0];
 zoom.min='1';zoom.max=String(MICROSCOPE_ZOOM_PRESETS[id].length);
 zoom.value=String(Math.min(2,MICROSCOPE_ZOOM_PRESETS[id].length));scanValue=Number(zoom.value);
 renderSamples();updateDetails();instrument?.setMode(mode);renderPreparation();draw();
}
buttons.forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
zoom.addEventListener('input',()=>{
 if(mode==='light'){setObjectiveFromControl(Number(zoom.value));return}
 scanValue=Number(zoom.value);updateDetails();draw();
});
[focus,gain].forEach(input=>input.addEventListener('input',()=>{updateDetails();draw()}));
if(typeof ResizeObserver==='function'){
 const observer=new ResizeObserver(draw);observer.observe(viewport);window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}else window.addEventListener('resize',draw,{passive:true});
instrument=createMicroscopeInstrument({
 canvas:document.getElementById('instrument-canvas'),
 onObjectiveChange(value){objective=value;zoom.value=String(opticalIndexForObjective(value));updateDetails();draw()},
 onFineFocusChange(value){focus.value=String(value);updateDetails();draw()},
 onLampChange(value){gain.value=String(Math.round(35+(value/100)*105));updateDetails();draw()},
 onEyepieceViewChange(active){viewport.classList.toggle('is-eyepiece',active)},
 onImmersionOilChange(){updateDetails();draw()}
});
document.getElementById('reset-slide')?.addEventListener('click',()=>{
 slideState=createSlidePreparationState(sample.id);renderPreparation();instrument?.setPreparationState(slideState);
});
focus.addEventListener('input',()=>instrument?.setFineFocus(Number(focus.value)));
gain.addEventListener('input',()=>instrument?.setLamp(Math.round(((Number(gain.value)-35)/105)*100)));
instrument.setSample(sample.id);instrument.setMode(mode);
instrument.setFineFocus(Number(focus.value));instrument.setLamp(Math.round(((Number(gain.value)-35)/105)*100));
renderSamples();updateDetails();renderPreparation();instrument.setPreparationState(slideState);draw();
