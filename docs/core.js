'use strict';
(function(root){
function create(manifest,now=()=>new Date().toISOString()){
 const source=JSON.parse(JSON.stringify(manifest)), allowed=source.assets.filter(a=>a.role!=='reference').map(a=>a.role);let approval=null,events=[],observations=[];
 function reference(){return source.assets.find(a=>a.role==='reference')}
 function asset(role){const a=source.assets.find(a=>a.role===role);if(!a)throw Error('Unknown evidence asset');return a}
 function approve(){if(!approval)approval={reference_sha256:reference().sha256,at:now(),scope:'reference illustration selected for this human-review session only; not product approval'};return {...approval}}
 function record(role,note,status,box){
  if(!approval)throw Error('Select the reference before recording observations');
  if(!allowed.includes(role))throw Error('Choose a candidate illustration');
  if(typeof note!=='string'||!note.trim()||note.length>2000)throw Error('Enter an observation of 1–2000 characters');
  if(!['observed','uncertain'].includes(status))throw Error('Invalid observation state');
  if(!Array.isArray(box)||box.length!==4||!box.every(Number.isFinite))throw Error('Region coordinates must be finite numbers');
  const [x,y,w,h]=box;if(x<0||y<0||w<=0||h<=0||x+w>720||y+h>450)throw Error('Region must fit inside the 720 × 450 illustration');
  const event={id:'H'+String(events.length+1).padStart(3,'0'),asset_id:asset(role).id,asset_sha256:asset(role).sha256,role,author_type:'human',note:note.trim(),status,region_xywh:[...box],at:now()};
  events.push(event);observations.push(event);return JSON.parse(JSON.stringify(event));
 }
 function summary(){return {mode:'deterministic operator-note rendering; no model inference',reference_approval:approval?{...approval}:null,entries:observations.map(e=>({evidence_id:e.id,asset_id:e.asset_id,asset_sha256:e.asset_sha256,region_xywh:[...e.region_xywh],human_statement:e.note,status:e.status})),unresolved:observations.filter(e=>e.status==='uncertain').map(e=>e.id),limitations:['All illustrations are synthetic and unevaluated.','Human statements are copied verbatim, not independently verified.','No image model or AMD endpoint was called.','No delivery approval, MATCH/MISMATCH decision, or accuracy claim is produced.']}}
 function exportData(){return JSON.parse(JSON.stringify({schema_version:1,kind:'shotproof-original-illustrations-human-review',generated_at:now(),amd_execution:null,automated_image_predictions:[],asset_manifest:source,reference_approval:approval,human_event_history:events,summary:summary()}))}
 return {approve,record,summary,exportData};
}
const api={create};if(typeof module!=='undefined')module.exports=api;else root.ShotProofHumanReview=api;
})(typeof window!=='undefined'?window:globalThis);
