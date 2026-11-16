const ELEMENT_ATOMIC_NUMBERS=Object.freeze({H:1,C:6,N:7,O:8,Na:11,Cl:17,Ag:47});

const point = values => Object.freeze([...values]);
const mappedAtom = (id,element,start,transition=start,end=start,extra={}) => Object.freeze({
 id,element,atomicNumber:ELEMENT_ATOMIC_NUMBERS[element],
 start:point(start),transition:point(transition),end:point(end),...extra
});
const mappedBond = (a,b,kind,start,transition,end,extra={}) => Object.freeze({
 a,b,kind,start,transition,end,...extra
});

/*
 * Aqueous neutralization model:
 * H3O+ + OH- -> 2H2O; Na+ and Cl- remain spectator ions.
 * Coordinates are explanatory keyframes, not measured molecular geometry.
 */
export const NEUTRALIZATION_ATOMS=Object.freeze([
 mappedAtom(1001,'O',[-1.5,.55,0]),
 mappedAtom(1002,'H',[-1.2,1.25,.3]),
 mappedAtom(1003,'H',[-2.1,.25,.3]),
 mappedAtom(1004,'H',[-1.4,-.25,0],[-.1,-.05,0],[.4,.95,0]),
 mappedAtom(1005,'O',[1.15,0,0],[.45,-.1,0],[1.1,.55,0]),
 mappedAtom(1006,'H',[1.75,-.65,.3],[1.25,-.7,.3],[1.65,1.15,.3]),
 mappedAtom(1007,'Na',[-.15,-1.5,-.4]),
 mappedAtom(1008,'Cl',[.45,-1.7,.4])
]);
export const NEUTRALIZATION_BONDS=Object.freeze([
 mappedBond(0,1,0,1,1,1),mappedBond(0,2,0,1,1,1),
 mappedBond(0,3,0,1,.5,0),mappedBond(4,5,0,1,1,1),
 mappedBond(4,3,0,0,.5,1)
]);

/*
 * Silver chloride precipitation model:
 * 4AgNO3(aq) + 4NaCl(aq) -> 4AgCl(s) + 4NaNO3(aq).
 * The 28 mapped atoms include four Ag+, four Cl-, four Na+ and four
 * nitrate ions (N + 3O each). Na+ and NO3- stay dissolved as spectators.
 *
 * The product coordinates represent a small alternating ionic cluster,
 * not a complete AgCl crystal lattice. A square four-ion face appears as
 * the initial nucleus, then the remaining ions join the finite cluster.
 * Nitrate N-O bonds use an average resonance order of 4/3 in this drawing.
 */
const silverStarts=[
 [-2.45,1.35,-.8],[-2.05,-.65,.9],[-1.45,.95,1.65],[-2.75,-1.05,-1.25]
];
const chlorideStarts=[
 [2.45,1.0,1.2],[2.05,-.9,-1.0],[2.8,-1.25,1.25],[1.85,-1.2,1.5]
];
const productVertices=[
 [-.65,-.2,-.65],[-.65,-.2,.65],[-.65,1.1,-.65],[-.65,1.1,.65],
 [.65,-.2,-.65],[.65,-.2,.65],[.65,1.1,-.65],[.65,1.1,.65]
];
const vertexToAtom=[0,4,5,1,6,2,3,7];
const cubeEdges=[
 [0,1],[0,2],[0,4],[3,1],[3,2],[3,7],
 [5,1],[5,4],[5,7],[6,2],[6,4],[6,7]
];
const agTargetVertices=[0,3,5,6],clTargetVertices=[1,2,4,7];
const interpolatePoint=(a,b,t)=>a.map((value,index)=>value+(b[index]-value)*t);
const nitrateCenters=[
 [-3.55,1.85,-1.45],[-3.55,-1.7,1.45],[3.55,1.8,1.45],[3.55,-1.8,-1.45]
];
const nitrateOffsets=[[0,.68,0],[-.59,-.34,0],[.59,-.34,0]];
const sodiumPositions=[
 [-2.8,.05,2.65],[2.8,.1,-2.65],[-3.2,2.1,1.65],[3.2,-2.1,1.65]
];

