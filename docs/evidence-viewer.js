'use strict';
const $=id=>document.getElementById(id);
const bytes=b64=>Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
const hash=async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');
const titles={addition:'Addition study',occlusion:'Occlusion study',lighting:'Lighting study'};
let evidence=null,objectUrl=null;
function text(tag,value,className){const e=document.createElement(tag);e.textContent=value;if(className)e.className=className;return e;}
function selectRun(index){
 const run=evidence.runs[index];
 $('reference').src='data:image/png;base64,'+run.sent_png_base64[0];$('candidate').src='data:image/png;base64,'+run.sent_png_base64[1];
 $('case-label').textContent=titles[run.role]||run.role;
 $('run-time').textContent=(Number(run.latency_ms)/1000).toFixed(2)+' s generation · Recorded';
 $('findings').replaceChildren();
 let parsed=null;
 try{let raw=run.raw_output.trim();if(/^```(?:json)?\s*\n[\s\S]*\n```$/.test(raw))raw=raw.replace(/^```(?:json)?\s*\n/,'').replace(/\n```$/,'');parsed=JSON.parse(raw);}catch{}
 const valid=parsed&&Object.keys(parsed).sort().join(',')==='findings,limitations'&&Array.isArray(parsed.findings)&&parsed.findings.length<=20&&parsed.findings.every(f=>f&&Object.keys(f).sort().join(',')==='category,observation,uncertainty'&&['addition','occlusion','lighting','other'].includes(f.category)&&Object.values(f).every(v=>typeof v==='string'&&v.length<=4000))&&Array.isArray(parsed.limitations)&&parsed.limitations.length<=20&&parsed.limitations.every(v=>typeof v==='string'&&v.length<=4000);
 if(valid){if(!parsed.findings.length)$('findings').append(text('p','No findings in this recorded response.','finding-observation'));for(const finding of parsed.findings){$('findings').append(text('span',finding.category.charAt(0).toUpperCase()+finding.category.slice(1),'finding-category'),text('p',finding.observation,'finding-observation'),text('p','Model uncertainty: '+finding.uncertainty+' (uncalibrated)','recorded-meta'));}
  if(Array.isArray(parsed.limitations))for(const limit of parsed.limitations)$('findings').append(text('p',String(limit),'model-limit'));
 }else $('findings').append(text('span','Needs review','finding-category'),text('p','The saved response did not satisfy the finding format.','finding-observation'),text('p','Read the unchanged output in the evidence details. No missing field has been invented.','recorded-meta'));
 $('annotations').replaceChildren();
 const notes=(evidence.human_decisions||[]).filter(d=>d.request_id===run.request_id);
 if(!notes.length)$('annotations').append(text('p','No reviewer decision in this export.'));
 for(const note of notes){$('annotations').append(text('strong',note.author_type==='agent_demo'?'Agent demo · No human approval':'Recorded reviewer annotation'),text('p',note.note));}
 $('raw-output').textContent=run.raw_output||run.error||'No generated output';
 $('request-details').replaceChildren();
 const values={'Request ID':run.request_id,'Recorded at':run.started_at,'Model':run.response_model||run.requested_model,'Snapshot':run.snapshot,'Generation time':run.latency_ms+' ms (single request, not a benchmark)','Recorded runtime':JSON.stringify(run.runtime||{}),'Input PNG hashes':run.sent_png_sha256.join('\n'),'Raw output hash':run.output_sha256,'Cost':run.cost_usd==null?'Not supplied by the notebook service':String(run.cost_usd),'Byte verification':'Passed; no hardware or authorship attestation'};
 for(const [k,v] of Object.entries(values))$('request-details').append(text('dt',k),text('dd',String(v??'Not recorded')));
 for(const [i,b] of Array.from($('case-strip').children).entries())b.setAttribute('aria-pressed',String(i===index));
}
async function renderEvidence(file){
 $('recorded-workspace').hidden=true;$('download').removeAttribute('href');$('download').setAttribute('aria-disabled','true');
 $('verify').classList.remove('receipt-error');
 try{
  if(!file)return;if(file.size>8_000_000)throw Error('File exceeds 8 MB');
  const data=JSON.parse(await file.text());
  if(data.kind!=='shotproof-paired-image-inference'||!Array.isArray(data.runs)||!data.runs.length||data.runs.length>30)throw Error('Expected a ShotProof inference export');
  for(const run of data.runs){
   if(!Array.isArray(run.sent_png_base64)||run.sent_png_base64.length!==2||!Array.isArray(run.sent_png_sha256)||run.sent_png_sha256.length!==2)throw Error('Two exact transmitted images required');
   for(let i=0;i<2;i++)if(await hash(bytes(run.sent_png_base64[i]))!==run.sent_png_sha256[i])throw Error('Transmitted PNG hash mismatch');
   if(typeof run.raw_output!=='string'||await hash(new TextEncoder().encode(run.raw_output))!==run.output_sha256)throw Error('Model output hash mismatch');
   if(run.response_body_base64&&await hash(bytes(run.response_body_base64))!==run.response_body_sha256)throw Error('Response body hash mismatch');
  }
  evidence=data;$('case-strip').replaceChildren();
  data.runs.forEach((run,i)=>{const b=text('button','', 'case-thumb');b.type='button';const img=document.createElement('img');img.src='data:image/png;base64,'+run.sent_png_base64[1];img.alt='';const label=text('span',titles[run.role]||run.role);label.append(text('small',(run.latency_ms/1000).toFixed(2)+' s · Saved output'));b.append(img,label);b.addEventListener('click',()=>selectRun(i));$('case-strip').append(b);});
  if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=URL.createObjectURL(file);$('download').href=objectUrl;$('download').setAttribute('aria-disabled','false');
  $('verify').textContent=data.runs.length+' recorded requests · Exact PNG and output hashes verified · No inference request made';
  $('recorded-workspace').hidden=false;
  selectRun(Math.max(0,data.runs.findIndex(r=>r.role==='occlusion')));
 }catch(e){evidence=null;$('reference').removeAttribute('src');$('candidate').removeAttribute('src');$('raw-output').textContent='';$('findings').replaceChildren();$('verify').classList.add('receipt-error');$('verify').textContent='Evidence blocked: '+e.message;}
}
async function loadSample(){$('receipt').value='';$('receipt-filename').textContent='Using saved demo evidence';try{const response=await fetch('evidence/shotproof-three-live-amd-evidence.json',{credentials:'omit'});if(!response.ok)throw Error('Saved evidence unavailable');await renderEvidence(await response.blob());}catch(e){$('verify').classList.add('receipt-error');$('verify').textContent='Evidence blocked: '+e.message;}}
$('receipt').addEventListener('change',()=>{const file=$('receipt').files[0];$('receipt-filename').textContent=file?file.name:'No file selected';renderEvidence(file);});$('sample').addEventListener('click',loadSample);loadSample();
