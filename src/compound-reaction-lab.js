import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ELEMENTS,MATERIALS,REACTIONS,REACTION_CATEGORIES,calculateStoichiometry,findReactionsForSpecies,getMaterialById,getReactionAtomBalance,getReactionById,validateReactionBalance} from './compound-reactions.mjs';
import {loadStation04Engine,loadKineticsEngine,sampleStation04ReactionNow,simulateStation04Kinetics} from './station04-engine.mjs';
const byId=id=>document.getElementById(id),materialById=new Map(MATERIALS.map(m=>[m.id,m])),atomColors=Object.fromEntries(ELEMENTS.map(e=>[e.symbol,e.color])),atomicNumbers=Object.fromEntries(ELEMENTS.map(e=>[e.symbol,e.atomicNumber])),atomRadii={H:.2,C:.34,N:.33,O:.32,Na:.44,Mg:.43,S:.36,Cl:.42,Ca:.45,Fe:.45,Cu:.44,Zn:.43,Ag:.46,Ba:.5};
let activeReaction=getReactionById('water-synthesis'),activeCategory='all',activeMaterialFilter='all',selectedMaterial='h2',selectedSpecies=null,initialAmounts={},renderer=null,scene=null,camera=null,orbit=null,reactantRoot=null,productRoot=null,atomRoot=null,interactionRoot=null,solidRoot=null,gasRoot=null,mappedAtoms=[],mappedBonds=[],atomMapReady=false,electronParticles=[],protonParticles=[],solidParticles=[],gasParticles=[],station04Profile=null,station04Effects=null,station04EngineReady=false,kineticsEngineReady=false,kineticsResults=null,raf=0,playing=false,progress=0,lastTime=0;
const durationMs=8200,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
const txt=(id,value)=>{const el=byId(id);if(el)el.textContent=String(value)};
function buildMolecule(parent,species){
 const group=new THREE.Group(),sphere=new THREE.SphereGeometry(1,28,20);
 const points=species.atoms.map(a=>new THREE.Vector3(a.x,a.y,a.z));
 for(const [a,b] of species.bonds){const start=points[a],end=points[b],direction=new THREE.Vector3().subVectors(end,start),bond=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,direction.length(),12),new THREE.MeshStandardMaterial({color:0x9dafb5,roughness:.35,metalness:.5,transparent:true,opacity:1}));bond.position.copy(start).add(end).multiplyScalar(.5);bond.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());group.add(bond)}
 species.atoms.forEach(a=>{const colour=atomColors[a.element]||'#b5c2c0',material=new THREE.MeshStandardMaterial({color:colour,roughness:.28,metalness:.18,emissive:colour,emissiveIntensity:.07,transparent:true,opacity:1}),mesh=new THREE.Mesh(sphere,material);mesh.position.set(a.x,a.y,a.z);mesh.scale.setScalar(atomRadii[a.element]||.34);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh)});
 group.scale.setScalar(.78);parent.add(group);return group
}
function disposeGroup(root){root.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material.dispose()}});root.clear()}
function buildSide(root,entries,side){
 disposeGroup(root);const list=[];for(const entry of entries)for(let copy=0;copy<entry.coefficient;copy++)list.push(materialById.get(entry.species));
 const count=list.length,center=side==='reactants'?-2.85:2.85,spacing=Math.min(1.62,4.5/Math.max(1,count-1));
 list.forEach((species,index)=>{const molecule=buildMolecule(root,species);molecule.position.set(center+(index-(count-1)/2)*spacing,.95+(index%2)*.08,side==='reactants'?.15:-.15);molecule.rotation.y=index%2?-.16:.13;molecule.userData.startPosition=molecule.position.clone()})
}

