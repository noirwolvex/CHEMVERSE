import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ELEMENTS,MATERIALS,REACTIONS,REACTION_CATEGORIES,calculateStoichiometry,findReactionsForSpecies,getMaterialById,getReactionAtomBalance,getReactionById,validateReactionBalance} from './compound-reactions.mjs';
const byId=id=>document.getElementById(id),materialById=new Map(MATERIALS.map(m=>[m.id,m])),atomColors=Object.fromEntries(ELEMENTS.map(e=>[e.symbol,e.color])),atomRadii={H:.2,C:.34,N:.33,O:.32,Na:.44,Mg:.43,S:.36,Cl:.42,Ca:.45,Fe:.45,Cu:.44,Zn:.43,Ag:.46,Ba:.5};
let activeReaction=getReactionById('water-synthesis'),activeCategory='all',activeMaterialFilter='all',selectedMaterial='h2',selectedSpecies=null,initialAmounts={},renderer=null,scene=null,camera=null,orbit=null,reactantRoot=null,productRoot=null,raf=0,playing=false,progress=0,lastTime=0;
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
function setOpacity(root,opacity){root.traverse(obj=>{if(obj.isMesh&&obj.material){obj.material.opacity=opacity;obj.material.transparent=true;obj.material.depthWrite=opacity>.98}})}
function setSideTransform(root,side,amount){root.children.forEach((m,i)=>{const base=m.userData.startPosition;if(!base)return;m.position.x=base.x+(side==='reactants'?1:-1)*amount*.26;m.position.y=base.y+Math.sin(amount*Math.PI+i)*.12;m.rotation.y=(i%2?-.16:.13)+amount*.25*(side==='reactants'?1:-1);m.scale.setScalar(.78*(side==='reactants'?1-.13*amount:.86+.14*amount))})}
function updateTimeline(value){progress=clamp(value,0,1);const vanish=smooth((progress-.26)/.43),appear=smooth((progress-.43)/.38);if(reactantRoot){setOpacity(reactantRoot,1-vanish);setSideTransform(reactantRoot,'reactants',progress)}if(productRoot){setOpacity(productRoot,appear);setSideTransform(productRoot,'products',progress)}const phase=progress<.26?'REACTANTS':progress<.76?'REARRANGEMENT':'PRODUCTS';txt('view-phase',phase);txt('stage-label',progress<.26?'المواد المتفاعلة':progress<.76?'إعادة ترتيب الذرات':'النواتج');txt('scene-caption',progress<.26?'المواد المتفاعلة قبل إعادة ترتيب الروابط':progress<.76?'تتغير الروابط مع بقاء عدد الذرات محفوظاً':'تمثيل النواتج بعد التفاعل');txt('progress-label',Math.round(progress*100)+'%');byId('timeline-progress').style.width=(progress*100)+'%'}
function renderScene(){
 const canvas=byId('molecule-canvas');try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'})}catch(error){byId('webgl-fallback').hidden=false;canvas.hidden=true;return}
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.outputColorSpace=THREE.SRGBColorSpace;scene=new THREE.Scene();scene.background=new THREE.Color(0x0c1721);scene.fog=new THREE.Fog(0x0c1721,14,27);
 camera=new THREE.PerspectiveCamera(42,1,.1,80);camera.position.set(0,5.2,14);scene.add(new THREE.HemisphereLight(0xe6f4f1,0x34434d,2.4));
 const key=new THREE.DirectionalLight(0xffe9c8,3.4);key.position.set(-5,9,7);scene.add(key);const fill=new THREE.PointLight(0x64cbb8,35,18,2);fill.position.set(4,4,2);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,10),new THREE.MeshStandardMaterial({color:0x172933,roughness:.9}));floor.rotation.x=-Math.PI/2;floor.position.y=-.25;scene.add(floor);
 reactantRoot=new THREE.Group();productRoot=new THREE.Group();scene.add(reactantRoot,productRoot);orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.06;orbit.minDistance=7;orbit.maxDistance=23;orbit.maxPolarAngle=Math.PI*.49;orbit.target.set(0,.9,0);
 const resize=()=>{const w=Math.max(1,canvas.clientWidth),h=Math.max(1,canvas.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;if(observer)observer.observe(canvas.parentElement||canvas);else window.addEventListener('resize',resize,{passive:true});resize();
 window.addEventListener('pagehide',()=>{observer?.disconnect();if(!observer)window.removeEventListener('resize',resize);orbit?.dispose();renderer?.dispose();cancelAnimationFrame(raf)},{once:true});
 const loop=now=>{raf=requestAnimationFrame(loop);if(playing){const delta=lastTime?Math.min(50,now-lastTime):0;updateTimeline(progress+delta/durationMs);if(progress>=1){playing=false;txt('play-reaction','↻ إعادة المحاكاة');txt('scene-caption','اكتمل العرض البصري للنواتج')}}lastTime=now;orbit?.update();renderer.render(scene,camera)};
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
function updateAmounts(){
 const container=byId('reactant-amounts');container.replaceChildren();
 for(const entry of activeReaction.reactants){const item=materialById.get(entry.species),row=document.createElement('div');row.className='amount-row';const label=document.createElement('label');label.htmlFor='amount-'+item.id;label.textContent=item.nameAr+' / '+item.formulaDisplay;const input=document.createElement('input');input.type='number';input.id='amount-'+item.id;input.min='0';input.max='1000';input.step='0.001';input.value=initialAmounts[item.id]??'0.100';input.inputMode='decimal';input.addEventListener('input',()=>{initialAmounts[item.id]=input.value;updateStoichiometry()});row.append(label,input);container.append(row)}
 updateStoichiometry()
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
 playing=false;progress=0;lastTime=0;renderCategories();renderReactionList();renderMaterials();updateSelectedMaterial();updateReactionDisplay();updateAmounts();
 if(reactantRoot&&productRoot){buildSide(reactantRoot,activeReaction.reactants,'reactants');buildSide(productRoot,activeReaction.products,'products');updateTimeline(0)}
 byId('play-reaction').textContent='▶ ابدأ المحاكاة'
}
function init(){
 renderScene();renderCategories();renderReactionList();renderMaterials();renderLegend();updateReactionDisplay();initialAmounts={h2:'0.100',o2:'0.100'};updateAmounts();updateSelectedMaterial();
 if(reactantRoot&&productRoot){buildSide(reactantRoot,activeReaction.reactants,'reactants');buildSide(productRoot,activeReaction.products,'products');updateTimeline(0)}
 byId('reaction-search').addEventListener('input',renderReactionList);byId('material-search').addEventListener('input',renderMaterials);
 document.querySelectorAll('[data-material-filter]').forEach(button=>button.addEventListener('click',()=>{activeMaterialFilter=button.dataset.materialFilter;document.querySelectorAll('[data-material-filter]').forEach(b=>b.classList.toggle('is-active',b===button));renderMaterials()}));
 byId('play-reaction').addEventListener('click',()=>{if(playing){playing=false;byId('play-reaction').textContent='▶ استكمال';lastTime=0;return}if(progress>=1)updateTimeline(0);playing=true;lastTime=0;byId('play-reaction').textContent='Ⅱ إيقاف مؤقت'});
 byId('reset-reaction').addEventListener('click',()=>{playing=false;lastTime=0;updateTimeline(0);byId('play-reaction').textContent='▶ ابدأ المحاكاة'});
 byId('reset-camera').addEventListener('click',()=>{camera?.position.set(0,5.2,14);orbit?.target.set(0,.9,0);orbit?.update()})
}
init();
