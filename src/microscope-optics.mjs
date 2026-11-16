export const EYEPIECE_MAGNIFICATION = 10;
export const FIELD_NUMBER_MM = 18;
export const ILLUMINATION_WAVELENGTH_NM = 550;
export const OIL_REFRACTIVE_INDEX = 1.515;

export const OBJECTIVE_LENSES = Object.freeze([
 Object.freeze({magnification:4,numericalAperture:.10,workingDistanceMm:17.5,immersion:'dry',colour:'#d94b43',resolutionLabel:'2.75 µm Abbe limit',barrelLength:.34}),
 Object.freeze({magnification:10,numericalAperture:.25,workingDistanceMm:7,immersion:'dry',colour:'#dfc23b',resolutionLabel:'1.10 µm Abbe limit',barrelLength:.34}),
 Object.freeze({magnification:40,numericalAperture:.65,workingDistanceMm:.60,immersion:'dry',colour:'#4786d2',resolutionLabel:'423 nm Abbe limit',barrelLength:.43}),
 Object.freeze({magnification:100,numericalAperture:1.25,workingDistanceMm:.13,immersion:'oil',colour:'#e8e8df',resolutionLabel:'220 nm Abbe limit',barrelLength:.53})
]);

const NICE_FACTORS=[1,2,5];
function formatLength(nm){
 if(nm>=1e6)return (nm/1e6).toLocaleString('en-US',{maximumFractionDigits:2})+' mm';
 if(nm>=1000)return (nm/1000).toLocaleString('en-US',{maximumFractionDigits:2})+' µm';
 if(nm>=1)return nm.toLocaleString('en-US',{maximumFractionDigits:2})+' nm';
 return (nm*1000).toLocaleString('en-US',{maximumFractionDigits:2})+' pm';
}
function niceScaleLength(targetNm){
 if(!Number.isFinite(targetNm)||targetNm<=0)return 0;
 const exponent=Math.floor(Math.log10(targetNm));
 const power=10**exponent;
 for(let i=NICE_FACTORS.length-1;i>=0;i--){
  const candidate=NICE_FACTORS[i]*power;
  if(candidate<=targetNm)return candidate;
 }
 return power/2;
}
export function getOpticalObjective(magnification){
 return OBJECTIVE_LENSES.find(item=>item.magnification===Number(magnification))||null;
}
export function getOpticalMetrics(magnification,eyepiece=EYEPIECE_MAGNIFICATION){
 const objective=getOpticalObjective(magnification);
 if(!objective||!Number.isFinite(eyepiece)||eyepiece<=0)return null;
 const fieldWidthNm=(FIELD_NUMBER_MM/objective.magnification)*1e6;
 const abbeResolutionNm=ILLUMINATION_WAVELENGTH_NM/(2*objective.numericalAperture);
 const rayleighResolutionNm=.61*ILLUMINATION_WAVELENGTH_NM/objective.numericalAperture;
 return Object.freeze({
  objective,eyepieceMagnification:eyepiece,
  totalMagnification:objective.magnification*eyepiece,
  fieldNumberMm:FIELD_NUMBER_MM,fieldWidthNm,
  fieldWidthLabel:formatLength(fieldWidthNm),
  wavelengthNm:ILLUMINATION_WAVELENGTH_NM,
  numericalAperture:objective.numericalAperture,
  abbeResolutionNm,rayleighResolutionNm,
  abbeResolutionLabel:formatLength(abbeResolutionNm),
  workingDistanceMm:objective.workingDistanceMm,
  immersion:objective.immersion,
  scaleBarNm:niceScaleLength(fieldWidthNm*.20)
 });
}

const SCAN_PRESETS=Object.freeze({
 sem:Object.freeze([20000,10000,5000,2000,1000].map((field,index)=>Object.freeze({
  value:index+1,fieldWidthNm:field,label:formatLength(field)+' scan',scale:formatLength(niceScaleLength(field*.2))
 }))),
 tem:Object.freeze([2000,1000,500,200,100].map((field,index)=>Object.freeze({
  value:index+1,fieldWidthNm:field,label:formatLength(field)+' field',scale:formatLength(niceScaleLength(field*.2))
 }))),
 afm:Object.freeze([20000,10000,5000,1000,500].map((field,index)=>Object.freeze({
  value:index+1,fieldWidthNm:field,label:formatLength(field)+' scan',scale:formatLength(niceScaleLength(field*.2))
 }))),
 stm:Object.freeze([20,10,5,2,1].map((field,index)=>Object.freeze({
  value:index+1,fieldWidthNm:field,label:formatLength(field)+' scan',scale:formatLength(niceScaleLength(field*.2))
 })))
});
export function getImagingPreset(mode,value,objective=10){
 if(mode==='light'){
  const metrics=getOpticalMetrics(objective);
  return metrics&&Number(value)>=1?Object.freeze({
   value:Number(value),label:metrics.totalMagnification.toLocaleString('en-US')+'× total',
   scale:formatLength(metrics.scaleBarNm),fieldWidthNm:metrics.fieldWidthNm,
   fieldWidthLabel:metrics.fieldWidthLabel,metrics
  }):null;
 }
 return SCAN_PRESETS[mode]?.find(preset=>preset.value===Number(value))||null;
}
export function getPhysicalScaleBar(fieldWidthNm,canvasWidthPx){
 const lengthNm=niceScaleLength(fieldWidthNm*.20);
 return Object.freeze({
  lengthNm,label:formatLength(lengthNm),
  widthPx:canvasWidthPx*lengthNm/fieldWidthNm
 });
}
export function getOpticalDefocusBlurPx(magnification,focusValue,canvasWidthPx){
 const metrics=getOpticalMetrics(magnification);
 if(!metrics)return 0;
 const focusError=1-Math.max(0,Math.min(100,Number(focusValue)||0))/100;
 const diffractionFloor=canvasWidthPx*metrics.abbeResolutionNm/metrics.fieldWidthNm*.45;
 const defocus=focusError*focusError*5.2*(metrics.numericalAperture/.65);
 return Math.max(.25,diffractionFloor+defocus);
}
export function getTunnellingCurrentRelative(deltaZNm,workFunctionEv=4.5){
 if(!Number.isFinite(deltaZNm)||!Number.isFinite(workFunctionEv)||workFunctionEv<=0)return null;
 const kappaPerNm=10.246* Math.sqrt(workFunctionEv);
 return Math.exp(-2*kappaPerNm*deltaZNm);
}
export function getObjectiveFocusingLimits(magnification){
 const objective=getOpticalObjective(magnification);
 if(!objective)return null;
 return Object.freeze({
  coarseFocusAllowed:objective.magnification<=10,
  requiresImmersionOil:objective.immersion==='oil',
  warning:objective.magnification>=40?'استخدم الضبط الدقيق فقط عند العدسات عالية القوة لتجنب اصطدام العدسة بالشريحة.':null
 });
}