const stageStops=[0,.24,.49,.76,1];
const stageTitles=['المتفاعلات','اقتراب الجزيئات','إعادة ترتيب الذرات والروابط','تكوّن النواتج'];
const stageDescriptions={
 'water-synthesis':['جزيئات الهيدروجين والأكسجين منفصلة قبل التفاعل.','تقترب الجزيئات في العرض التوضيحي؛ لا يعني ذلك أن كل تصادم يؤدي إلى تفاعل.','يُعرض حفظ الذرات مع انتقال تمثيلي من روابط المتفاعلات إلى روابط الماء؛ المسار ليس محاكاة كمومية.','تظهر جزيئات الماء، مع بقاء عدد ذرات H وO محفوظاً.'],
 'magnesium-oxide':['ذرات المغنيسيوم وجزيئات الأكسجين هي المواد الابتدائية.','تُعرض المواد في وضع اقتراب قبل إعادة الترتيب.','يمثل النموذج انتقال الإلكترونات من Mg إلى O وتكوّن مركب أيوني؛ لا يحاكي شبكة بلورية كاملة.','الناتج هو أكسيد المغنيسيوم MgO وفق المعادلة الموزونة.'],
 'peroxide-decomposition':['جزيئات فوق أكسيد الهيدروجين قبل التحلل.','يبدأ العرض بتغيّر ترتيب الجزيئات.','يُعرض تفكك الروابط وإعادة توزيع الذرات؛ آلية التحلل الفعلية تعتمد على الظروف والمحفز.','النواتج الممثلة هي الماء والأكسجين.'],
 'iron-copper-displacement':['الحديد ومحلول كبريتات النحاس قبل التفاعل.','يقترب الحديد من الوسط الأيوني في المحلول.','يتأكسد الحديد إلى Fe²⁺ وتُختزل أيونات Cu²⁺ إلى نحاس؛ الكبريتات أيون متفرج في المعادلة الأيونية.','تظهر كبريتات الحديد والنحاس الفلزي ضمن النواتج.'],
 'silver-chloride-precipitation':['أيونات الفضة والنترات والصوديوم والكلوريد في المحلول.','تتحرك الأيونات في المحلول بصورة تخطيطية.','تتحد Ag⁺ وCl⁻ لتكوين AgCl قليل الذوبان؛ تتكون النواة الصلبة ثم ينمو الراسب.','يظهر راسب كلوريد الفضة، بينما تبقى أيونات الصوديوم والنترات في المحلول.'],
 'acid-base-neutralization':['الحمض والقاعدة قبل التعادل.','تُمثّل عملية التفكك الأيوني في المحلول بصورة مبسطة.','تتحد أيونات H⁺ وOH⁻ لتكوين الماء؛ أيونات Na⁺ وCl⁻ تبقى أيونات متفرجة.','النواتج الجزيئية هي الماء وكلوريد الصوديوم في المحلول.'],
 'methane-combustion':['الميثان والأكسجين قبل التفاعل.','يُعرض الاقتراب بوصفه تمهيداً بصرياً فقط.','الاحتراق الحقيقي يتم عبر سلسلة خطوات جذرية معقدة؛ هذه المرحلة لا تدّعي تمثيل آلية أولية مفصلة.','النواتج في نموذج الاحتراق الكامل هي CO₂ وH₂O.'],
 'calcium-carbonate-decomposition':['كربونات الكالسيوم الصلبة قبل التسخين.','يمثل العرض إدخال الطاقة الحرارية اللازمة للتحلل.','تُعاد ترتيبات الروابط في نموذج إجمالي؛ لا يجري حساب انتقال الحرارة أو مسار الحالة الانتقالية.','تتكون CaO الصلبة وCO₂ الغازية.'],
 'haber-ammonia-synthesis':['النيتروجين والهيدروجين قبل تكوين الأمونيا.','يقترب المتفاعلان ضمن عرض مفاهيمي.','تتطلب عملية هابر تنشيط N₂ على سطح محفز وخطوات امتزاز وهدرجة؛ لا يمثل هذا العرض تلك الخطوات تفصيلياً.','تظهر جزيئات الأمونيا وفق النسبة الستوكيومترية.'],
 'carbon-monoxide-oxidation':['أول أكسيد الكربون والأكسجين قبل الأكسدة.','تُعرض مرحلة اقتراب المتفاعلات.','يتكون CO₂ من إعادة ترتيب الروابط؛ لا يفترض النموذج مساراً محفزاً أو حركية محددة.','الناتج النهائي هو ثاني أكسيد الكربون.'],
 'zinc-acid-displacement':['الزنك والحمض قبل التفاعل.','يبدأ التفاعل عند تماس سطح الزنك مع الوسط الحمضي.','يتأكسد Zn إلى Zn²⁺ وتُختزل أيونات الهيدروجين لتكوين H₂؛ الكلوريد أيون متفرج.','تظهر أيونات/كلوريد الزنك وغاز الهيدروجين ضمن النواتج.'],
 'barium-sulfate-precipitation':['أيونات الباريوم والكلوريد والصوديوم والكبريتات في المحلول.','تنتشر الأيونات وتقترب في المحلول.','يتحد Ba²⁺ مع SO₄²⁻ لتكوين BaSO₄ قليل الذوبان؛ بقية الأيونات تبقى في المحلول.','يظهر راسب كبريتات الباريوم وكلوريد الصوديوم المذاب.']
};
function expandReactionSide(entries,side){
 const expanded=[],bondList=[];let moleculeIndex=0;
 const moleculeCount=entries.reduce((sum,item)=>sum+item.coefficient,0);
 const spacing=Math.min(1.62,4.5/Math.max(1,moleculeCount-1));
 for(const entry of entries){
  const species=materialById.get(entry.species);if(!species)return null;
  const ionicOrDissociated=new Set(['mgo','cao','nacl','agcl','zncl2','bacl2','hcl']);
  for(let copy=0;copy<entry.coefficient;copy++){
   const center=(side==='reactants'?-2.85:2.85)+(moleculeIndex-(moleculeCount-1)/2)*spacing;
   const z=side==='reactants'?.15:-.15,y=.95+(moleculeIndex%2)*.08;
   const indices=species.atoms.map((atom,localIndex)=>{
    const index=expanded.length;
    expanded.push({element:atom.element,position:new THREE.Vector3(center+atom.x*.78,y+atom.y*.78,z+atom.z*.78),localIndex,moleculeIndex});
    return index;
   });
   if(!ionicOrDissociated.has(species.id)){for(const [a,b] of species.bonds)bondList.push([indices[a],indices[b]])}
   moleculeIndex++;
  }
 }
 return {atoms:expanded,bonds:bondList};
}
function buildAtomMappedScene(){
 if(!atomRoot)return false;
 disposeGroup(atomRoot);mappedAtoms=[];mappedBonds=[];atomMapReady=false;
 const left=expandReactionSide(activeReaction.reactants,'reactants'),right=expandReactionSide(activeReaction.products,'products');
 if(!left||!right||left.atoms.length!==right.atoms.length)return false;
 const queues=new Map();
 left.atoms.forEach((atom,index)=>{if(!queues.has(atom.element))queues.set(atom.element,[]);queues.get(atom.element).push(index)});
 const targetToSource=[];
 for(const atom of right.atoms){const queue=queues.get(atom.element);if(!queue?.length)return false;targetToSource.push(queue.shift())}
 if([...queues.values()].some(queue=>queue.length))return false;
 left.atoms.forEach((atom,index)=>{
  const targetIndex=targetToSource.indexOf(index);if(targetIndex<0)return;
  const colour=atomColors[atom.element]||'#b5c2c0';
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,18),new THREE.MeshStandardMaterial({color:colour,roughness:.28,metalness:.16,emissive:colour,emissiveIntensity:.08,transparent:true,opacity:1}));
  mesh.scale.setScalar((atomRadii[atom.element]||.34)*.78);mesh.position.copy(atom.position);mesh.castShadow=true;atomRoot.add(mesh);
  mappedAtoms.push({mesh,element:atom.element,start:atom.position.clone(),end:right.atoms[targetIndex].position.clone()});
 });
 const addBonds=(pairs,side)=>pairs.forEach(([a,b])=>{
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,1,10),new THREE.MeshStandardMaterial({color:0xb4c5c9,roughness:.34,metalness:.42,transparent:true,opacity:side==='reactants'?1:0}));
  atomRoot.add(mesh);mappedBonds.push({mesh,a,b,side});
 });
 addBonds(left.bonds,'reactants');
 addBonds(right.bonds.map(([a,b])=>[targetToSource[a],targetToSource[b]]),'products');
 atomMapReady=mappedAtoms.length===left.atoms.length;
 updateAtomMappedScene(progress);
 return atomMapReady;
}