const precipitationAtoms=[];
for(let index=0;index<4;index++){
 const target=productVertices[agTargetVertices[index]];
 precipitationAtoms.push(mappedAtom(2001+index,'Ag',silverStarts[index],
  interpolatePoint(silverStarts[index],target,.72),target,
  {ion:'Ag+',formalCharge:1,role:'precipitate-cation'}));
}
for(let index=0;index<4;index++){
 const target=productVertices[clTargetVertices[index]];
 precipitationAtoms.push(mappedAtom(2011+index,'Cl',chlorideStarts[index],
  interpolatePoint(chlorideStarts[index],target,.72),target,
  {ion:'Cl−',formalCharge:-1,role:'precipitate-anion'}));
}
for(let group=0;group<4;group++){
 const center=nitrateCenters[group],nIndex=8+group*4;
 precipitationAtoms.push(mappedAtom(2101+group,'N',center,center,center,
  {ionGroup:'NO3−-'+(group+1),ionGroupCharge:-1,role:'spectator-nitrate'}));
 for(let oxygen=0;oxygen<3;oxygen++){
  const offset=nitrateOffsets[oxygen],position=center.map((value,axis)=>value+offset[axis]);
  precipitationAtoms.push(mappedAtom(2201+group*3+oxygen,'O',position,position,position,
   {ionGroup:'NO3−-'+(group+1),role:'spectator-nitrate'}));
 }
}
for(let index=0;index<4;index++){
 const position=sodiumPositions[index];
 precipitationAtoms.push(mappedAtom(2301+index,'Na',position,position,position,
  {ion:'Na+',formalCharge:1,role:'spectator-cation'}));
}
export const SILVER_CHLORIDE_ATOMS=Object.freeze(precipitationAtoms);

const precipitationBonds=[];
for(let group=0;group<4;group++){
 const nIndex=8+group*4;
 for(let oxygen=1;oxygen<=3;oxygen++){
  precipitationBonds.push(mappedBond(nIndex,nIndex+oxygen,0,4/3,4/3,4/3,{role:'nitrate-resonance'}));
 }
}
for(let edge=0;edge<cubeEdges.length;edge++){
 const [first,second]=cubeEdges[edge];
 const seedFace=edge<4;
 precipitationBonds.push(mappedBond(vertexToAtom[first],vertexToAtom[second],1,
  0,seedFace?1:0,1,{role:'AgCl-ionic-lattice-contact'}));
}
export const SILVER_CHLORIDE_BONDS=Object.freeze(precipitationBonds);

export const AGCL_KSP_25C=1.6e-10;
export const SILVER_CHLORIDE_MODEL=Object.freeze({
 id:'silver-chloride-precipitation',
 atoms:SILVER_CHLORIDE_ATOMS,
 bonds:SILVER_CHLORIDE_BONDS,
 startPhase:'DISSOLVED IONS',
 transitionPhase:'INITIAL NUCLEUS',
 productPhase:'IONIC PRECIPITATE',
 stageLabels:Object.freeze({
  start:'أيونات مذابة في المحلول',
  transition:'بدء تكوّن نواة AgCl',
  product:'نموذج راسب AgCl الأيوني'
 }),
 stageCaptions:Object.freeze({
  start:'أيونات الفضة والكلوريد منفصلة؛ الصوديوم والنترات مستمران في المحلول',
  transition:'تتكون منطقة أولية من أيونات Ag+ وCl− المتجاورة؛ الأيونات المتفرجة لا تدخل الراسب',
  product:'تكتمل عينة شبكية أيونية صغيرة بالتناوب بين Ag+ وCl−؛ هذا ليس بلوراً كاملاً ولا حساباً لكمية الراسب'
 }),
 camera:Object.freeze({position:[0,3.1,10.8],target:[0,.35,0]})
});
export const NEUTRALIZATION_MODEL=Object.freeze({
 id:'acid-base-neutralization',
 atoms:NEUTRALIZATION_ATOMS,
 bonds:NEUTRALIZATION_BONDS,
 startPhase:'HYDRONIUM + HYDROXIDE',
 transitionPhase:'PROTON TRANSFER',
 productPhase:'WATER FORMED',
 stageLabels:Object.freeze({start:'أيون الهيدرونيوم والهيدروكسيد',transition:'انتقال البروتون',product:'تكوّن جزيئات الماء'}),
 stageCaptions:Object.freeze({
  start:'الأيونات المائية قبل انتقال البروتون مع بقاء الأيونات المتفرجة',
  transition:'يتحرك البروتون بين موقعي الأكسجين؛ رابطة O–H القديمة تضعف والجديدة تتكوّن',
  product:'أصبحت ذرة الهيدروجين نفسها مرتبطة بالأكسجين الجديد؛ الأيونات المتفرجة لم تتغير'
 }),
 camera:Object.freeze({position:[0,3.1,9.4],target:[0,0,0]})
});
export const ATOM_RESOLVED_MODELS=Object.freeze({
 'acid-base-neutralization':NEUTRALIZATION_MODEL,
 'silver-chloride-precipitation':SILVER_CHLORIDE_MODEL
});

export function createNeutralizationInput(){
 return {atoms:NEUTRALIZATION_ATOMS.map(atom=>({...atom,
  start:[...atom.start],transition:[...atom.transition],end:[...atom.end]})),
  bonds:NEUTRALIZATION_BONDS.map(bond=>({...bond}))};
}
export function calculateAgClPrecipitationQuotient({
 silverNitrateMoles,sodiumChlorideMoles,volumeMl
}){
 const silver=Number(silverNitrateMoles),chloride=Number(sodiumChlorideMoles),volume=Number(volumeMl);
 if(!Number.isFinite(silver)||!Number.isFinite(chloride)||!Number.isFinite(volume)||
  silver<0||chloride<0||volume<=0||volume>1e9)return null;
 const volumeLitres=volume/1000;
 const silverConcentration=silver/volumeLitres;
 const chlorideConcentration=chloride/volumeLitres;
 const quotient=silverConcentration*chlorideConcentration;
 if(!Number.isFinite(quotient))return null;
 return Object.freeze({
  silverConcentration,chlorideConcentration,quotient,ksp:AGCL_KSP_25C,
  supersaturated:quotient>AGCL_KSP_25C,
  volumeLitres,temperatureC:25
 });
}

