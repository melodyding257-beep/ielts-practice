/**
 * Generate vocabulary and long-sentence reports from passage text.
 * Now with Chinese translations via MyMemory API.
 */

// Very extensive list of common English words to exclude
const COMMON = new Set([
  // Basic articles, pronouns, prepositions
  'the','a','an','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','are','was','were','be','been','being','have','has','had','do','does','did',
  'will','would','could','should','may','might','shall','can','need','dare','ought','used',
  'it','its','this','that','these','those','he','she','they','we','you','i','me','him','her','us','them',
  'my','your','his','our','their','what','which','who','whom','how','when','where','why','whereby',
  'not','no','nor','so','as','if','then','than','too','very','just','also','even','still','yet',
  // Common verbs
  'say','said','make','made','make','like','know','knew','known','think','thought','see','saw','seen',
  'come','came','go','went','gone','take','took','taken','get','got','get','find','found','give','gave',
  'tell','told','ask','asked','seem','seemed','feel','felt','try','tried','leave','left','call','called',
  'keep','kept','let','put','set','move','moved','play','played','run','ran','walk','walked','stand','stood',
  'hear','heard','ask','asked','become','became','become','show','showed','shown','use','used','try','tried',
  'start','started','look','looked','want','wanted','give','gave','offer','offered','need','needed',
  'become','became','begin','began','seem','seemed','help','helped','show','showed','hear','heard',
  'play','run','keep','hold','live','believe','bring','happen','write','sit','stand','lose','pay',
  // Common adjectives
  'good','bad','big','small','large','little','new','old','young','great','high','long','short',
  'first','last','next','able','certain','few','many','much','most','other','same','such','whole',
  'own','right','wrong','true','false','real','nice','best','better','biggest','least','less',
  // Common nouns
  'time','year','way','day','man','men','woman','women','people','life','child','children','world',
  'fact','idea','case','part','place','thing','point','group','company','number','problem','system',
  'hand','head','home','house','area','money','story','week','country','city','town','state','school',
  'question','power','hour','job','word','business','issue','side','kind','head','member','moment',
  'night','water','room','mother','father','level','court','student','party','blood','car','door',
  'health','person','eye','face','value','paper','interest','law','result','change','morning','reason',
  // Transition/common adverbs
  'up','down','out','about','over','after','before','between','under','again','further','then','once',
  'here','there','now','always','never','ever','often','sometimes','usually','perhaps','probably',
  'back','well','even','also','only','almost','already','still','yet',
  // Common academic words (already advanced but too frequent in IELTS)
  'study','studies','research','learning','analysis','analysis','method','approach','process','data',
  'information','knowledge','understanding','development','increase','decrease','effect','impact',
  'significant','important','various','different','similar','example','instance','general','specific',
  'basic','central','main','primary','secondary','major','minor','simple','complex','difficult',
  'possible','impossible','likely','unlikely','necessary','sufficient','certain','obvious','clear',
  'recent','current','present','past','future','early','later','recently','currently','immediately',
  'rate','range','extent','degree','amount','proportion','percentage','aspect','factor','element',
  'resource','resources','benefit','benefits','advantage','disadvantage','cost','costs','risk','opportunity',
  'type','category','class','form','nature','character','characteristics','definition','term',
  'situation','condition','circumstances','environment','context','framework','background',
  'role','function','purpose','goal','aim','objective','target','limit','limits','control',
  'theory','concept','principle','strategy','solution','evidence','source','sources',
  // Numbers
  'one','two','three','four','five','six','seven','eight','nine','ten','zero','hundred','thousand','million',
  'first','second','third','fourth','fifth',
  // Conjunctions
  'because','although','however','therefore','thus','hence','while','whereas','since','unless','until',
  'though','yet','though','neither','either','whether','provide','provided','consider','considered',
  'including','included','except','beyond','among','amongst','within','according','relating','relating',
]);

