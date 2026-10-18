'use strict';
// All model text is rendered as textContent. No generated HTML is executed.
window.addEventListener('DOMContentLoaded',()=>{
const $=id=>document.getElementById(id), runs=[], decisions=[];
let busy=false;
async function raster(role){
 const img=new Image();img.src='data:image/svg+xml;base64,'+DEMO_ASSETS.payloads[role];await img.decode();
 const c=document.createElement('canvas');c.width=720;c.height=450;c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/png');
}
function render(){
 $('ai-results').replaceChildren();
 for(const run of runs){
  const article=document.createElement('article'),h=document.createElement('strong'),p=document.createElement('p');
  h.textContent=run.role+' · '+run.status+' · '+run.request_id;
  p.textContent=run.status==='completed'?JSON.stringify(run.model_result,null,2):[run.error,run.raw_output].filter(Boolean).join('\n\nOriginal model output:\n');
  article.append(h,p);
  const meta=document.createElement('p');meta.textContent='Model: '+(run.response_model||run.requested_model)+' · '+run.latency_ms+' ms · source and transmitted PNG hashes in export. Model proposal; human review required.';article.append(meta);
  if(run.status==='completed'||run.inference_status==='generated')for(const action of ['confirmed','rejected','uncertain']){
   const b=document.createElement('button');b.textContent='Mark '+action;b.addEventListener('click',()=>{
    if(!$('ai-review-note').value.trim()){ $('ai-status').textContent='Enter a review reason before recording a decision.';return; }
    decisions.push({request_id:run.request_id,decision:action,note:$('ai-review-note').value.trim(),at:new Date().toISOString(),author_type:$('review-author').value});
    $('ai-review-note').value='';$('ai-status').textContent=($('review-author').value==='agent_demo'?'Agent demo annotation recorded: ':'Human decision recorded: ')+action+'. Model output remains unchanged.';
    render();
   });article.append(b);
  }
  for(const d of decisions.filter(d=>d.request_id===run.request_id)){const p=document.createElement('p');p.textContent=(d.author_type==='agent_demo'?'Agent demo ':'Human ')+d.decision+': '+d.note;article.append(p);}
  $('ai-results').append(article);
 }
}
$('ai-compare').addEventListener('click',async()=>{
 if(busy)return;
 if(!$('approve').disabled){$('ai-status').textContent='Select the reference before requesting an image comparison.';return;}
 busy=true;$('ai-compare').disabled=true;const role=$('case').value;
 $('ai-status').textContent='Sending the reference and candidate images to the configured endpoint…';
 try{
  const source=DEMO_ASSETS.manifest.assets;
  const body={role,reference_png:await raster('reference'),candidate_png:await raster(role),source_sha256:['reference',role].map(r=>source.find(a=>a.role===r).sha256)};
  const response=await fetch(new URL('./api/compare',location.href),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(95000)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Comparison blocked');
  runs.push(result);render();$('ai-status').textContent=result.status==='completed'?'Actual model response received. Review each finding against both images.':result.inference_status==='generated'?'Actual AMD image inference ran, but the output failed schema validation. Review the preserved raw result.':'Actual request failed. No successful inference is claimed.';
  if(result.inference_status==='generated')document.querySelector('.badge').textContent='ACTUAL AMD NOTEBOOK IMAGE INFERENCE · Human review required';
 }catch(e){$('ai-status').textContent='Comparison blocked: '+e.message;}
 finally{busy=false;$('ai-compare').disabled=false;}
});
$('ai-export').addEventListener('click',()=>{
 if(!runs.length){$('ai-status').textContent='No actual request records to export.';return;}
 const body={schema_version:1,kind:'shotproof-paired-image-inference',generated_at:new Date().toISOString(),runs,human_decisions:decisions,original_svg_base64:DEMO_ASSETS.payloads,asset_manifest:DEMO_ASSETS.manifest,limitations:['Original synthetic illustrations only; not an accuracy benchmark.','Endpoint identity is recorded; accelerator hardware is not independently measured.','Model findings are proposals; human decisions do not alter original responses.']};
 const url=URL.createObjectURL(new Blob([JSON.stringify(body,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='shotproof-image-inference-evidence.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
window.addEventListener('beforeunload',e=>{if(runs.length){e.preventDefault();e.returnValue='';}});
});