export function createAtomEngineInput(reactionId,{precipitationAllowed=true}={}){
 const model=ATOM_RESOLVED_MODELS[reactionId];
 if(!model)return null;
 const atoms=model.atoms.map(atom=>{
  const frozen= atom.start;
  const holdPrecipitate=reactionId==='silver-chloride-precipitation'&&!precipitationAllowed;
  return {
   ...atom,start:[...atom.start],
   transition:holdPrecipitate?[...frozen]:[...atom.transition],
   end:holdPrecipitate?[...frozen]:[...atom.end]
  };
 });
 const bonds=model.bonds.map(bond=>{
  const holdPrecipitate=reactionId==='silver-chloride-precipitation'&&!precipitationAllowed&&bond.kind===1;
  return holdPrecipitate?{...bond,start:0,transition:0,end:0}:{...bond};
 });
 return {model,atoms,bonds,precipitationAllowed};
}

export async function loadLab04AtomEngine(url='./wasm/lab04_atom_engine.wasm'){
 const response=await fetch(url,{cache:'no-store'});
 if(!response.ok)throw new Error('تعذر تحميل محرك الذرات: HTTP '+response.status);
 let instance;
 try{
  const result=await WebAssembly.instantiateStreaming(response.clone(),{});
  instance=result.instance;
 }catch{
  const bytes=await response.arrayBuffer();
  const result=await WebAssembly.instantiate(bytes,{});
  instance=result.instance;
 }
 const exports=instance.exports;
 const required=['memory','cv_lab04_atom_engine_configure','cv_lab04_atom_engine_atom_input',
  'cv_lab04_atom_engine_bond_input','cv_lab04_atom_engine_atom_count',
  'cv_lab04_atom_engine_bond_count','cv_lab04_atom_engine_sample',
  'cv_lab04_atom_engine_validate','cv_lab04_atom_engine_last_error',
  'cv_lab04_atom_engine_version'];
 for(const name of required)if(!(name in exports))throw new Error('تصدير WASM مفقود: '+name);
 if(exports.cv_lab04_atom_engine_version()!==100)throw new Error('إصدار محرك الذرات غير متوافق');
 return exports;
}

export function configureAtomEngine(engine,reactionId,{precipitationAllowed=true}={}){
 const input=createAtomEngineInput(reactionId,{precipitationAllowed});
 if(!input)throw new Error('لا توجد خريطة ذرية لهذا التفاعل: '+reactionId);
 const atomCount=input.atoms.length,bondCount=input.bonds.length;
 if(engine.cv_lab04_atom_engine_configure(atomCount,bondCount)!==1)throw new Error('رفض محرك الذرات أحجام بيانات التفاعل');
 const atomPointer=engine.cv_lab04_atom_engine_atom_input();
 const bondPointer=engine.cv_lab04_atom_engine_bond_input();
 const atoms=new Float64Array(engine.memory.buffer,atomPointer,atomCount*11);
 const bonds=new Float64Array(engine.memory.buffer,bondPointer,bondCount*6);
 input.atoms.forEach((atom,index)=>{
  const offset=index*11;
  atoms[offset]=atom.atomicNumber;atoms[offset+1]=atom.id;
  atom.start.forEach((value,axis)=>atoms[offset+2+axis]=value);
  atom.transition.forEach((value,axis)=>atoms[offset+5+axis]=value);
  atom.end.forEach((value,axis)=>atoms[offset+8+axis]=value);
 });
 input.bonds.forEach((bond,index)=>{
  const offset=index*6;
  bonds[offset]=bond.a;bonds[offset+1]=bond.b;bonds[offset+2]=bond.kind;
  bonds[offset+3]=bond.start;bonds[offset+4]=bond.transition;bonds[offset+5]=bond.end;
 });
 if(engine.cv_lab04_atom_engine_validate()!==1)throw new Error('بيانات تعيين الذرات أو الروابط غير صالحة');
 const pointer=engine.cv_lab04_atom_engine_sample(0);
 if(!pointer||engine.cv_lab04_atom_engine_last_error()!==0)throw new Error('تعذر أخذ عينة من مسار التفاعل');
 return Object.freeze({
  atomCount,bondCount,samplePointer:pointer,model:input.model,
  atoms:Object.freeze(input.atoms),bonds:Object.freeze(input.bonds),
  precipitationAllowed:input.precipitationAllowed
 });
}
export function configureNeutralizationEngine(engine){
 return configureAtomEngine(engine,'acid-base-neutralization');
}
