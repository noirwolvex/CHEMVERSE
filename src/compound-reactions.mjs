export const ELEMENTS=Object.freeze([
{symbol:'H',name:'Hydrogen',nameAr:'الهيدروجين',atomicNumber:1,color:'#eef3f5'},
{symbol:'C',name:'Carbon',nameAr:'الكربون',atomicNumber:6,color:'#59646d'},
{symbol:'N',name:'Nitrogen',nameAr:'النيتروجين',atomicNumber:7,color:'#567ed1'},
{symbol:'O',name:'Oxygen',nameAr:'الأكسجين',atomicNumber:8,color:'#e45c54'},
{symbol:'Na',name:'Sodium',nameAr:'الصوديوم',atomicNumber:11,color:'#a68bd8'},
{symbol:'Mg',name:'Magnesium',nameAr:'المغنيسيوم',atomicNumber:12,color:'#58b9ad'},
{symbol:'S',name:'Sulfur',nameAr:'الكبريت',atomicNumber:16,color:'#e1b342'},
{symbol:'Cl',name:'Chlorine',nameAr:'الكلور',atomicNumber:17,color:'#76bd76'},
{symbol:'Ca',name:'Calcium',nameAr:'الكالسيوم',atomicNumber:20,color:'#68a8d7'},
{symbol:'Fe',name:'Iron',nameAr:'الحديد',atomicNumber:26,color:'#c38a52'},
{symbol:'Cu',name:'Copper',nameAr:'النحاس',atomicNumber:29,color:'#d58a4a'},
{symbol:'Zn',name:'Zinc',nameAr:'الزنك',atomicNumber:30,color:'#8ca6ac'},
{symbol:'Ag',name:'Silver',nameAr:'الفضة',atomicNumber:47,color:'#c8d1d9'},
{symbol:'Ba',name:'Barium',nameAr:'الباريوم',atomicNumber:56,color:'#a6b1bf'}
].map(Object.freeze));
const atom=(element,x,y,z)=>Object.freeze({element,x,y,z});
const material=(id,formula,formulaDisplay,nameAr,nameEn,kind,phase,description,atoms,bonds=[])=>Object.freeze({id,formula,formulaDisplay,nameAr,nameEn,kind,phase,description,atoms:Object.freeze(atoms.map(a=>Array.isArray(a)?atom(...a):a)),bonds:Object.freeze(bonds.map(b=>Object.freeze([...b])))});
export const MATERIALS=Object.freeze([
material('h2','H2','H₂','غاز الهيدروجين','Hydrogen','element','gas','عنصر يوجد في صورته الجزيئية الشائعة H₂.',[['H',-.36,0,0],['H',.36,0,0]],[[0,1]]),
material('o2','O2','O₂','غاز الأكسجين','Oxygen','element','عنصر ثنائي الذرة يدعم عمليات الأكسدة والاحتراق.',[['O',-.42,0,0],['O',.42,0,0]],[[0,1]]),
material('h2o','H2O','H₂O','الماء','Water','compound','جزيء منحني يتكون من ذرة أكسجين وذرتي هيدروجين.',[['O',0,0,0],['H',-.57,-.34,0],['H',.57,-.34,0]],[[0,1],[0,2]]),
material('mg','Mg','Mg','المغنيسيوم','Magnesium','element','فلز من عناصر المجموعة الثانية؛ يمثَّل هنا بوحدة فلزية نموذجية.',[['Mg',0,0,0]]),
material('mgo','MgO','MgO','أكسيد المغنيسيوم','Magnesium oxide','compound','مركب أيوني من Mg²⁺ وO²⁻؛ الزوج تمثيل مبسط لوحدة الصيغة.',[['Mg',-.42,0,0],['O',.42,0,0]],[[0,1]]),
material('h2o2','H2O2','H₂O₂','فوق أكسيد الهيدروجين','Hydrogen peroxide','compound','جزيء يحوي رابطة O–O وروابط O–H.',[['H',-.93,.2,0],['O',-.35,0,0],['O',.35,0,0],['H',.93,.2,0]],[[0,1],[1,2],[2,3]]),
material('fe','Fe','Fe','الحديد','Iron','element','فلز انتقالي يمكنه إزاحة النحاس من محلول كبريتات النحاس في التفاعل المعروض.',[['Fe',0,0,0]]),
material('cuso4','CuSO4','CuSO₄','كبريتات النحاس الثنائي','Copper(II) sulfate','compound','ملح أيوني في المحلول؛ الرسم يجمع أيون النحاس ومجموعة الكبريتات في نموذج مبسط.',[['Cu',-1.02,0,0],['S',.12,0,0],['O',.12,.68,0],['O',.12,-.68,0],['O',.12,0,.68],['O',.12,0,-.68]],[[1,2],[1,3],[1,4],[1,5]]),
material('feso4','FeSO4','FeSO₄','كبريتات الحديد الثنائي','Iron(II) sulfate','compound','ملح أيوني؛ يظهر الحديد ومجموعة الكبريتات بصورة تخطيطية.',[['Fe',-1.02,0,0],['S',.12,0,0],['O',.12,.68,0],['O',.12,-.68,0],['O',.12,0,.68],['O',.12,0,-.68]],[[1,2],[1,3],[1,4],[1,5]]),
material('cu','Cu','Cu','النحاس','Copper','element','عنصر فلزي يظهر في نواتج تفاعل الإزاحة المفردة.',[['Cu',0,0,0]]),
material('agno3','AgNO3','AgNO₃','نترات الفضة','Silver nitrate','compound','ملح أيوني؛ تمثل مجموعة النترات بروابط N–O ويظهر Ag كأيون منفصل.',[['Ag',-1.08,0,0],['N',.12,0,0],['O',.12,.67,0],['O',.7,-.34,0],['O',.7,.34,-.58]],[[1,2],[1,3],[1,4]]),
material('nacl','NaCl','NaCl','كلوريد الصوديوم','Sodium chloride','compound','مركب أيوني يمثّل بوحدة صيغة من أيوني الصوديوم والكلوريد.',[['Na',-.4,0,0],['Cl',.4,0,0]],[[0,1]]),
material('agcl','AgCl','AgCl','كلوريد الفضة','Silver chloride','compound','راسب أبيض قليل الذوبان يتكون عند اتحاد أيوني الفضة والكلوريد.',[['Ag',-.4,0,0],['Cl',.4,0,0]],[[0,1]]),
material('nano3','NaNO3','NaNO₃','نترات الصوديوم','Sodium nitrate','compound','ملح أيوني يضم أيون الصوديوم ومجموعة النترات.',[['Na',-1.08,0,0],['N',.12,0,0],['O',.12,.67,0],['O',.7,-.34,0],['O',.7,.34,-.58]],[[1,2],[1,3],[1,4]]),
material('hcl','HCl','HCl','كلوريد الهيدروجين','Hydrogen chloride','compound','جزيء ثنائي الذرة يمثل الحمض في معادلة التعادل.',[['H',-.4,0,0],['Cl',.4,0,0]],[[0,1]]),
material('naoh','NaOH','NaOH','هيدروكسيد الصوديوم','Sodium hydroxide','compound','قاعدة أيونية؛ يحتوي النموذج على أيون الصوديوم ومجموعة الهيدروكسيد.',[['Na',-.8,0,0],['O',.12,0,0],['H',.68,.2,0]],[[1,2]]),
material('ch4','CH4','CH₄','الميثان','Methane','compound','جزيء رباعي السطوح؛ ذرة كربون مركزية مرتبطة بأربع ذرات هيدروجين.',[['C',0,0,0],['H',.58,.58,.58],['H',-.58,-.58,.58],['H',-.58,.58,-.58],['H',.58,-.58,-.58]],[[0,1],[0,2],[0,3],[0,4]]),
material('co2','CO2','CO₂','ثاني أكسيد الكربون','Carbon dioxide','compound','جزيء خطي O=C=O.',[['O',-.82,0,0],['C',0,0,0],['O',.82,0,0]],[[0,1],[1,2]]),
material('caco3','CaCO3','CaCO₃','كربونات الكالسيوم','Calcium carbonate','compound','مركب أيوني يتكون من Ca²⁺ وأيون الكربونات.',[['Ca',-1.05,0,0],['C',.12,0,0],['O',.12,.72,0],['O',.72,-.38,0],['O',-.48,-.38,0]],[[1,2],[1,3],[1,4]]),
material('cao','CaO','CaO','أكسيد الكالسيوم','Calcium oxide','compound','مركب أيوني ناتج عن التحلل الحراري لكربونات الكالسيوم.',[['Ca',-.42,0,0],['O',.42,0,0]],[[0,1]]),
material('n2','N2','N₂','غاز النيتروجين','Nitrogen','element','عنصر ثنائي الذرة يشكل معظم الهواء الجوي.',[['N',-.42,0,0],['N',.42,0,0]],[[0,1]]),
material('nh3','NH3','NH₃','الأمونيا','Ammonia','compound','جزيء هرمي ثلاثي؛ ذرة نيتروجين مرتبطة بثلاث ذرات هيدروجين.',[['N',0,.18,0],['H',-.55,-.3,.42],['H',.55,-.3,.42],['H',0,-.3,-.62]],[[0,1],[0,2],[0,3]]),
material('co','CO','CO','أول أكسيد الكربون','Carbon monoxide','compound','جزيء ثنائي الذرة يظهر في معادلة أكسدة تعليمية فقط.',[['C',-.4,0,0],['O',.4,0,0]],[[0,1]]),
material('zn','Zn','Zn','الزنك','Zinc','element','فلز يتفاعل مع الأحماض المخففة في نموذج الإزاحة المعروض.',[['Zn',0,0,0]]),
material('zncl2','ZnCl2','ZnCl₂','كلوريد الزنك','Zinc chloride','compound','ملح أيوني؛ النموذج يعرض وحدة صيغة مبسطة من الزنك وكلوريدين.',[['Zn',0,0,0],['Cl',-.7,0,0],['Cl',.7,0,0]],[[0,1],[0,2]]),
material('bacl2','BaCl2','BaCl₂','كلوريد الباريوم','Barium chloride','compound','ملح أيوني يظهر هنا ضمن نموذج ترسيب كبريتات الباريوم.',[['Ba',0,0,0],['Cl',-.7,0,0],['Cl',.7,0,0]],[[0,1],[0,2]]),
material('na2so4','Na2SO4','Na₂SO₄','كبريتات الصوديوم','Sodium sulfate','compound','ملح أيوني يضم أيوني صوديوم ومجموعة كبريتات.',[['Na',-1.25,0,0],['Na',1.25,0,0],['S',0,0,0],['O',0,.72,0],['O',0,-.72,0],['O',.72,0,0],['O',-.72,0,0]],[[2,3],[2,4],[2,5],[2,6]]),
material('baso4','BaSO4','BaSO₄','كبريتات الباريوم','Barium sulfate','compound','راسب أبيض قليل الذوبان يتكون عند اتحاد أيونات الباريوم والكبريتات.',[['Ba',-1.18,0,0],['S',.12,0,0],['O',.12,.68,0],['O',.12,-.68,0],['O',.12,0,.68],['O',.12,0,-.68]],[[1,2],[1,3],[1,4],[1,5]])
].map(Object.freeze));

