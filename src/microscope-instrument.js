import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createMicroscopeInstrument(options={}){
 const canvas=options.canvas||document.getElementById('instrument-canvas'),status=document.getElementById('instrument-status'),readout=document.getElementById('objective-readout'),raiseButton=document.getElementById('raise-microscope'),eyeButton=document.getElementById('look-through-eyepiece'),objectiveButtons=[...document.querySelectorAll('[data-objective]')],coarse=document.getElementById('coarse-focus'),fine=document.getElementById('instrument-fine-focus'),lampInput=document.getElementById('instrument-lamp'),oilButton=document.getElementById('apply-immersion-oil');
 if(!canvas)throw new Error('Microscope instrument canvas is missing');
 let renderer;
 try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'})}
 catch(error){if(status)status.textContent='3D VIEW UNAVAILABLE — SPECIMEN CONTROLS REMAIN ACTIVE';canvas.hidden=true;return{setSample(){},setMode(){},setPreparationState(){},setFineFocus(){},setLamp(){},dispose(){}}}
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x101b24);scene.fog=new THREE.Fog(0x101b24,9,19);
 const camera=new THREE.PerspectiveCamera(38,1,.1,60),target=new THREE.Vector3(0,1.45,0);
 const mat=(color,roughness=.42,metalness=.1,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
 const shell=mat(0xf0f3ed,.31,.12),steel=mat(0x71868b,.25,.78),dark=mat(0x263b43,.32,.75),black=mat(0x17252b,.2,.25),rubber=mat(0x121c22,.86,.02);
 const glass=new THREE.MeshPhysicalMaterial({color:0xb8e8e7,transparent:true,opacity:.24,roughness:.08,transmission:.48,thickness:.08,side:THREE.DoubleSide});
 const lensGlass=new THREE.MeshPhysicalMaterial({color:0x8bc9d4,transparent:true,opacity:.68,roughness:.08,metalness:.12,transmission:.28});
 const emitter=new THREE.MeshStandardMaterial({color:0xdff8db,emissive:0x8be9c5,emissiveIntensity:.9,roughness:.2});
 const root=new THREE.Group();scene.add(root);
 function box(parent,size,pos,material,r=.045){const m=new THREE.Mesh(new RoundedBoxGeometry(size[0],size[1],size[2],4,r),material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function cylinder(parent,top,bottom,height,pos,material,segments=32){const m=new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,segments),material);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 function between(parent,start,end,radius,material){const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),d=new THREE.Vector3().subVectors(b,a),m=new THREE.Mesh(new THREE.CylinderGeometry(radius*.92,radius,d.length(),32),material);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.castShadow=true;parent.add(m);return m}
 scene.add(new THREE.HemisphereLight(0xdff6f3,0x34444a,2.2));
 const key=new THREE.DirectionalLight(0xffedcf,3.2);key.position.set(-4,8,5);scene.add(key);
 const rim=new THREE.PointLight(0x5ccfba,22,9,2);rim.position.set(3,3.8,-2.3);scene.add(rim);
 const table=new THREE.Mesh(new THREE.PlaneGeometry(12,12),mat(0x263a40,.78,.05));table.rotation.x=-Math.PI/2;table.position.y=-.015;table.receiveShadow=true;scene.add(table);
 // Weighted metal foot, rear pillar and curved support arm.
 box(root,[2.8,.22,1.9],[0,.17,0],dark,.12);box(root,[2.35,.12,1.52],[0,.29,0],steel,.08);
 box(root,[.25,1.42,.28],[0,1.03,-.63],steel,.09);
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.42,-.63),new THREE.Vector3(0,1.25,-.63),new THREE.Vector3(0,2.08,-.58),new THREE.Vector3(0,2.47,-.25),new THREE.Vector3(0,2.43,.08)]);
 const arm=new THREE.Mesh(new THREE.TubeGeometry(curve,48,.14,18,false),shell);arm.castShadow=true;arm.receiveShadow=true;root.add(arm);
 cylinder(root,.2,.2,.17,[0,2.24,-.12],steel);cylinder(root,.14,.14,.2,[0,2.24,0],dark);
 // Stage, clips, condenser, illuminator and a movable glass slide.
 const stage=new THREE.Group();stage.position.set(0,1.37,.25);root.add(stage);
 box(stage,[1.85,.13,1.26],[0,0,0],dark,.065);box(stage,[1.7,.035,1.12],[0,.085,0],steel,.025);
 box(stage,[.12,.07,.28],[-.75,.15,0],shell,.02);box(stage,[.12,.07,.28],[.75,.15,0],shell,.02);
 cylinder(root,.24,.28,.27,[0,1.04,.25],dark);cylinder(root,.19,.19,.1,[0,.88,.25],steel);
 const lamp=cylinder(root,.18,.18,.08,[0,.81,.25],emitter);const lampLight=new THREE.PointLight(0xc9ffdf,2.4,3.4,2);lampLight.position.set(0,1,.25);root.add(lampLight);
 const slide=new THREE.Group();stage.add(slide);const glassSlide=box(slide,[1.28,.025,.72],[0,.12,0],glass,.025);
 const coverMat=glass.clone();coverMat.opacity=.42;const coverslip=box(slide,[.48,.008,.42],[0,.145,0],coverMat,.012);coverslip.visible=false;
 const droplet=new THREE.Mesh(new THREE.SphereGeometry(.13,24,16),new THREE.MeshPhysicalMaterial({color:0x75cadb,transparent:true,opacity:.38,roughness:.08,transmission:.3}));droplet.scale.set(1,.09,.75);droplet.position.set(0,.145,0);droplet.visible=false;slide.add(droplet);
 const immersionOil=new THREE.Mesh(new THREE.SphereGeometry(.16,32,20),new THREE.MeshPhysicalMaterial({color:0xe2f0cf,transparent:true,opacity:.36,roughness:.04,transmission:.82,thickness:.03}));immersionOil.scale.set(2.25,.09,1.75);immersionOil.position.set(0,.172,0);immersionOil.visible=false;slide.add(immersionOil);
 const grains=new THREE.Group();slide.add(grains);
 // Revolving turret, three objectives and the inclined eyepiece tube.
 const head=new THREE.Group();head.position.set(0,2.22,.02);root.add(head);const nosepiece=new THREE.Group();head.add(nosepiece);
 cylinder(nosepiece,.36,.36,.13,[0,0,.22],steel,48);
 const objectives=[4,10,40,100];
 const objectiveRings=new Map([[4,mat(0xd94b43,.28,.36)],[10,mat(0xdfc23b,.28,.36)],[40,mat(0x4786d2,.28,.36)],[100,mat(0xe8e8df,.28,.36)]]);
 objectives.forEach((value,i)=>{const a=Math.PI/4+Math.PI*2*i/objectives.length,unit=new THREE.Group();unit.position.set(Math.sin(a)*.31,-.12,.22+Math.cos(a)*.31);const length=value===100?.53:value===40?.43:.34;cylinder(unit,.095,.078,length,[0,-.22,0],value===40||value===100?shell:steel,24);cylinder(unit,.073,.073,.045,[0,-.22-length*.7,0],dark,24);cylinder(unit,.052,.052,.018,[0,-.22-length*.82,0],lensGlass,24);cylinder(unit,.102,.102,.035,[0,-.035,0],objectiveRings.get(value),28);nosepiece.add(unit)});
 between(head,[0,.1,.24],[0,.81,.72],.14,dark);between(head,[0,.76,.69],[0,.93,.81],.19,rubber);between(head,[0,.86,.76],[0,.95,.82],.13,lensGlass);box(head,[.52,.16,.34],[0,.03,.21],shell,.045);
 // Paired focus wheels rotate when the slide or objective is focused.
 const focusWheels=[];
 for(const side of [-1,1]){const large=cylinder(root,.28,.28,.13,[side*.25,1.63,-.42],dark,48);large.rotation.z=Math.PI/2;const small=cylinder(root,.17,.17,.15,[side*.33,1.63,-.42],steel,40);small.rotation.z=Math.PI/2;const inner=cylinder(root,.1,.1,.16,[side*.4,1.63,-.42],black,32);inner.rotation.z=Math.PI/2;focusWheels.push({large,inner})}
 const colours={'nacl-crystals':0xe4e9df,'sucrose-crystals':0xe0d0a8,'copper-sulfate':0x258fcb,'iodine-crystals':0x78508b,'barium-sulfate':0xe6ede7,'oil-emulsion':0x9fd0c2,'cellulose-fibres':0xd6c9a8,'insoluble-powder':0xa9b1a8};
 let sampleId='nacl-crystals',objective=10,mode='light',raised=false,eye=false,oilApplied=false,slideState=null,disposed=false,frame=0,dragging=false,last={x:0,y:0},tween=null;
 const spherical=new THREE.Spherical();let targetPoint=new THREE.Vector3(0,1.45,0);
 camera.position.set(4.5,3.45,6.4);camera.lookAt(targetPoint);
 function syncSpherical(){spherical.setFromVector3(new THREE.Vector3().subVectors(camera.position,targetPoint))}
 syncSpherical();
 function setStatus(message){if(status)status.textContent=message}
 function updateSlide(hasSample,hasMedium,hasCover,mounted){
  slide.position.x=mounted?0:1.16;droplet.visible=Boolean(hasMedium);coverslip.visible=Boolean(hasCover);grains.clear();
  if(hasSample){let seed=sampleId.split('').reduce((v,ch)=>v+ch.charCodeAt(0),17)>>>0;const next=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
   const count=sampleId==='cellulose-fibres'?11:26,colour=colours[sampleId]||0xc6d2cc;
   for(let i=0;i<count;i++){const size=sampleId==='cellulose-fibres'?.018:.012+next()*.018,grain=new THREE.Mesh(new THREE.SphereGeometry(size,10,8),mat(colour,.3,.04));grain.position.set((next()-.5)*.32,.145+next()*.012,(next()-.5)*.24);if(sampleId==='cellulose-fibres')grain.scale.set(1,.55,3.8);grain.castShadow=true;grains.add(grain)}
  }
  glassSlide.material.opacity=.34;slideState={hasSample,hasMedium,hasCover,mounted};immersionOil.visible=oilApplied&&mounted;updateControls();
 }
 function updateControls(){
  const optical=mode==='light';
  objectiveButtons.forEach(b=>{const value=Number(b.dataset.objective),active=value===objective,requiresOil=value===100;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active));b.disabled=!optical||(requiresOil&&(!oilApplied||!slideState?.mounted))});
  if(coarse)coarse.disabled=!optical||objective>=40;
  [fine,lampInput].forEach(el=>{if(el)el.disabled=!optical});
  if(oilButton){oilButton.disabled=!optical||!slideState?.mounted||objective!==40;oilButton.textContent=oilApplied?'REMOVE IMMERSION OIL':'APPLY IMMERSION OIL';oilButton.classList.toggle('is-active',oilApplied)}
  if(raiseButton){raiseButton.disabled=!optical;raiseButton.textContent=raised?'RETURN TO BENCH VIEW':'RAISE TO EYE LEVEL'}
  if(eyeButton){eyeButton.disabled=!optical||!slideState?.mounted;eyeButton.textContent=eye?'RETURN TO SPECIMEN VIEW':'LOOK THROUGH EYEPIECE'}
  if(readout)readout.textContent=objective+'× OBJECTIVE  /  '+(objective*10)+'× TOTAL'+(objective===100?' / OIL':'');
 }
 function setObjective(value){
  if(!objectives.includes(value)||mode!=='light')return;
  if(value===100&&(!oilApplied||!slideState?.mounted)){setStatus('100× OIL OBJECTIVE REQUIRES A MOUNTED SLIDE AND IMMERSION OIL');updateControls();return}
  objective=value;const index=objectives.indexOf(value);nosepiece.rotation.y=-Math.PI*2*index/objectives.length;
  focusWheels.forEach(({large,inner},i)=>{large.rotation.y=(i?-1:1)*index*.42;inner.rotation.y=(i?1:-1)*index*.72});
  objectiveButtons.forEach(b=>{const active=Number(b.dataset.objective)===value;b.classList.toggle('is-active',active);b.setAttribute('aria-pressed',String(active))});
  if(readout)readout.textContent=value+'× OBJECTIVE  /  '+(value*10)+'× TOTAL'+(value===100?' / OIL':'');
  if(options.onObjectiveChange)options.onObjectiveChange(value);
  updateControls();
 }
 function setCoarse(value){if(objective>=40)return;const v=clamp(Number(value)||0,0,100);stage.position.y=1.37+((v-50)/50)*.10;focusWheels.forEach(({large},i)=>{large.rotation.x=(v-50)*.012*(i?-1:1)})}
 function setFine(value){const v=clamp(Number(value)||0,0,100);nosepiece.position.y=((v-50)/50)*(objective>=40?.022:.045);if(options.onFineFocusChange)options.onFineFocusChange(v)}
 function setLamp(value){const v=clamp(Number(value)||0,0,100),intensity=v/100;emitter.emissiveIntensity=.08+intensity*1.1;lampLight.intensity=.15+intensity*3.8;if(options.onLampChange)options.onLampChange(v)}
 function moveCamera(toEye){
  const endPosition=toEye?new THREE.Vector3(2.55,3.05,4.25):new THREE.Vector3(4.5,3.45,6.4),endTarget=toEye?new THREE.Vector3(0,2,0.38):new THREE.Vector3(0,1.45,0);
  tween={startPosition:camera.position.clone(),endPosition,startTarget:targetPoint.clone(),endTarget,startedAt:performance.now(),duration:720};raised=toEye;head.rotation.x=toEye?-.11:.02;setStatus(toEye?'EYE-LEVEL / TURN THE OBJECTIVE':'BENCH VIEW / OPTICAL MICROSCOPE');updateControls();
 }
 function toggleEye(){if(mode!=='light'||!slideState?.mounted)return;eye=!eye;if(options.onEyepieceViewChange)options.onEyepieceViewChange(eye);setStatus(eye?'EYEPIECE VIEW / SLIDE MOUNTED':(raised?'EYE-LEVEL / OPTICAL MICROSCOPE':'BENCH VIEW / OPTICAL MICROSCOPE'));updateControls()}
 function resize(){const w=Math.max(1,canvas.clientWidth||canvas.parentElement?.clientWidth||700),h=Math.max(1,canvas.clientHeight||390);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
 function render(){
  if(disposed)return;frame=window.requestAnimationFrame(render);
  if(tween){const raw=clamp((performance.now()-tween.startedAt)/tween.duration,0,1),e=raw*raw*(3-2*raw);camera.position.lerpVectors(tween.startPosition,tween.endPosition,e);targetPoint.lerpVectors(tween.startTarget,tween.endTarget,e);camera.lookAt(targetPoint);if(raw>=1){tween=null;syncSpherical()}}
  renderer.render(scene,camera)
 }
 function down(e){dragging=true;last={x:e.clientX,y:e.clientY};canvas.setPointerCapture?.(e.pointerId);canvas.classList.add('is-dragging')}
 function move(e){if(!dragging||tween)return;const dx=e.clientX-last.x,dy=e.clientY-last.y;last={x:e.clientX,y:e.clientY};spherical.theta-=dx*.008;spherical.phi=clamp(spherical.phi+dy*.007,.42,1.48);camera.position.setFromSpherical(spherical).add(targetPoint);camera.lookAt(targetPoint)}
 function up(e){dragging=false;canvas.classList.remove('is-dragging');canvas.releasePointerCapture?.(e.pointerId)}
 function wheel(e){e.preventDefault();spherical.radius=clamp(spherical.radius+e.deltaY*.004,3.4,9.5);camera.position.setFromSpherical(spherical).add(targetPoint);camera.lookAt(targetPoint)}
 objectiveButtons.forEach(b=>b.addEventListener('click',()=>setObjective(Number(b.dataset.objective))));
 raiseButton?.addEventListener('click',()=>moveCamera(!raised));eyeButton?.addEventListener('click',toggleEye);
 oilButton?.addEventListener('click',()=>{if(!slideState?.mounted||objective!==40||mode!=='light')return;oilApplied=!oilApplied;immersionOil.visible=oilApplied;setStatus(oilApplied?'IMMERSION OIL APPLIED / 100× OBJECTIVE AVAILABLE':'IMMERSION OIL REMOVED / DRY OBJECTIVES ONLY');updateControls();if(options.onImmersionOilChange)options.onImmersionOilChange(oilApplied)});
 coarse?.addEventListener('input',()=>setCoarse(coarse.value));fine?.addEventListener('input',()=>setFine(fine.value));lampInput?.addEventListener('input',()=>setLamp(lampInput.value));
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('wheel',wheel,{passive:false});
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;if(observer)observer.observe(canvas.parentElement||canvas);else window.addEventListener('resize',resize,{passive:true});
 resize();setObjective(10);setCoarse(50);setFine(50);setLamp(78);setStatus('BENCH VIEW / OPTICAL MICROSCOPE');updateSlide(false,false,false,false);render();
 function dispose(){disposed=true;window.cancelAnimationFrame(frame);observer?.disconnect();if(!observer)window.removeEventListener('resize',resize);renderer.dispose()}
 window.addEventListener('pagehide',dispose,{once:true});
 return{
  setSample(id){sampleId=String(id||'nacl-crystals');oilApplied=false;immersionOil.visible=false;if(objective===100)setObjective(40);if(slideState)updateSlide(false,false,false,false)},
  setMode(id){mode=String(id||'light');if(eye&&mode!=='light'){eye=false;if(options.onEyepieceViewChange)options.onEyepieceViewChange(false)}setStatus(mode==='light'?'OPTICAL INSTRUMENT / READY':mode.toUpperCase()+' IS A SEPARATE IMAGING SYSTEM');updateControls()},
  setPreparationState(state){if(!state)return;const changedSample=state.sampleId!==sampleId;sampleId=state.sampleId||sampleId;if(changedSample){oilApplied=false;immersionOil.visible=false;if(objective===100)setObjective(40)}slideState=state;updateSlide(state.completed.includes('transfer-specimen'),state.completed.includes('add-mounting-medium'),state.completed.includes('apply-coverslip'),Boolean(state.mounted))},
  setImmersionOil(value){oilApplied=Boolean(value)&&Boolean(slideState?.mounted);immersionOil.visible=oilApplied;updateControls();return oilApplied},
  getState(){return Object.freeze({objective,oilApplied,mounted:Boolean(slideState?.mounted),mode,raised,eye})},
  setObjective,setCoarseFocus:setCoarse,setFineFocus:setFine,setLamp,dispose
 }
}