function reactionNumber(){return Number.parseInt(activeReaction.number,10)}
function createParticle(parent,geometry,colour,opacity=1){
 const material=new THREE.MeshStandardMaterial({color:colour,emissive:colour,emissiveIntensity:.7,roughness:.28,metalness:.12,transparent:opacity<1,opacity,depthWrite:opacity>=1});
 const mesh=new THREE.Mesh(geometry,material);parent.add(mesh);return mesh;
}
function findMappedAtom(atomicNumber,exclude=-1){
 return mappedAtoms.findIndex((atom,index)=>index!==exclude&&atomicNumbers[atom.element]===atomicNumber);
}
function configureDynamicEffects(){
 [interactionRoot,solidRoot,gasRoot].forEach(root=>{if(root)disposeGroup(root)});
 electronParticles=[];protonParticles=[];solidParticles=[];gasParticles=[];
 const sample=sampleStation04ReactionNow(reactionNumber(),progress);
 station04Profile=sample?.profile??null;station04Effects=sample?.effects??null;
 if(!station04Profile||!interactionRoot||!solidRoot||!gasRoot)return;
 const electronCount=Math.min(6,Math.max(0,Math.round(station04Profile[0])));
 const protonCount=Math.min(3,Math.max(0,Math.round(station04Profile[1])));
 for(let i=0;i<electronCount;i++){
  electronParticles.push(createParticle(interactionRoot,new THREE.SphereGeometry(.095,16,12),0x8bcfff,1));
 }
 for(let i=0;i<protonCount;i++){
  protonParticles.push(createParticle(interactionRoot,new THREE.SphereGeometry(.13,18,14),0xffc879,1));
 }
 if(station04Profile[2]>0){
  const colour=station04Profile[2]===2?0xc8844b:(reactionNumber()===5?0xe8e7dc:0xe5ebed);
  for(let i=0;i<72;i++){
   const geometry=station04Profile[2]===2?new THREE.SphereGeometry(.105,12,10):new THREE.OctahedronGeometry(.105,0);
   const particle=createParticle(solidRoot,geometry,colour,.92);
   const angle=i*2.3999632297,radius=.08+.032*Math.sqrt(i);
   particle.userData.clusterPosition=new THREE.Vector3(Math.cos(angle)*radius,.10+(i%5)*.075,Math.sin(angle)*radius);
   particle.scale.setScalar(.001);solidParticles.push(particle);
  }
 }
 if(station04Profile[3]>0){
  const gasColour=station04Profile[3]===1?0xa9d9ee:(station04Profile[3]===3?0xb9e7e9:0xd5e0e7);
  for(let i=0;i<24;i++){
   const particle=createParticle(gasRoot,new THREE.SphereGeometry(.105+(i%3)*.018,14,10),gasColour,.72);
   particle.userData.phase=i/24;particle.userData.seed=i;gasParticles.push(particle);
  }
 }
}
function updateDynamicEffects(value){
 if(!station04Profile||!station04Effects)return;
 const electronProgress=station04Effects[0],protonProgress=station04Effects[1];
 const electronStartIndex=findMappedAtom(station04Profile[5]);
 const electronEndIndex=findMappedAtom(station04Profile[6],electronStartIndex);
 if(electronStartIndex>=0&&electronEndIndex>=0){
  const start=mappedAtoms[electronStartIndex].mesh.position,end=mappedAtoms[electronEndIndex].mesh.position;
  electronParticles.forEach((particle,index)=>{
   const phase=clamp(electronProgress*1.08-index*.035,0,1);
   particle.position.lerpVectors(start,end,phase);
   particle.position.y+=Math.sin(phase*Math.PI)*(.28+index*.045);
   particle.position.x+=Math.sin(index*2.1)*.06;
   particle.visible=electronProgress>.005;
  });
 }
 const hydrogenIndex=findMappedAtom(1),oxygenIndex=findMappedAtom(8,hydrogenIndex);
 if(hydrogenIndex>=0&&oxygenIndex>=0){
  const start=mappedAtoms[hydrogenIndex].mesh.position,end=mappedAtoms[oxygenIndex].mesh.position;
  protonParticles.forEach((particle,index)=>{
   const phase=clamp(protonProgress*1.06-index*.05,0,1);
   particle.position.lerpVectors(start,end,phase);
   particle.position.y+=Math.sin(phase*Math.PI)*.2;
   particle.visible=protonProgress>.005;
  });
 }
 const nucleation=station04Effects[4],growth=station04Effects[5];
 solidParticles.forEach((particle,index)=>{
  const base=particle.userData.clusterPosition;
  const scale=(.12+.88*growth)*(.35+.65*nucleation);
  particle.position.set((station04Profile[2]===2?-2.15:.35)+base.x,base.y*scale,base.z);
  particle.scale.setScalar(Math.max(.001,scale*(.45+(index%4)*.14)));
  particle.visible=nucleation>.01;
 });
 const gasNucleation=station04Effects[6],gasRelease=station04Effects[7];
 gasParticles.forEach(particle=>{
  const phase=(value*2.65+particle.userData.phase)%1;
  const bubbleMode=station04Profile[4]===1;
  particle.position.set(Math.sin(phase*5.1+particle.userData.seed)*.42,
   .20+phase*(bubbleMode?1.55:2.75),
   Math.cos(particle.userData.seed*2.17)*.38);
  const scale=(.45+.55*gasNucleation)*(bubbleMode?1:.82);
  particle.scale.setScalar(scale);
  particle.material.opacity=Math.max(0,.72*gasNucleation*(.45+.55*gasRelease)*(1-phase*.18));
  particle.visible=gasNucleation>.01&&gasRelease>.01;
 });
 const readout=byId('reaction-effect-readout');
 if(readout){
  const messages=[];
  if(station04Profile[0]>0)messages.push('e⁻ '+station04Profile[0]+' / '+Math.round(electronProgress*100)+'%');
  if(station04Profile[1]>0)messages.push('H⁺ '+Math.round(protonProgress*100)+'%');
  if(station04Profile[2]>0)messages.push((station04Profile[2]===2?'ترسيب فلزي ':'تكوّن راسب ')+Math.round(growth*100)+'%');
  if(station04Profile[3]>0)messages.push((station04Profile[4]===1?'فقاعات ':'تحرر غاز ')+Math.round(gasRelease*100)+'%');
  readout.textContent=messages.length?messages.join('  ·  '):'تغيّر الروابط / حفظ الذرات';
 }
}
function updateAtomMappedScene(value){
 if(!atomMapReady)return;
 const p=smooth(value),breaking=station04Effects?.[2]??smooth((value-.20)/.38),forming=station04Effects?.[3]??smooth((value-.52)/.40);
 mappedAtoms.forEach(atom=>atom.mesh.position.lerpVectors(atom.start,atom.end,p));
 mappedBonds.forEach(bond=>{
  const a=mappedAtoms[bond.a]?.mesh.position,b=mappedAtoms[bond.b]?.mesh.position;if(!a||!b)return;
  const direction=new THREE.Vector3().subVectors(b,a),length=direction.length();
  bond.mesh.position.copy(a).add(b).multiplyScalar(.5);bond.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());bond.mesh.scale.y=Math.max(.001,length);
  const fade=bond.side==='reactants'?1-breaking:forming;
  bond.mesh.material.opacity=fade;bond.mesh.visible=fade>.015;
 });
 updateDynamicEffects(value);
}
function updateMechanismCopy(value){
 const index=value<.12?0:value<.36?1:value<.70?2:3;
 txt('mechanism-stage-title',stageTitles[index]);
 txt('mechanism-stage-description',(stageDescriptions[activeReaction.id]||stageDescriptions['water-synthesis'])[index]);
}
function seekReaction(value){
 playing=false;lastTime=0;updateTimeline(value);
 const play=byId('play-reaction');if(play)play.textContent=value>=1?'↻ إعادة المحاكاة':'▶ استكمال';
}
function setOpacity(root,opacity){root.traverse(obj=>{if(obj.isMesh&&obj.material){obj.material.opacity=opacity;obj.material.transparent=true;obj.material.depthWrite=opacity>.98}})}
function setSideTransform(root,side,amount){root.children.forEach((m,i)=>{const base=m.userData.startPosition;if(!base)return;m.position.x=base.x+(side==='reactants'?1:-1)*amount*.26;m.position.y=base.y+Math.sin(amount*Math.PI+i)*.12;m.rotation.y=(i%2?-.16:.13)+amount*.25*(side==='reactants'?1:-1);m.scale.setScalar(.78*(side==='reactants'?1-.13*amount:.86+.14*amount))})}
function getKineticConversion(displayProgress){
 if(!kineticsResults?.rows?.length)return displayProgress;
 const rows=kineticsResults.rows,position=clamp(displayProgress,0,1)*(rows.length-1);
 const lower=Math.floor(position),upper=Math.min(rows.length-1,lower+1),fraction=position-lower;
 return rows[lower][1]+(rows[upper][1]-rows[lower][1])*fraction;
}
function updateTimeline(value){progress=clamp(value,0,1);if(reactantRoot)setOpacity(reactantRoot,0);if(productRoot)setOpacity(productRoot,0);const conversion=getKineticConversion(progress);const frame=sampleStation04ReactionNow(reactionNumber(),conversion);station04Profile=frame?.profile??station04Profile;station04Effects=frame?.effects??null;updateAtomMappedScene(conversion);const phase=progress<.24?'REACTANTS':progress<.49?'APPROACH':progress<.76?'REARRANGEMENT':'PRODUCTS';txt('view-phase',phase);const stageIndex=progress<.12?0:progress<.36?1:progress<.70?2:3;txt('stage-label',stageTitles[stageIndex]);txt('scene-caption',stageDescriptions[activeReaction.id]?.[stageIndex]||'عرض جزيئي تخطيطي');txt('progress-label',Math.round(conversion*100)+'%');const bar=byId('timeline-progress');if(bar)bar.style.width=(progress*100)+'%';const scrubber=byId('reaction-scrubber');if(scrubber)scrubber.value=String(Math.round(progress*1000));updateMechanismCopy(progress)}
function renderScene(){
 const canvas=byId('molecule-canvas');try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'})}catch(error){byId('webgl-fallback').hidden=false;canvas.hidden=true;return}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;scene=new THREE.Scene();scene.background=new THREE.Color(0x0c1721);scene.fog=new THREE.Fog(0x0c1721,14,27);
 camera=new THREE.PerspectiveCamera(42,1,.1,80);camera.position.set(0,5.2,14);scene.add(new THREE.HemisphereLight(0xe6f4f1,0x34434d,2.4));
 const key=new THREE.DirectionalLight(0xffe9c8,3.4);key.position.set(-5,9,7);scene.add(key);const fill=new THREE.PointLight(0x64cbb8,35,18,2);fill.position.set(4,4,2);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,10),new THREE.MeshStandardMaterial({color:0x172933,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.25;scene.add(floor);
 reactantRoot=new THREE.Group();productRoot=new THREE.Group();atomRoot=new THREE.Group();interactionRoot=new THREE.Group();solidRoot=new THREE.Group();gasRoot=new THREE.Group();scene.add(reactantRoot,productRoot,atomRoot,interactionRoot,solidRoot,gasRoot);orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.06;orbit.minDistance=7;orbit.maxDistance=23;orbit.maxPolarAngle=Math.PI*.49;orbit.target.set(0,.9,0);
 const resize=()=>{const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;if(observer)observer.observe(canvas.parentElement||canvas);else window.addEventListener('resize',resize,{passive:true});resize();
 window.addEventListener('pagehide',()=>{observer?.disconnect();if(!observer)window.removeEventListener('resize',resize);orbit?.dispose();renderer?.dispose();cancelAnimationFrame(raf)},{once:true});
 const loop=now=>{raf=requestAnimationFrame(loop);if(playing){const delta=lastTime?Math.min(50,now-lastTime):0;const activeDuration=kineticsResults?.rows?.length?kineticsResults.rows[kineticsResults.rows.length-1][0]*1000:durationMs;updateTimeline(progress+delta/Math.max(1,activeDuration));if(progress>=1){playing=false;txt('play-reaction','↻ إعادة المحاكاة');txt('scene-caption','اكتمل العرض البصري للنواتج')}}lastTime=now;orbit?.update();renderer.render(scene,camera)};
 raf=requestAnimationFrame(loop)
}
function formatAmount(value){return Number(value).toFixed(3)+' mol'}
function updateStoichiometry(){
 const result=calculateStoichiometry(activeReaction,Object.fromEntries(activeReaction.reactants.map(e=>[e.species,Number(initialAmounts[e.species]??.1)])));
 if(!result){txt('limiting-result','أدخل قيماً صحيحة غير سالبة');txt('amount-note','لا يمكن حساب الكميات بهذه المدخلات.');return}
 txt('limiting-result',result.limiting.map(id=>materialById.get(id).nameAr).join(' + '));
 const products=activeReaction.products.map(e=>materialById.get(e.species).formulaDisplay+' = '+formatAmount(result.produced[e.species])).join(' · ');
 txt('amount-note','النواتج النظرية: '+products+' | مقدار التفاعل: '+formatAmount(result.extent)+'. لا يشمل الحساب المردود أو الاتزان أو السرعة.')
}

function supportsCurrentKinetics(){
 return activeReaction.id==='acid-base-neutralization'&&
  activeReaction.reactants.length===2&&activeReaction.reactants.every(entry=>{
   const item=materialById.get(entry.species);
   return entry.coefficient===1&&item?.phase==='aqueous';
  });
}
function kineticsInput(id){return byId(id)?.value.trim()??''}
function clearKineticsResults(){
 kineticsResults=null;txt('kinetics-summary','لا توجد محاكاة حركية بعد.');txt('reaction-duration-label','عرض توضيحي / 8.2 s');
 const canvas=byId('kinetics-chart');if(canvas){const context=canvas.getContext('2d');context?.clearRect(0,0,canvas.width,canvas.height)}
}
function updateKineticsAvailability(){
 const button=byId('kinetics-run');if(!button)return;
 const supported=supportsCurrentKinetics();
 const raw=[kineticsInput('kinetics-volume'),kineticsInput('kinetics-temperature'),
  kineticsInput('kinetics-reference-temperature'),kineticsInput('kinetics-rate-constant'),
  kineticsInput('kinetics-order-a'),kineticsInput('kinetics-order-b')];
 const values=raw.map(Number);
 const activationRaw=kineticsInput('kinetics-activation-energy');
 const activationValid=activationRaw===''||(Number.isFinite(Number(activationRaw))&&Number(activationRaw)>=0);
 const valid=raw.every(value=>value!=='')&&values.every(Number.isFinite)&&
  values[0]>0&&values[1]>-273.15&&values[2]>-273.15&&values[3]>0&&
  values[4]>=0&&values[4]<=4&&values[5]>=0&&values[5]<=4&&
  values[4]+values[5]<=6&&activationValid;
 button.disabled=!kineticsEngineReady||!supported||!valid;
 if(!supported)txt('kinetics-status','المحرك الحالي يتطلب متفاعلين مائيين بمعامل ستوكيومتري 1:1؛ هذا الشرط غير متحقق للتفاعل المحدد.');
 else if(!kineticsEngineReady)txt('kinetics-status','محرك الحركية C++ / WebAssembly غير متاح حالياً.');
 else if(!valid)txt('kinetics-status','أدخل الحجم والحرارة وثابت السرعة والرتبتين. طاقة التنشيط اختيارية إذا لم يتوفر لها مصدر موثوق.');
 else txt('kinetics-status','البيانات مكتملة. سيستخدم المحرك القيم المدخلة فقط ولن يستنتج ثوابت من المعادلة.');
}
function drawKineticsChart(rows,volumeMl){
 const canvas=byId('kinetics-chart');if(!canvas||!rows?.length)return;
 const width=Math.max(320,canvas.clientWidth||640),height=Math.max(150,canvas.clientHeight||170);
 const ratio=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
 const context=canvas.getContext('2d');if(!context)return;
 context.setTransform(ratio,0,0,ratio,0,0);context.clearRect(0,0,width,height);
 const left=43,right=12,top=12,bottom=28,plotW=width-left-right,plotH=height-top-bottom;
 const concentrationA=rows.map(row=>row[3]/volumeMl),concentrationB=rows.map(row=>row[4]/volumeMl);
 const maximum=Math.max(1e-9,...concentrationA,...concentrationB)*1.12;
 context.font='10px "IBM Plex Sans Arabic",sans-serif';context.lineWidth=1;
 for(let tick=0;tick<=4;tick++){
  const y=top+plotH*tick/4;context.strokeStyle='rgba(150,180,188,.13)';
  context.beginPath();context.moveTo(left,y);context.lineTo(width-right,y);context.stroke();
  context.fillStyle='#8da3aa';context.textAlign='right';context.fillText((maximum*(1-tick/4)).toPrecision(2),left-7,y+3);
 }
 context.strokeStyle='rgba(170,200,205,.45)';context.beginPath();context.moveTo(left,top);context.lineTo(left,top+plotH);context.lineTo(width-right,top+plotH);context.stroke();
 const drawSeries=(values,colour)=>{
  context.beginPath();values.forEach((value,index)=>{
   const x=left+plotW*index/(values.length-1),y=top+plotH*(1-value/maximum);
   if(index===0)context.moveTo(x,y);else context.lineTo(x,y);
  });context.strokeStyle=colour;context.lineWidth=2.1;context.stroke();
 };
 drawSeries(concentrationA,'#74cbb7');drawSeries(concentrationB,'#e0b36b');
 context.fillStyle='#9fb2b9';context.textAlign='left';context.fillText('0 s',left, height-8);
 context.textAlign='right';context.fillText(rows[rows.length-1][0].toFixed(1)+' s',width-right,height-8);
 context.textAlign='center';context.fillStyle='#74cbb7';context.fillText('A',width*.43,top+10);
 context.fillStyle='#e0b36b';context.fillText('B',width*.56,top+10);
}
async function runKinetics(){
 if(!supportsCurrentKinetics()||!kineticsEngineReady)return;
 const button=byId('kinetics-run');button.disabled=true;txt('kinetics-status','يجري تكامل معادلة السرعة باستخدام محرك C++...');
 try{
  const [a,b]=activeReaction.reactants;
  const amountA=Number(initialAmounts[a.species]),amountB=Number(initialAmounts[b.species]);
  const volumeMl=Number(kineticsInput('kinetics-volume'));
  const temperatureC=Number(kineticsInput('kinetics-temperature'));
  const referenceTemperatureC=Number(kineticsInput('kinetics-reference-temperature'));
  const rateConstant=Number(kineticsInput('kinetics-rate-constant'));
  const orderA=Number(kineticsInput('kinetics-order-a')),orderB=Number(kineticsInput('kinetics-order-b'));
  const activationRaw=kineticsInput('kinetics-activation-energy');
  const hasActivationEnergy=activationRaw!=='',activationEnergyKjMol=hasActivationEnergy?Number(activationRaw):0;
  if(![amountA,amountB,volumeMl,temperatureC,referenceTemperatureC,rateConstant,orderA,orderB,activationEnergyKjMol].every(Number.isFinite)||amountA<=0||amountB<=0)throw new Error('تحقق من كميات المتفاعلات ومدخلات الحركية.');
  const result=await simulateStation04Kinetics({
   amountAMmol:amountA*1000,amountBMmol:amountB*1000,volumeMl,rateConstant,orderA,orderB,
   temperatureC,referenceTemperatureC,activationEnergyKjMol,useArrhenius:hasActivationEnergy,
   durationSeconds:20,maximumStepSeconds:.05,sampleCount:101
  });
  kineticsResults=result;drawKineticsChart(result.rows,volumeMl);txt('reaction-duration-label','زمن النموذج / 20 s');updateTimeline(progress);
  const first=result.rows[0],last=result.rows[result.rows.length-1];
  const initialRate=first[5],finalRate=last[5];
  const finalA=last[3]/volumeMl,finalB=last[4]/volumeMl;
  const order=orderA+orderB,concentrationPower=1-order,rateUnits=Math.abs(concentrationPower)<1e-9?'s⁻¹':('M^'+concentrationPower.toFixed(2)+' s⁻¹');
  txt('kinetics-summary',
   'k الفعّال = '+result.effectiveRateConstant.toPrecision(5)+' '+rateUnits+
   ' · السرعة الابتدائية = '+initialRate.toPrecision(4)+' M/s'+
   ' · السرعة عند النهاية = '+finalRate.toPrecision(4)+' M/s'+
   ' · [A] النهائية = '+finalA.toPrecision(4)+' M'+
   ' · [B] النهائية = '+finalB.toPrecision(4)+' M'+
   ' · التحول = '+(last[1]*100).toFixed(2)+'%');
  txt('kinetics-status',hasActivationEnergy?
   'نجح التكامل العددي. تم تعديل k بدرجة الحرارة وفق Arrhenius وباستخدام طاقة التنشيط التي أدخلتها.':
   'نجح التكامل العددي. لم تُدخل طاقة تنشيط؛ لذلك بقي k ثابتاً عند القيمة المرجعية ولم تُنسب للحرارة زيادة سرعة مصطنعة.');
 }catch(error){txt('kinetics-status',error instanceof Error?error.message:'تعذر تشغيل نموذج الحركية.')}
 updateKineticsAvailability();
}
function updateAmounts(){
 const container=byId('reactant-amounts');container.replaceChildren();
 for(const entry of activeReaction.reactants){const item=materialById.get(entry.species),row=document.createElement('div');row.className='amount-row';const label=document.createElement('label');label.htmlFor='amount-'+item.id;label.textContent=item.nameAr+' / '+item.formulaDisplay;const input=document.createElement('input');input.type='number';input.id='amount-'+item.id;input.min='0';input.max='1000';input.step='0.001';input.value=initialAmounts[item.id]??'0.100';input.inputMode='decimal';input.addEventListener('input',()=>{initialAmounts[item.id]=input.value;clearKineticsResults();updateStoichiometry();updateKineticsAvailability()});row.append(label,input);container.append(row)}
 updateStoichiometry();updateKineticsAvailability()
}
function updateReactionDisplay(){
 const balance=getReactionAtomBalance(activeReaction),equation=byId('equation-display');equation.replaceChildren();
 const appendSide=entries=>entries.forEach((entry,index)=>{if(index){const plus=document.createElement('span');plus.className='equation-operator';plus.textContent='+';equation.append(plus)}const term=document.createElement('span');term.className='equation-term';if(entry.coefficient>1){const coefficient=document.createElement('span');coefficient.className='coefficient';coefficient.textContent=entry.coefficient;term.append(coefficient)}const formula=document.createElement('b');formula.textContent=materialById.get(entry.species).formulaDisplay;term.append(formula);equation.append(term)});
 appendSide(activeReaction.reactants);const arrow=document.createElement('span');arrow.className='equation-operator';arrow.textContent='→';equation.append(arrow);appendSide(activeReaction.products);
 const category=REACTION_CATEGORIES.find(c=>c.id===activeReaction.category);txt('reaction-class',category?.label||'تفاعل كيميائي');txt('balance-counts',balance.elements.map(el=>el+': '+(balance.left[el]||0)).join(' · ')+' / CONSERVED');byId('balance-status').innerHTML=balance.balanced?'<i></i> المعادلة موزونة':'<i></i> تحتاج مراجعة';
 txt('reaction-title-ar',activeReaction.titleAr);txt('reaction-summary',activeReaction.summary);txt('reaction-observation',activeReaction.observation);txt('reaction-conditions',activeReaction.conditions);txt('reaction-index',activeReaction.number+' / '+String(REACTIONS.length).padStart(2,'0'));txt('view-reaction-number','REACTION '+activeReaction.number)
}
function renderReactionList(){
 const q=byId('reaction-search').value.trim().toLowerCase(),list=byId('reaction-list');list.replaceChildren();
 const items=REACTIONS.filter(r=>(activeCategory==='all'||r.category===activeCategory)&&(!selectedSpecies||[...r.reactants,...r.products].some(e=>e.species===selectedSpecies))&&(!q||[r.title,r.titleAr,r.id,...[...r.reactants,...r.products].map(e=>materialById.get(e.species).formula)].join(' ').toLowerCase().includes(q)));
 txt('reaction-count',items.length);if(!items.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='لا توجد تفاعلات مطابقة لهذا البحث.';list.append(empty);return}
 items.forEach(r=>{const button=document.createElement('button');button.type='button';button.className='reaction-item'+(r.id===activeReaction.id?' is-active':'');const index=document.createElement('span');index.className='reaction-number';index.textContent=r.number;const copy=document.createElement('span');copy.className='reaction-copy';const title=document.createElement('b');title.textContent=r.titleAr;const meta=document.createElement('small');meta.textContent=(REACTION_CATEGORIES.find(c=>c.id===r.category)?.label||'').toUpperCase()+' / '+r.highlight;copy.append(title,meta);const arrow=document.createElement('i');arrow.textContent='←';button.append(index,copy,arrow);button.addEventListener('click',()=>selectReaction(r.id));list.append(button)})
}
function renderCategories(){
 const root=byId('category-filters');root.replaceChildren();REACTION_CATEGORIES.forEach(category=>{const button=document.createElement('button');button.type='button';button.className='filter-button'+(activeCategory===category.id?' is-active':'');button.textContent=category.label;button.addEventListener('click',()=>{activeCategory=category.id;renderCategories();renderReactionList()});root.append(button)})
}
function renderMaterials(){
 const q=byId('material-search').value.trim().toLowerCase(),list=byId('material-list');list.replaceChildren();
 const items=MATERIALS.filter(item=>(activeMaterialFilter==='all'||item.kind===activeMaterialFilter)&&(!q||[item.nameAr,item.nameEn,item.formula,item.formulaDisplay].join(' ').toLowerCase().includes(q)));
 txt('material-count',items.length);
 items.forEach(item=>{const button=document.createElement('button');button.type='button';button.className='material-item'+(selectedMaterial===item.id?' is-active':'');const symbol=document.createElement('span');symbol.className='material-symbol';symbol.textContent=item.formulaDisplay;const info=document.createElement('span');const name=document.createElement('b');name.textContent=item.nameAr;const meta=document.createElement('small');meta.textContent=item.kind==='element'?'ELEMENT / '+item.phase.toUpperCase():'COMPOUND / '+item.phase.toUpperCase();info.append(name,meta);button.append(symbol,info);button.addEventListener('click',()=>{selectedMaterial=item.id;selectedSpecies=item.id;activeCategory='all';renderCategories();renderReactionList();renderMaterials();updateSelectedMaterial()});list.append(button)});
 if(!items.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='لا توجد مواد مطابقة.';list.append(empty)}
}
function updateSelectedMaterial(){
 const item=getMaterialById(selectedMaterial);if(!item)return;txt('selected-symbol',item.formulaDisplay);txt('selected-name',item.nameAr);txt('selected-meta',(item.kind==='element'?'عنصر':'مركب')+' / '+item.phase);txt('selected-description',item.description);
 const reactions=findReactionsForSpecies(item.id),container=byId('related-reactions');container.replaceChildren();if(!reactions.length){container.textContent='لا توجد تفاعلات في المكتبة الحالية.';return}
 reactions.forEach(r=>{const button=document.createElement('button');button.type='button';button.textContent=r.number+' · '+r.titleAr;button.addEventListener('click',()=>selectReaction(r.id));container.append(button)})
}
function renderLegend(){const root=byId('atom-legend');root.replaceChildren();ELEMENTS.forEach(el=>{const item=document.createElement('span');item.className='atom-key';const dot=document.createElement('i');dot.style.background=el.color;const text=document.createElement('span');text.textContent=el.symbol+' / '+el.name;item.append(dot,text);root.append(item)})}
function selectReaction(id){
 const next=getReactionById(id);if(!next)return;activeReaction=next;selectedSpecies=null;selectedMaterial=next.reactants[0].species;activeCategory='all';initialAmounts=Object.fromEntries(next.reactants.map(item=>[item.species,'0.100']));
 playing=false;progress=0;lastTime=0;renderCategories();renderReactionList();renderMaterials();updateSelectedMaterial();updateReactionDisplay();clearKineticsResults();
 ['kinetics-rate-constant','kinetics-order-a','kinetics-order-b','kinetics-activation-energy'].forEach(id=>{const input=byId(id);if(input)input.value=''});
 updateAmounts();updateKineticsAvailability();
 if(reactantRoot&&productRoot){buildSide(reactantRoot,activeReaction.reactants,'reactants');buildSide(productRoot,activeReaction.products,'products');buildAtomMappedScene();configureDynamicEffects();updateTimeline(0)}
 byId('play-reaction').textContent='▶ ابدأ المحاكاة'
}
async function init(){
 renderScene();
 const engines=await Promise.allSettled([loadStation04Engine(),loadKineticsEngine()]);
 station04EngineReady=engines[0].status==='fulfilled';
 kineticsEngineReady=engines[1].status==='fulfilled';
 const engineStatus=byId('s04-engine-status');
 if(engineStatus){engineStatus.textContent=station04EngineReady?'C++ PROCESS ENGINE / ONLINE':'C++ PROCESS ENGINE / OFFLINE';engineStatus.classList.toggle('is-offline',!station04EngineReady)}
 renderCategories();renderReactionList();renderMaterials();renderLegend();updateReactionDisplay();initialAmounts={h2:'0.100',o2:'0.100'};updateAmounts();updateSelectedMaterial();
 if(reactantRoot&&productRoot){buildSide(reactantRoot,activeReaction.reactants,'reactants');buildSide(productRoot,activeReaction.products,'products');buildAtomMappedScene();configureDynamicEffects();updateTimeline(0)}
 byId('reaction-search').addEventListener('input',renderReactionList);byId('material-search').addEventListener('input',renderMaterials);
 document.querySelectorAll('[data-material-filter]').forEach(button=>button.addEventListener('click',()=>{activeMaterialFilter=button.dataset.materialFilter;document.querySelectorAll('[data-material-filter]').forEach(b=>b.classList.toggle('is-active',b===button));renderMaterials()}));
 ['kinetics-volume','kinetics-temperature','kinetics-reference-temperature','kinetics-rate-constant','kinetics-order-a','kinetics-order-b','kinetics-activation-energy'].forEach(id=>byId(id).addEventListener('input',()=>{clearKineticsResults();updateKineticsAvailability()}));
 byId('kinetics-run').addEventListener('click',runKinetics);
 byId('play-reaction').addEventListener('click',()=>{if(playing){playing=false;byId('play-reaction').textContent='▶ استكمال';lastTime=0;return}if(progress>=1)updateTimeline(0);playing=true;lastTime=0;byId('play-reaction').textContent='Ⅱ إيقاف مؤقت'});
 byId('reset-reaction').addEventListener('click',()=>{playing=false;lastTime=0;updateTimeline(0);byId('play-reaction').textContent='▶ ابدأ المحاكاة'});byId('previous-stage').addEventListener('click',()=>seekReaction(stageStops.filter(stop=>stop<progress-1e-4).pop()??0));byId('next-stage').addEventListener('click',()=>seekReaction(stageStops.find(stop=>stop>progress+1e-4)??1));byId('reaction-scrubber').addEventListener('input',event=>seekReaction(Number(event.target.value)/1000));
 byId('reset-camera').addEventListener('click',()=>{camera?.position.set(0,5.2,14);orbit?.target.set(0,.9,0);orbit?.update()});
 updateKineticsAvailability();
}
init().catch(error=>{const status=byId('s04-engine-status');if(status){status.textContent='ENGINE INIT ERROR';status.classList.add('is-offline')}txt('kinetics-status',error.message||'تعذر تهيئة المحركات.')});