export const REACTION_CATEGORIES=Object.freeze([
{id:'all',label:'كل التفاعلات'},{id:'synthesis',label:'الاتحاد'},{id:'decomposition',label:'التحلل'},{id:'displacement',label:'الإحلال'},{id:'precipitation',label:'الترسيب'},{id:'neutralization',label:'التعادل'},{id:'combustion',label:'الاحتراق والأكسدة'}
].map(Object.freeze));
const reaction=(id,number,category,title,titleAr,reactants,products,summary,observation,conditions,highlight)=>Object.freeze({
id,number,category,title,titleAr,
reactants:Object.freeze(reactants.map(([species,coefficient])=>Object.freeze({species,coefficient}))),
products:Object.freeze(products.map(([species,coefficient])=>Object.freeze({species,coefficient}))),
summary,observation,conditions,highlight
});
export const REACTIONS=Object.freeze([
reaction('water-synthesis','01','synthesis','Hydrogen + oxygen → water','تكوين الماء من الهيدروجين والأكسجين',[['h2',2],['o2',1]],[['h2o',2]],'اتحاد عنصرين لتكوين مركب جديد؛ يوضح النموذج إعادة ترتيب ذرات الهيدروجين والأكسجين لتكوين جزيئات الماء.','لاحظ اختفاء جزيئات H₂ وO₂ وظهور جزيئات H₂O في نموذج النواتج.','معادلة تعليمية موزونة؛ لا تمثل ظروف تشغيل أو قياس سرعة التفاعل.','H₂ + O₂ / H₂O'),
reaction('magnesium-oxide','02','combustion','Magnesium + oxygen → magnesium oxide','أكسدة المغنيسيوم وتكوين أكسيد المغنيسيوم',[['mg',2],['o2',1]],[['mgo',2]],'يتحد المغنيسيوم مع الأكسجين ليعطي أكسيد المغنيسيوم، وهو مثال على أكسدة فلز وتكوين أكسيد.','قارن ذرات Mg وO قبل التفاعل وبعده؛ عدد كل عنصر محفوظ.','عرض مفاهيمي فقط؛ لا يتضمن إشعالاً أو إرشادات إجراء عملي.','Mg + O₂ / MgO'),
reaction('peroxide-decomposition','03','decomposition','Hydrogen peroxide decomposition','تحلل فوق أكسيد الهيدروجين',[['h2o2',2]],[['h2o',2],['o2',1]],'يتحلل فوق أكسيد الهيدروجين إلى الماء والأكسجين. قد تؤثر المحفزات في السرعة الفعلية، لكن لا يجري هنا حساب حركية تجريبية.','تتبّع حفظ أربع ذرات أكسجين وأربع ذرات هيدروجين عبر جانبي المعادلة.','المعادلة موزونة؛ لم يتم افتراض قيمة لثابت سرعة أو مردود تجريبي.','H₂O₂ / H₂O + O₂'),
reaction('iron-copper-displacement','04','displacement','Iron displaces copper from copper sulfate','إزاحة النحاس بالحديد من كبريتات النحاس',[['fe',1],['cuso4',1]],[['feso4',1],['cu',1]],'تفاعل إحلال مفرد؛ يتأكسد الحديد وتُختزل أيونات النحاس إلى نحاس فلزي.','ابحث عن النحاس في النواتج، ولاحظ أن مجموعة الكبريتات تنتقل إلى ملح الحديد.','تمثيل ستوكيومتري مبسط؛ لا يتنبأ بمعدل الترسيب أو تغير اللون المقاس.','Fe + CuSO₄ / FeSO₄ + Cu'),
reaction('silver-chloride-precipitation','05','precipitation','Silver chloride precipitation','ترسيب كلوريد الفضة',[['agno3',1],['nacl',1]],[['agcl',1],['nano3',1]],'تفاعل تبادل أيوني يتكون فيه كلوريد الفضة الصلب قليل الذوبان.','يتكون راسب AgCl بينما تبقى أيونات الصوديوم والنترات في المحلول.','الحالة الفيزيائية للراسب موضحة نوعياً؛ لا يحسب النموذج الذوبانية أو حجم الجسيمات.','AgNO₃ + NaCl / AgCl↓'),
reaction('acid-base-neutralization','06','neutralization','Hydrochloric acid + sodium hydroxide','تعادل حمض الهيدروكلوريك وهيدروكسيد الصوديوم',[['hcl',1],['naoh',1]],[['nacl',1],['h2o',1]],'تفاعل تعادل بين حمض قوي وقاعدة قوية ينتج عنه ملح وماء.','المعادلة الأيونية الصافية هي H⁺ + OH⁻ → H₂O.','المعادلة الجزيئية موزونة؛ لا يتم حساب pH النهائي أو تغير الحرارة.','HCl + NaOH / NaCl + H₂O'),
reaction('methane-combustion','07','combustion','Methane combustion','احتراق الميثان',[['ch4',1],['o2',2]],[['co2',1],['h2o',2]],'يتأكسد الميثان في وجود الأكسجين ليكوّن ثاني أكسيد الكربون والماء.','تتبع ذرة الكربون وأربع ذرات هيدروجين وأربع ذرات أكسجين قبل وبعد التفاعل.','معادلة احتراق كاملة مثالية؛ لا تمثل احتراقاً فعلياً أو قياس طاقة.','CH₄ + 2O₂ / CO₂ + 2H₂O'),
reaction('calcium-carbonate-decomposition','08','decomposition','Calcium carbonate thermal decomposition','التحلل الحراري لكربونات الكالسيوم',[['caco3',1]],[['cao',1],['co2',1]],'يتحلل كربونات الكالسيوم إلى أكسيد الكالسيوم وثاني أكسيد الكربون عند التسخين المناسب.','تنتقل ذرات الأكسجين الثلاث إلى أكسيد الكالسيوم وثاني أكسيد الكربون.','الطاقة الحرارية مطلوبة للتفاعل؛ لا تمثل الصفحة درجة حرارة تجريبية محددة.','CaCO₃ / CaO + CO₂'),
reaction('haber-ammonia-synthesis','09','synthesis','Nitrogen + hydrogen → ammonia','تكوين الأمونيا من النيتروجين والهيدروجين',[['n2',1],['h2',3]],[['nh3',2]],'تفاعل اتحاد صناعي عكوسي لتكوين الأمونيا من النيتروجين والهيدروجين.','تتحول ذرتا النيتروجين وست ذرات الهيدروجين إلى جزيئَي NH₃ في المعادلة الموزونة.','معادلة هابر مبسطة؛ لا يحاكي النموذج الاتزان أو الضغط أو المحفز أو السرعة.','N₂ + 3H₂ / 2NH₃'),
reaction('carbon-monoxide-oxidation','10','combustion','Carbon monoxide oxidation','أكسدة أول أكسيد الكربون',[['co',2],['o2',1]],[['co2',2]],'يتأكسد أول أكسيد الكربون إلى ثاني أكسيد الكربون عند اتحاده مع الأكسجين.','قارن عدد ذرات الكربون والأكسجين في الجانبين.','محاكاة تعليمية مغلقة؛ لا تتضمن استعمال الغاز أو إجراءات مخبرية.','2CO + O₂ / 2CO₂'),
reaction('zinc-acid-displacement','11','displacement','Zinc + hydrochloric acid','تفاعل الزنك مع حمض الهيدروكلوريك',[['zn',1],['hcl',2]],[['zncl2',1],['h2',1]],'إحلال مفرد؛ يحل الزنك محل الهيدروجين في الحمض ويتكون ملح الزنك وغاز الهيدروجين.','يظهر الهيدروجين الجزيئي ضمن النواتج، مع حفظ ذرتي الكلور وذرة الزنك.','عرض نظري للمعادلة فقط؛ لا يوفر تعليمات لتحضير الغاز أو جمعه.','Zn + 2HCl / ZnCl₂ + H₂'),
reaction('barium-sulfate-precipitation','12','precipitation','Barium sulfate precipitation','ترسيب كبريتات الباريوم',[['bacl2',1],['na2so4',1]],[['baso4',1],['nacl',2]],'تفاعل تبادل أيوني ينتج عنه راسب كبريتات الباريوم قليل الذوبان وكلوريد الصوديوم في المحلول.','تتحد أيونات Ba²⁺ وSO₄²⁻ لتكوين BaSO₄(s).','المعادلة موزونة؛ لا يحاكي النموذج ثوابت الذوبانية أو قياسات الترسيب.','BaCl₂ + Na₂SO₄ / BaSO₄↓')
].map(Object.freeze));
const materialById=new Map(MATERIALS.map(item=>[item.id,item])),reactionById=new Map(REACTIONS.map(item=>[item.id,item]));
export function getReactionById(id){return reactionById.get(id)||null}
export function getMaterialById(id){return materialById.get(id)||null}
export function parseChemicalFormula(formula){
 if(typeof formula!=='string'||!formula.trim())return null;
 const counts={};let index=0;const pattern=/([A-Z][a-z]?)(\d*)/g;let match;
 while((match=pattern.exec(formula))!==null){if(match.index!==index)return null;const amount=match[2]?Number(match[2]):1;if(!Number.isSafeInteger(amount)||amount<1)return null;counts[match[1]]=(counts[match[1]]||0)+amount;index=pattern.lastIndex}
 return index===formula.length?counts:null;
}
export function getReactionAtomBalance(item){
 if(!item||!Array.isArray(item.reactants)||!Array.isArray(item.products))return null;
 let valid=true;
 const count=side=>side.reduce((result,entry)=>{
  const species=materialById.get(entry.species),coefficient=entry.coefficient;
  if(!species||!Number.isSafeInteger(coefficient)||coefficient<1){valid=false;return result}
  const atoms=parseChemicalFormula(species.formula);if(!atoms){valid=false;return result}
  for(const [element,total] of Object.entries(atoms))result[element]=(result[element]||0)+total*coefficient;
  return result;
 },{});
 const left=count(item.reactants),right=count(item.products),elements=[...new Set([...Object.keys(left),...Object.keys(right)])].sort();
 return Object.freeze({left:Object.freeze(left),right:Object.freeze(right),elements:Object.freeze(elements),balanced:valid&&elements.length>0&&elements.every(element=>(left[element]||0)===(right[element]||0))});
}
export function validateReactionBalance(item){return getReactionAtomBalance(item)?.balanced===true}
export function findReactionsForSpecies(speciesId){return REACTIONS.filter(item=>[...item.reactants,...item.products].some(entry=>entry.species===speciesId))}
export function calculateStoichiometry(item,initialMoles){
 if(!item||!validateReactionBalance(item)||!initialMoles||typeof initialMoles!=='object')return null;
 const ratios=item.reactants.map(entry=>{const amount=Number(initialMoles[entry.species]);return{species:entry.species,coefficient:entry.coefficient,available:amount,extent:Number.isFinite(amount)&&amount>=0?amount/entry.coefficient:NaN}});
 if(!ratios.length||ratios.some(item=>!Number.isFinite(item.extent)))return null;
 const extent=Math.min(...ratios.map(item=>item.extent)),limiting=ratios.filter(item=>Math.abs(item.extent-extent)<1e-12).map(item=>item.species);
 const consumed=Object.fromEntries(ratios.map(item=>[item.species,item.coefficient*extent])),remaining=Object.fromEntries(ratios.map(item=>[item.species,Math.max(0,item.available-item.coefficient*extent)])),produced=Object.fromEntries(item.products.map(item=>[item.species,item.coefficient*extent]));
 return Object.freeze({extent,limiting:Object.freeze(limiting),consumed:Object.freeze(consumed),remaining:Object.freeze(remaining),produced:Object.freeze(produced)});
}
