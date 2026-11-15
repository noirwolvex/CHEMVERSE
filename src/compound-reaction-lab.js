import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ELEMENTS,MATERIALS,REACTIONS,REACTION_CATEGORIES,calculateStoichiometry,findReactionsForSpecies,getMaterialById,getReactionAtomBalance,getReactionById,validateReactionBalance} from './compound-reactions.mjs';
import {loadLab04AtomEngine,configureNeutralizationEngine,NEUTRALIZATION_ATOMS,NEUTRALIZATION_BONDS} from './lab04-atom-engine.mjs';
const byId=id=>document.getElementById(id),materialById=new Map(MATERIALS.map(m=>[m.id,m])),atomColors=Object.fromEntries(ELEMENTS.map(e=>[e.symbol,e.color])),atomRadii={H:.2,C:.34,N:.33,O:.32,Na:.44,Mg:.43,S:.36,Cl:.42,Ca:.45,Fe:.45,Cu:.44,Zn:.43,Ag:.46,Ba:.5};
let activeReaction=getReactionById('acid-base-neutralization'),activeCategory='all',activeMaterialFilter='all',selectedMaterial='hcl',selectedSpecies=null,initialAmounts={},renderer=null,scene=null,camera=null,orbit=null,reactantRoot=null,productRoot=null,raf=0,playing=false,progress=0,lastTime=0,atomEngine=null,atomEnginePromise=null,atomEngineState=null,atomEngineRoot=null,atomEngineVisuals=null;
const durationMs=8200,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v)};
const txt=(id,value)=>{const el=byId(id);if(el)el.textContent=String(value)};
const phaseArabic={gas:'غاز',liquid:'سائل',solid:'صلب',aqueous:'محلول مائي'};
function buildMolecule(parent,species){
 const group=new THREE.Group(),sphere=new THREE.SphereGeometry(1,40,28);
 const points=species.atoms.map(a=>new THREE.Vector3(a.x,a.y,a.z));
 for(const descriptor of species.bonds){
  const [a,b,rawOrder=1,bondKind='covalent']=descriptor,start=points[a],end=points[b];
  const delta=new THREE.Vector3().subVectors(end,start),length=delta.length();
  if(!Number.isFinite(length)||length<1e-5)continue;
  const direction=delta.clone().normalize();
  const reference=Math.abs(direction.y)<.86?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0);
  const perpendicular=new THREE.Vector3().crossVectors(direction,reference).normalize();
  const material=new THREE.MeshStandardMaterial({
   color:bondKind==='ionic'?0x9bc0ca:0xb9c8ca,
   roughness:bondKind==='ionic'?.62:.34,
   metalness:bondKind==='ionic'?.08:.28,
   transparent:bondKind==='ionic'||bondKind==='resonance',
   opacity:bondKind==='ionic'?.56:1
  });
  if(bondKind==='ionic'){
   const segments=7,segmentLength=length/segments*.46;
   for(let index=0;index<segments;index++){
    const t=(index+.5)/segments,mesh=new THREE.Mesh(new THREE.CylinderGeometry(.034,.034,segmentLength,10),material);
    mesh.position.copy(start).lerp(end,t);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);group.add(mesh);
   }
  }else{
   const order=Math.max(1,Math.min(3,Math.round(Number(rawOrder)||1)));
   for(let strand=0;strand<order;strand++){
    const offset=(strand-(order-1)/2)*.135,mesh=new THREE.Mesh(new THREE.CylinderGeometry(.047,.047,length,12),material);
    mesh.position.copy(start).add(end).multiplyScalar(.5).addScaledVector(perpendicular,offset);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
    if(bondKind==='resonance'&&strand>0){mesh.material=material.clone();mesh.material.opacity=.34;mesh.material.transparent=true}
    group.add(mesh);
   }
  }
 }
 species.atoms.forEach(a=>{
  const colour=atomColors[a.element]||'#b5c2c0',metallic=['Na','Mg','Fe','Cu','Zn','Ag','Ba','Ca'].includes(a.element);
  const material=new THREE.MeshStandardMaterial({
   color:colour,roughness:metallic?.24:.34,metalness:metallic?.62:.12,
   emissive:colour,emissiveIntensity:.035
  });
  const mesh=new THREE.Mesh(sphere,material);mesh.position.set(a.x,a.y,a.z);mesh.scale.setScalar(atomRadii[a.element]||.34);
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.element=a.element;group.add(mesh);
 });
 group.scale.setScalar(.78);parent.add(group);return group
}
function disposeGroup(root){root.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material.dispose()}});root.clear()}
function buildSide(root,entries,side){
 disposeGroup(root);const list=[];for(const entry of entries)for(let copy=0;copy<entry.coefficient;copy++)list.push(materialById.get(entry.species));
 const count=list.length,center=side==='reactants'?-2.85:2.85,spacing=Math.min(1.62,4.5/Math.max(1,count-1));
 list.forEach((species,index)=>{const molecule=buildMolecule(root,species);molecule.position.set(center+(index-(count-1)/2)*spacing,.95+(index%2)*.08,side==='reactants'?.15:-.15);molecule.rotation.y=index%2?-.16:.13;molecule.userData.startPosition=molecule.position.clone()})
}
function setOpacity(root,opacity){root.traverse(obj=>{if(obj.isMesh&&obj.material){obj.material.opacity=opacity;obj.material.transparent=true;obj.material.depthWrite=opacity>.98}})}
function setSideTransform(root,side,amount){root.children.forEach((m,i)=>{const base=m.userData.startPosition;if(!base)return;m.position.x=base.x+(side==='reactants'?1:-1)*amount*.26;m.position.y=base.y+Math.sin(amount*Math.PI+i)*.12;m.rotation.y=(i%2?-.16:.13)+amount*.25*(side==='reactants'?1:-1);m.scale.setScalar(.78*(side==='reactants'?1-.13*amount:.86+.14*amount))})}
function disposeAtomEngineView(){
 if(atomEngineRoot){scene?.remove(atomEngineRoot);disposeGroup(atomEngineRoot);atomEngineRoot=null}
 atomEngineState=null;atomEngineVisuals=null;
}
function buildAtomEngineView(){
 if(!scene||!atomEngineState)return;
 if(atomEngineRoot){scene.remove(atomEngineRoot);disposeGroup(atomEngineRoot);atomEngineRoot=null}
 atomEngineVisuals=null;
 atomEngineRoot=new THREE.Group();scene.add(atomEngineRoot);
 const atomGeometry=new THREE.SphereGeometry(1,36,26),atomMeshes=[];
 for(const atom of NEUTRALIZATION_ATOMS){
  const colour=atomColors[atom.element]||'#d2e0dc';
  const material=new THREE.MeshStandardMaterial({color:colour,roughness:.3,metalness:.18,emissive:colour,emissiveIntensity:.04});
  const mesh=new THREE.Mesh(atomGeometry,material);mesh.scale.setScalar(atomRadii[atom.element]||.34);mesh.castShadow=true;mesh.receiveShadow=true;
  mesh.userData.atomId=atom.id;mesh.userData.element=atom.element;atomEngineRoot.add(mesh);atomMeshes.push(mesh);
 }
 const bondVisuals=NEUTRALIZATION_BONDS.map(bond=>{
  const group=new THREE.Group();atomEngineRoot.add(group);const meshes=[],segmentCount=bond.kind===1?7:3;
  for(let index=0;index<segmentCount;index++){
   const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.043,.043,1,12),new THREE.MeshStandardMaterial({
    color:bond.kind===1?0x93b4c0:0xd7e5e1,roughness:.42,metalness:.18,transparent:true,opacity:0,depthWrite:false
   }));
   mesh.visible=false;group.add(mesh);meshes.push(mesh);
  }
  return {definition:bond,meshes}
 });
 atomEngineVisuals={atomMeshes,bondVisuals};
 camera?.position.set(0,3.1,9.4);orbit?.target.set(0,0,0);orbit?.update();
}
function updateAtomEngineFrame(value){
 if(!atomEngine||!atomEngineState||!atomEngineVisuals)return false;
 const pointer=atomEngine.cv_lab04_atom_engine_sample(value);
 if(!pointer)return false;
 const {atomCount,bondCount}=atomEngineState;
 const sample=new Float64Array(atomEngine.memory.buffer,pointer,atomCount*4+bondCount);
 const {atomMeshes,bondVisuals}=atomEngineVisuals;
 for(let index=0;index<atomCount;index++){
  const offset=index*4,mesh=atomMeshes[index];
  mesh.position.set(sample[offset],sample[offset+1],sample[offset+2]);mesh.visible=sample[offset+3]>.01;
 }
 const bondOffset=atomCount*4;
 bondVisuals.forEach((visual,index)=>{
  const {definition,meshes}=visual,start=atomMeshes[definition.a].position,end=atomMeshes[definition.b].position;
  const delta=new THREE.Vector3().subVectors(end,start),length=delta.length(),order=clamp(sample[bondOffset+index],0,3);
  if(length<1e-5){meshes.forEach(mesh=>mesh.visible=false);return}
  const direction=delta.clone().normalize(),reference=Math.abs(direction.y)<.86?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0);
  const perpendicular=new THREE.Vector3().crossVectors(direction,reference).normalize();
  meshes.forEach((mesh,strand)=>{
   const strength=definition.kind===1?order:clamp(order-strand,0,1);
   if(strength<=.005){mesh.visible=false;return}
   mesh.visible=true;mesh.material.opacity=strength;
   const midpoint=start.clone().add(end).multiplyScalar(.5);
   if(definition.kind===1){
    const t=(strand+.5)/meshes.length;mesh.position.copy(start).lerp(end,t);mesh.scale.set(1,length/meshes.length*.48,1);
   }else{
    const strandOffset=(strand-1)*.105;mesh.position.copy(midpoint).addScaledVector(perpendicular,strandOffset);mesh.scale.set(1,length,1);
   }
   mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
  });
 });
 return true;
}
async function activateAtomResolvedView(reactionId){
 if(reactionId!=='acid-base-neutralization'){
  disposeAtomEngineView();if(reactantRoot)reactantRoot.visible=true;if(productRoot)productRoot.visible=true;
  txt('atom-engine-status','عرض جزيئي تخطيطي');return;
 }
 try{
  if(!atomEnginePromise)atomEnginePromise=loadLab04AtomEngine();
  const loaded=await atomEnginePromise;if(reactionId!==activeReaction.id)return;
  atomEngine=loaded;atomEngineState=configureNeutralizationEngine(atomEngine);
  if(reactantRoot)reactantRoot.visible=false;if(productRoot)productRoot.visible=false;
  buildAtomEngineView();updateAtomEngineFrame(progress);
  txt('atom-engine-status','C++ / WASM · ATOM MAPPED · ACTIVE');
  txt('view-phase','ATOM-MAPPED REACTION');
  txt('scene-caption','تعيين ثابت لكل ذرة؛ انتقال البروتون وتغير الروابط مع حفظ عدد الذرات');
 }catch(error){
  atomEnginePromise=null;atomEngine=null;disposeAtomEngineView();
  txt('atom-engine-status','تعذر تحميل محرك الذرات');
  txt('ionic-note','تعذر تحميل محرك الذرات: '+error.message+' — سيبقى العرض الجزيئي التخطيطي متاحاً.');
  if(reactantRoot)reactantRoot.visible=true;if(productRoot)productRoot.visible=true;
 }
}
function updateTimeline(value){
 progress=clamp(value,0,1);
 if(atomEngineState&&atomEngineVisuals){
  updateAtomEngineFrame(progress);
  txt('view-phase',progress<.5?'PROTON TRANSFER / APPROACH':'WATER BOND FORMED');
  txt('stage-label',progress<.5?'انتقال البروتون':'تكوّن رابطة الماء');
  txt('scene-caption',progress<.5?'يتحرك البروتون بين موقعي الأكسجين؛ رابطة O–H القديمة تضعف والجديدة تتكوّن':'أصبحت الذرة نفسها مرتبطة بالأكسجين الجديد؛ الأيونات المتفرجة لم تتغير');
 }else{
  const vanish=smooth((progress-.26)/.43),appear=smooth((progress-.43)/.38);
  if(reactantRoot){setOpacity(reactantRoot,1-vanish);setSideTransform(reactantRoot,'reactants',progress)}
  if(productRoot){setOpacity(productRoot,appear);setSideTransform(productRoot,'products',progress)}
  txt('view-phase',progress<.26?'REACTANTS':progress<.76?'SCHEMATIC TRANSITION':'PRODUCTS');
  txt('stage-label',progress<.26?'المواد المتفاعلة':progress<.76?'انتقال بصري تخطيطي':'النواتج');
  txt('scene-caption',progress<.26?'نماذج المواد المتفاعلة مع حالات المادة':progress<.76?'انتقال تخطيطي بين جانبي المعادلة؛ ليس مساراً ذرياً زمنياً':'نماذج النواتج بعد اكتمال العرض التخطيطي');
 }
 txt('progress-label',Math.round(progress*100)+'%');byId('timeline-progress').style.width=(progress*100)+'%'
}
function renderScene(){
 const canvas=byId('molecule-canvas');try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'})}catch(error){byId('webgl-fallback').hidden=false;canvas.hidden=true;return}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=1.12;
 renderer.shadowMap.enabled=true;
 renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene=new THREE.Scene();scene.background=new THREE.Color(0x0b151e);scene.fog=new THREE.Fog(0x0b151e,15,30);
 camera=new THREE.PerspectiveCamera(42,1,.1,80);camera.position.set(0,5.2,14);scene.add(new THREE.HemisphereLight(0xe6f4f1,0x34434d,2.1));
 const key=new THREE.DirectionalLight(0xffe9c8,3.1);key.position.set(-5,9,7);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.near=.1;key.shadow.camera.far=32;key.shadow.normalBias=.035;scene.add(key);
 const fill=new THREE.PointLight(0x64cbb8,30,19,2);fill.position.set(4,4,2);scene.add(fill);
 const rim=new THREE.PointLight(0x85a9ff,12,17,2);rim.position.set(-5,2,-5);scene.add(rim);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(22,12),new THREE.MeshStandardMaterial({color:0x172933,roughness:.92,metalness:.08}));
 floor.rotation.x=-Math.PI/2;floor.position.y=-.25;floor.receiveShadow=true;scene.add(floor);
 const grid=new THREE.GridHelper(22,44,0x41616a,0x29434c);grid.position.y=-.242;grid.material.transparent=true;grid.material.opacity=.25;scene.add(grid);
 const addStage=(x,colour)=>{
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.95,2.08,.16,64),new THREE.MeshStandardMaterial({color:0x1b3039,roughness:.38,metalness:.58}));
  base.position.set(x,-.17,0);base.castShadow=true;base.receiveShadow=true;scene.add(base);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.78,.022,10,80),new THREE.MeshStandardMaterial({color:colour,emissive:colour,emissiveIntensity:.28,metalness:.5,roughness:.28}));
  ring.rotation.x=Math.PI/2;ring.position.set(x,-.075,0);scene.add(ring);
 };
 addStage(-2.85,0x6bcbbb);addStage(2.85,0xd8aa70);
 reactantRoot=new THREE.Group();productRoot=new THREE.Group();scene.add(reactantRoot,productRoot);
 orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.06;orbit.minDistance=7;orbit.maxDistance=23;orbit.maxPolarAngle=Math.PI*.49;orbit.target.set(0,.9,0);
 const resize=()=>{const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;if(observer)observer.observe(canvas.parentElement||canvas);else window.addEventListener('resize',resize,{passive:true});resize();
 window.addEventListener('pagehide',()=>{observer?.disconnect();if(!observer)window.removeEventListener('resize',resize);orbit?.dispose();renderer?.dispose();cancelAnimationFrame(raf)},{once:true});
 const loop=now=>{raf=requestAnimationFrame(loop);if(playing){const delta=lastTime?Math.min(50,now-lastTime):0;updateTimeline(progress+delta/durationMs);if(progress>=1){playing=false;txt('play-reaction','↻ إعادة المحاكاة');txt('scene-caption','اكتمل العرض التخطيطي للنواتج')}}lastTime=now;orbit?.update();renderer.render(scene,camera)};
 raf=requestAnimationFrame(loop)
}
function formatAmount(value){return Number(value).toFixed(3)+' mol'}
function updateStoichiometry(){
 const result=calculateStoichiometry(activeReaction,Object.fromEntries(activeReaction.reactants.map(e=>[e.species,Number(initialAmounts[e.species]??.1)])));
 if(!result){txt('limiting-result','أدخل قيماً صحيحة غير سالبة');txt('amount-note','تحقق من أن جميع الكميات أرقام غير سالبة ولا تتجاوز الحد المسموح.');return}
 txt('limiting-result',result.limiting.map(id=>materialById.get(id).nameAr).join(' + '));
 const products=activeReaction.products.map(e=>materialById.get(e.species).formulaDisplay+' = '+formatAmount(result.produced[e.species])).join(' · ');
 const remaining=activeReaction.reactants.map(e=>materialById.get(e.species).formulaDisplay+' = '+formatAmount(result.remaining[e.species])).join(' · ');
 txt('amount-note','النواتج النظرية: '+products+' | المتبقي: '+remaining+' | مقدار التفاعل: '+formatAmount(result.extent)+'. يفترض الحساب تحولاً كاملاً وفق المعادلة الموزونة؛ ولا يحسب المردود أو الاتزان أو سرعة التفاعل.')
}
function updateAmounts(){
 const container=byId('reactant-amounts');container.replaceChildren();
 for(const entry of activeReaction.reactants){const item=materialById.get(entry.species),row=document.createElement('div');row.className='amount-row';const label=document.createElement('label');label.htmlFor='amount-'+item.id;label.textContent=item.nameAr+' / '+item.formulaDisplay;const input=document.createElement('input');input.type='number';input.id='amount-'+item.id;input.min='0';input.max='1000';input.step='0.001';input.value=initialAmounts[item.id]??'0.100';input.inputMode='decimal';input.addEventListener('input',()=>{initialAmounts[item.id]=input.value;updateStoichiometry()});row.append(label,input);container.append(row)}
 updateStoichiometry()
}
function updateReactionDisplay(){
 const balance=getReactionAtomBalance(activeReaction),equation=byId('equation-display');equation.replaceChildren();
 const appendSide=entries=>entries.forEach((entry,index)=>{
  if(index){const plus=document.createElement('span');plus.className='equation-operator';plus.textContent='+';equation.append(plus)}
  const term=document.createElement('span');term.className='equation-term';
  if(entry.coefficient>1){const coefficient=document.createElement('span');coefficient.className='coefficient';coefficient.textContent=entry.coefficient;term.append(coefficient)}
  const formula=document.createElement('b');formula.textContent=materialById.get(entry.species).formulaDisplay;term.append(formula);
  const phase=activeReaction.phases?.[entry.species];if(phase){const state=document.createElement('small');state.className='phase-state';state.textContent='('+phase+')';term.append(state)}
  equation.append(term)
 });
 appendSide(activeReaction.reactants);
 const arrow=document.createElement('span');arrow.className='equation-operator';arrow.textContent=activeReaction.arrow||'→';equation.append(arrow);
 appendSide(activeReaction.products);
 const category=REACTION_CATEGORIES.find(c=>c.id===activeReaction.category);
 txt('reaction-class',category?.label||'تفاعل كيميائي');
 txt('balance-counts',balance.elements.map(el=>el+': '+(balance.left[el]||0)+' = '+(balance.right[el]||0)).join(' · ')+' / CONSERVED');
 byId('balance-status').innerHTML=balance.balanced?'<i></i> المعادلة موزونة':'<i></i> تحتاج مراجعة';
 txt('reaction-title-ar',activeReaction.titleAr);txt('reaction-summary',activeReaction.summary);txt('reaction-observation',activeReaction.observation);txt('reaction-conditions',activeReaction.conditions);
 txt('reaction-mechanism',activeReaction.mechanism||'المعادلة الكلية لا تحدد آلية أولية لهذا التفاعل.');
 txt('ionic-equation',activeReaction.ionicEquation||'— لا توجد معادلة أيونية صافية لهذا التفاعل —');
 txt('ionic-note',activeReaction.ionicNote||'يُعرض التفاعل بصيغته الجزيئية الكلية.');
 txt('reaction-index',activeReaction.number+' / '+String(REACTIONS.length).padStart(2,'0'));
 txt('view-reaction-number','REACTION '+activeReaction.number)
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
 items.forEach(item=>{const button=document.createElement('button');button.type='button';button.className='material-item'+(selectedMaterial===item.id?' is-active':'');const symbol=document.createElement('span');symbol.className='material-symbol';symbol.textContent=item.formulaDisplay;const info=document.createElement('span');const name=document.createElement('b');name.textContent=item.nameAr;const meta=document.createElement('small');meta.textContent=(item.kind==='element'?'عنصر':'مركب')+' / '+(phaseArabic[item.phase]||item.phase);info.append(name,meta);button.append(symbol,info);button.addEventListener('click',()=>{selectedMaterial=item.id;selectedSpecies=item.id;activeCategory='all';renderCategories();renderReactionList();renderMaterials();updateSelectedMaterial()});list.append(button)});
 if(!items.length){const empty=document.createElement('div');empty.className='empty-state';empty.textContent='لا توجد مواد مطابقة.';list.append(empty)}
}
function updateSelectedMaterial(){
 const item=getMaterialById(selectedMaterial);if(!item)return;txt('selected-symbol',item.formulaDisplay);txt('selected-name',item.nameAr);txt('selected-meta',(item.kind==='element'?'عنصر':'مركب')+' / '+(phaseArabic[item.phase]||item.phase));txt('selected-description',item.description);
 const reactions=findReactionsForSpecies(item.id),container=byId('related-reactions');container.replaceChildren();if(!reactions.length){container.textContent='لا توجد تفاعلات في المكتبة الحالية.';return}
 reactions.forEach(r=>{const button=document.createElement('button');button.type='button';button.textContent=r.number+' · '+r.titleAr;button.addEventListener('click',()=>selectReaction(r.id));container.append(button)})
}
function renderLegend(){const root=byId('atom-legend');root.replaceChildren();ELEMENTS.forEach(el=>{const item=document.createElement('span');item.className='atom-key';const dot=document.createElement('i');dot.style.background=el.color;const text=document.createElement('span');text.textContent=el.symbol+' / '+el.name;item.append(dot,text);root.append(item)})}
function selectReaction(id){
 const next=getReactionById(id);if(!next)return;activeReaction=next;selectedSpecies=null;selectedMaterial=next.reactants[0].species;activeCategory='all';initialAmounts=Object.fromEntries(next.reactants.map(item=>[item.species,'0.100']));
 playing=false;progress=0;lastTime=0;renderCategories();renderReactionList();renderMaterials();updateSelectedMaterial();updateReactionDisplay();updateAmounts();
 if(reactantRoot&&productRoot){buildSide(reactantRoot,activeReaction.reactants,'reactants');buildSide(productRoot,activeReaction.products,'products');updateTimeline(0)}
 void activateAtomResolvedView(id).then(()=>updateTimeline(progress));
 byId('play-reaction').textContent='▶ ابدأ المحاكاة'
}
function init(){
 txt('reaction-total',REACTIONS.length);renderScene();renderCategories();renderReactionList();renderMaterials();renderLegend();updateReactionDisplay();initialAmounts=Object.fromEntries(activeReaction.reactants.map(item=>[item.species,'0.100']));updateAmounts();updateSelectedMaterial();
 if(reactantRoot&&productRoot){buildSide(reactantRoot,activeReaction.reactants,'reactants');buildSide(productRoot,activeReaction.products,'products');updateTimeline(0)}
 byId('reaction-search').addEventListener('input',renderReactionList);byId('material-search').addEventListener('input',renderMaterials);
 document.querySelectorAll('[data-material-filter]').forEach(button=>button.addEventListener('click',()=>{activeMaterialFilter=button.dataset.materialFilter;document.querySelectorAll('[data-material-filter]').forEach(b=>b.classList.toggle('is-active',b===button));renderMaterials()}));
 byId('play-reaction').addEventListener('click',()=>{if(playing){playing=false;byId('play-reaction').textContent='▶ استكمال';lastTime=0;return}if(progress>=1)updateTimeline(0);playing=true;lastTime=0;byId('play-reaction').textContent='Ⅱ إيقاف مؤقت'});
 byId('reset-reaction').addEventListener('click',()=>{playing=false;lastTime=0;updateTimeline(0);byId('play-reaction').textContent='▶ ابدأ المحاكاة'});
 byId('reset-camera').addEventListener('click',()=>{camera?.position.set(0,atomEngineState?3.1:5.2,atomEngineState?9.4:14);orbit?.target.set(0,atomEngineState?0:.9,0);orbit?.update()});
 void activateAtomResolvedView(activeReaction.id).then(()=>updateTimeline(progress))
}
init();