// Academic/specialized vocabulary that IS worth including (IELTS-level)
const ACADEMIC_KEEP = new Set([
  'acquisition','adaptive','adjacent','albeit','ambiguous','analogous','anomaly','anticipate',
  'apparatus','appropriate','approximate','arbitrary','architecture','assert','assess','assign',
  'assumptions','assurance','atmosphere','attribute','authentic','authoritative','automate',
  'behaviour','bias','biography','capacity','chronic','clarity','coincide','collaborate',
  'collaboration','commission','commodity','communicate','community','comparable','compensate',
  'competence','compile','complement','complexity','comply','comprehensive','compromise',
  'conceive','concentrate','conception','concern','conclusive','concurrent','confidential',
  'configuration','conform','consequence','considerable','consistency','consistent','consolidate',
  'constituent','constraint','construct','consult','consume','contemporary','contradict',
  'contrary','controversy','convention','conventional','correlation','credible','curiosity',
  'currency','curriculum','data','decline','dedicate','deem','definite','delegate','deliberate',
  'demonstrate','denote','depict','depress','derive','descent','designate','despatch','destination',
  'detect','deviate','devise','diagnose','differentiate','diminish','discern','discrete','displace',
  'disposal','disposition','distinction','distort','distribute','diverse','diversify','document',
  'dominant','dominates','duration','dynamic','economy','economies','edition','elementary',
  'eliminate','emerge','emergence','emphasis','empirical','enable','encounter','endeavour',
  'enhance','enormous','entity','envisage','equivalent','erode','essence','estimate','ethic',
  'ethnic','evaluate','evidence','evolution','evolve','exaggerate','exceed','excessive','exclusively',
  'execute','exemplify','exhaust','exhibit','expand','expansion','expertise','expire','explicit',
  'exploit','exploration','exposition','exposure','external','fabricate','facilitate','factor',
  'feasibility','feasible','feature','federal','finite','flourish','fluctuate','focus','format',
  'formulate','forthcoming','forum','foster','fragile','frequency','fringe','fulfil','function',
  'fundamental','generate','generation','generic','genuine','geographic','global','grace','gradient',
  'gradual','grand','guarantee','guideline','habitat','hierarchy','highlight','highlighted',
  'homogeneous','hostile','hypothesis','hypothesize','identical','identification','identify','ideology',
  'ignorance','ignorant','illustrate','image','imagery','imitation','immense','immerse','immigrant',
  'immune','impact','impede','implement','implication','implicit','impose','inaccessible','inadequate',
  'inadvertent','incentive','incidence','incidental','incorporate','increment','indefinite',
  'indicate','indicative','indifferent','indigenous','inevitable','inference','inferior','inflation',
  'influence','inform','infrastructure','inherent','inhibit','initiate','innovation','input',
  'insight','inspect','inspire','installment','instant','institute','institution','instruct',
  'instrument','insufficient','integral','integrate','integrity','intensity','intent','interact',
  'interaction','intermediate','internal','interpersonal','intervene','intervention','intrinsic',
  'invoke','irregular','isolate','issue','junction','justify','landmark','latitude','layer',
  'layout','legend','leverage','liberal','license','lifestyle','linkage','literal','locate',
  'location','logical','longitudinal','lounge','luxury','magnificent','mainstream','maintenance',
  'manifest','manipulate','margin','marginal','mature','maximize','mechanism','medieval','memo',
  'mentality','methodology','migrate','migration','minimize','minority','miscellaneous','mobility',
  'mode','moderate','modify','monitor','monopoly','monument','motivate','motivation','motive',
  'multiple','multiply','municipal','narrative','nationality','navigate','negative','negligible',
  'neighbour','neutral','norm','normalization','notable','notation','notion','novel','numerous',
  'objective','obligation','obscure','observation','observe','obtain','obvious','occupation',
  'occupy','occurrence','ongoing','onset','opponent','opportunity','optimal','option','orient',
  'orientation','origin','original','oscillate','outcome','outlet','outline','output','paradigm',
  'paradox','paragraph','parameter','participant','participate','participation','particular',
  'partition','passive','patent','pathway','penalty','pending','perceive','perception','periodic',
  'permanent','permit','perseverance','persist','persistent','perspective','petition','phenomenon',
  'philosophy','photocopy','phrase','physical','picturesque','pillar','plausible','portion','portrait',
  'portion','pose','position','positive','possess','postpone','potential','poverty','practitioner',
  'preceding','precise','preclude','predominant','predict','predictable','predominantly','predominate',
  'preferable','preference','preliminary','premature','premise','premium','prerequisite','prescribe',
  'presentation','preserve','presidency','president','prestigious','presume','prevail','prevalent',
  'primary','primitive','principal','principle','priority','privacy','private','privilege','probability',
  'probable','procedure','proceed','process','proclaim','productive','productivity','profound',
  'progression','prohibit','prominent','promote','promotion','prompt','pronounced','proper','property',
  'proponent','proportion','proposal','propose','proposition','prosecute','prospect','prosperity',
  'protocol','provisional','provision','psychology','publication','publicity','publish','pursue',
  'pursuit','qualitative','quantify','quantitative','quarter','query','quest','questionnaire',
  'radical','random','range','rank','rapid','ratio','rational','reach','reallocate','rebel','rebellion',
  'recap','recapture','receipt','reception','recession','recipient','reckon','recognition','recognize',
  'recommend','reconstruction','record','recovery','recreation','recruit','recruitment','recycle',
  'redeem','reduce','redundant','refine','reflect','reform','refugee','refusal','refute','regime',
  'regional','register','registration','regulate','regulation','regulatory','rehabilitation','reinforce',
  'reject','relaxation','release','relevant','reliance','reliant','relief','relieve','religion',
  'religious','reluctant','relocate','reluctance','remainder','remark','remedy','removal','remove',
  'renaissance','render','renew','rental','repair','repatriate','repeal','repeat','repeatedly','replace',
  'replacement','report','repository','representation','reproduce','reputation','request','require',
  'requirement','rescue','researcher','resemble','reservation','reserve','reside','residence','resident',
  'residential','residual','resign','resist','resistance','resolution','resolve','resort','resource',
  'respect','respond','response','responsibility','restore','restrain','restrict','restriction',
  'resultant','resume','retail','retention','retire','retirement','retrieve','retrospect','reunion',
  'reveal','revenue','reverse','revise','revision','revival','revolution','reward','rigorous','ritual',
  'robust','route','routine','royal','ruin','sacrifice','salary','sanction','satellite','satisfaction',
  'saturate','scale','scandal','scenario','schedule','scheme','scope','score','scrutiny','sector',
  'secular','security','segregate','selection','semester','seniority','sensation','sensational',
  'sense','sensitivity','sentiment','sequence','serene','serial','series','server','session','setback',
  'setting','settlement','severity','sexuality','shared','shift','shock','shorthand','shortage',
  'shrine','shuttle','sibling','sideways','significant','signify','silicon','similarity','simulate',
  'simultaneous','situated','skeleton','sketch','skeptical','skill','slash','slavery','slice','slope',
  'slump','snapshot','socialism','socialist','socket','sodium','software','soil','solar','solidarity',
  'solution','solve','sophisticated','souvenir','spacecraft','span','spatial','species','specification',
  'specify','specimen','spectrum','speculation','spiral','spiritual','split','sponsor','spontaneous',
  'spotlight','stabilize','stack','staff','stage','stagnation','stakeholder','stall','stance',
  'standardize','standing','staple','startling','state','stationary','statistical','statute','steadily',
  'stem','stereotype','sticky','stimulate','stimulus','stitch','stock','storage','strand','strategic',
  'strategy','strength','strengthen','stress','stretch','strict','stride','strike','string','strip',
  'structure','struggle','stubborn','student','styling','subfield','subject','submission','submit',
  'subordinate','subscribe','subsequent','subset','subside','substantial','substantially','substitute',
  'subtle','suburb','succession','successive','succinct','sucker','sue','suffer','suffice','sufficient',
  'suggest','suit','suite','suitable','summary','summit','summon','superb','superficial','superior',
  'supervise','supervision','supervisor','supplement','supplementary','supplier','supply','supportive',
  'suppose','supposed','suppress','supreme','surgery','surplus','surprise','surrender','surroundings',
  'survey','survival','survive','susceptible','suspect','suspend','suspicion','sustain','sustainability',
  'sustainable','swagger','swap','symbol','symbolic','sympathy','symptom','syndrome','synergy',
  'systematic','tabulate','tackle','tactic','tailor','takeover','tangible','target','tariff','taxation',
  'teacher','teamwork','technician','technique','technological','technology','telecommunication',
  'telescope','temper','template','tempo','tenant','tendency','tensile','terminal','terrain',
  'territory','terrorism','terrorist','testify','testimony','texture','theoretical','theorist',
  'theorize','therapy','thereafter','thermal','thesis','thorough','thriving','timber','timeout',
  'tissue','tolerant','toll','tone','topical','topography','tornado','tourism','tourist','toxic',
  'trace','track','tract','trade','trader','tradition','tragic','trail','trailer','trajectory',
  'transfer','transform','transformation','transit','transition','translate','translation','transmission',
  'transmit','transparency','transparent','transport','transportation','trap','trauma','travel',
  'treasure','treasury','treaty','tremendous','trend','trial','triangle','tribal','tribute','trigger',
  'triple','trivial','trophy','tropical','trouble','trove','trunk','tuition','turbine','turmoil',
  'turnover','tutor','twist','ubiquitous','ultimate','unable','unprecedented','unrest','update',
  'upgrade','uphold','utility','utilize','utter','vacant','vacuum','vague','validity','valuable',
  'variable','variance','variation','varied','vehicle','vein','velocity','vendor','venture',
  'verdict','verify','verse','version','versus','vessel','veteran','viable','vibrant','victim',
  'video','viewpoint','vigorously','village','violate','violence','virgin','virtual','virtue',
  'virus','visible','vision','visitor','visual','vital','vivid','vocabulary','volatile','volcano',
  'volume','voluntary','volunteer','voter','voyage','vulnerable','wage','warfare','warrant',
  'warranty','warrior','wealth','weapon','wear','welfare','wellbeing','wilderness','wildlife',
  'withdraw','withdrawal','withstand','witness','workforce','workplace','workshop','workshop','worship',
  'worthwhile','writ','writer','yearning','zeal','zealous',
]);

