const ELEMENT_ATOMIC_NUMBERS=Object.freeze({H:1,O:8,Na:11,Cl:17});

/*
 * Atom map for aqueous strong-acid/strong-base neutralization.
 * The aqueous reactants are represented as H3O+ and OH-; Na+ and Cl-
 * remain spectator ions. The transferring hydrogen changes its bonded
 * oxygen partner while every atom ID is retained.
 *
 * H3O+ + OH- -> 2 H2O
 * Formal net ionic balance: H4O2 on each side; charge +1 + -1 = 0.
 * Coordinates are explanatory keyframes, not measured molecular geometry.
 */
export const NEUTRALIZATION_ATOMS=Object.freeze([
 Object.freeze({id:1001,element:'O',start:[-1.5,.55,0],transition:[-.9,.55,0],end:[-1.2,.55,0]}),
 Object.freeze({id:1002,element:'H',start:[-1.2,1.25,.3],transition:[-1.15,1.12,.2],end:[-1.35,1.05,.2]}),
 Object.freeze({id:1003,element:'H',start:[-2.1,.25,.3],transition:[-1.95,.3,.3],end:[-1.95,.35,.3]}),
 Object.freeze({id:1004,element:'H',start:[-1.4,-.25,0],transition:[-.1,-.05,0],end:[.4,.95,0]}),
 Object.freeze({id:1005,element:'O',start:[1.15,0,0],transition:[.45,-.1,0],end:[1.1,.55,0]}),
 Object.freeze({id:1006,element:'H',start:[1.75,-.65,.3],transition:[1.25,-.7,.3],end:[1.65,1.15,.3]}),
 Object.freeze({id:1007,element:'Na',start:[-.15,-1.5,-.4],transition:[-.15,-1.5,-.4],end:[-.15,-1.5,-.4]}),
 Object.freeze({id:1008,element:'Cl',start:[.45,-1.7,.4],transition:[.45,-1.7,.4],end:[.45,-1.7,.4]})
]);
export const NEUTRALIZATION_BONDS=Object.freeze([
 Object.freeze({a:0,b:1,kind:0,start:1,transition:1,end:1}),
 Object.freeze({a:0,b:2,kind:0,start:1,transition:1,end:1}),
 Object.freeze({a:0,b:3,kind:0,start:1,transition:.5,end:0}),
 Object.freeze({a:4,b:5,kind:0,start:1,transition:1,end:1}),
 Object.freeze({a:4,b:3,kind:0,start:0,transition:.5,end:1})
]);

export function createNeutralizationInput(){
 return {
  atoms:NEUTRALIZATION_ATOMS.map(atom=>({
   atomicNumber:ELEMENT_ATOMIC_NUMBERS[atom.element],id:atom.id,
   start:[...atom.start],transition:[...atom.transition],end:[...atom.end]
  })),
  bonds:NEUTRALIZATION_BONDS.map(bond=>({...bond}))
 };
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

export function configureNeutralizationEngine(engine){
 const input=createNeutralizationInput(),atomCount=input.atoms.length,bondCount=input.bonds.length;
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
 return Object.freeze({atomCount,bondCount,samplePointer:pointer});
}
