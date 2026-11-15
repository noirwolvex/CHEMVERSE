const WET_MOUNT_SAMPLES = new Set(['barium-sulfate', 'oil-emulsion']);
const STEP_LIBRARY = Object.freeze({
 clean: Object.freeze({id:'clean-slide',title:'Clean the glass slide',detail:'Wipe both faces with a clean lint-free tissue so dust and fingerprints do not obscure the field.',action:'CLEAN SLIDE'}),
 medium: Object.freeze({id:'add-mounting-medium',title:'Add a drop of mounting medium',detail:'Add one small drop of water-based medium for this wet-mount specimen.',action:'ADD MEDIUM'}),
 pick: Object.freeze({id:'pick-specimen',title:'Pick up a small specimen',detail:'Use a clean dropper or fine-tip tool to collect a very small amount from the sample tray.',action:'PICK UP SAMPLE'}),
 transfer: Object.freeze({id:'transfer-specimen',title:'Transfer specimen to the slide',detail:'Place the sample into the centre of the prepared glass slide without overloading it.',action:'PLACE SPECIMEN'}),
 cover: Object.freeze({id:'apply-coverslip',title:'Lower the coverslip',detail:'Lower one edge first, then ease the coverslip down to reduce trapped air bubbles.',action:'LOWER COVERSLIP'}),
 mount: Object.freeze({id:'mount-slide',title:'Mount slide on the stage',detail:'Move the prepared slide onto the microscope stage and secure it with the stage clips.',action:'MOUNT ON STAGE'})
});
export function getSlidePreparationPlan(sampleId) {
 if (typeof sampleId !== 'string' || !sampleId.trim()) return [];
 const steps=[STEP_LIBRARY.clean];
 if(WET_MOUNT_SAMPLES.has(sampleId))steps.push(STEP_LIBRARY.medium);
 steps.push(STEP_LIBRARY.pick,STEP_LIBRARY.transfer,STEP_LIBRARY.cover,STEP_LIBRARY.mount);
 return steps.map(step=>Object.freeze({...step}));
}
export function createSlidePreparationState(sampleId) {
 return Object.freeze({sampleId:typeof sampleId==='string'?sampleId:'',completed:Object.freeze([]),samplePicked:false,mounted:false});
}
export function getSlidePreparationProgress(state) {
 const plan=getSlidePreparationPlan(state?.sampleId),completed=Array.isArray(state?.completed)?state.completed:[];
 return Object.freeze({completed:completed.length,total:plan.length,percent:plan.length?Math.round(completed.length/plan.length*100):0,nextStep:plan[completed.length]||null,mounted:Boolean(state?.mounted)});
}
export function completeSlidePreparationStep(state,stepId) {
 const progress=getSlidePreparationProgress(state);
 if(!progress.nextStep||progress.nextStep.id!==stepId)return Object.freeze({accepted:false,state,progress});
 const completed=[...state.completed,stepId],nextState=Object.freeze({sampleId:state.sampleId,completed:Object.freeze(completed),samplePicked:Boolean(state.samplePicked||stepId==='pick-specimen'),mounted:stepId==='mount-slide'});
 return Object.freeze({accepted:true,state:nextState,progress:getSlidePreparationProgress(nextState)});
}