function tokenize(text) {
  return text
    .replace(/[^a-zA-Z\s'-]/g, ' ')
    .split(/\s+/)
    .map(w => w.replace(/^[-']+|[-']+$/g, '').toLowerCase())
    .filter(w => w.length >= 4 && !COMMON.has(w) && !/^\d+$/.test(w));
}

function countSyllables(word) {
  word = word.toLowerCase();
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return m ? m.length : 1;
}

function isAdvanced(word) {
  // Must be either long, polysyllabic, or in the academic keep list
  if (ACADEMIC_KEEP.has(word)) return true;
  return word.length >= 9 || countSyllables(word) >= 4;
}

// ─── Async: generate vocab report with Chinese translations ─────────────────────

export async function generateVocabReport(passages) {
  const wordFreq = {};
  const passageText = passages.map(p => p.fullText || p.paragraphs?.map(par => par.text).join(' ') || '').join(' ');

  const tokens = tokenize(passageText);
  for (const w of tokens) {
    if (isAdvanced(w)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
    }
  }

  // Sort by frequency then length — take top 30
  const sorted = Object.entries(wordFreq)
    .filter(([, count]) => count >= 1)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 30);

  return sorted.map(([word, count]) => ({
    word,
    count,
    syllables: countSyllables(word),
    translation: null, // filled async
  }));
}

// ─── Async: generate sentence report with Chinese translations ───────────────────

export async function generateSentenceReport(passages) {
  const passageText = passages
    .map(p => p.paragraphs?.map(par => par.text).join(' ') || p.fullText || '')
    .join(' ');

  // Split into sentences
  const sentences = passageText
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && s.split(/\s+/).length >= 8);

  const complex = sentences
    .filter(s => {
      const wordCount = s.split(/\s+/).length;
      const hasClause = /\b(which|although|however|whereas|despite|nevertheless|furthermore|moreover|consequently|therefore|whilst|whereby|thereby|wherein|because|since)\b/i.test(s);
      return wordCount >= 20 || (hasClause && wordCount >= 12);
    })
    .sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length)
    .slice(0, 8);

  return complex.map(s => ({
    text: s,
    wordCount: s.split(/\s+/).length,
    translation: null, // filled async
  }));
}
