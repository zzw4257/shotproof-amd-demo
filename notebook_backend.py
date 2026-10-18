"""Use a loaded local vision model inside an authenticated AMD Jupyter session.

No public tunnel, API credential, model download or package installation.
"""
import base64, io, json, threading, time, uuid
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer
from pathlib import Path
from server import Handler, PROMPT, prepare_pair, sha, canonical, validate_result

def start_notebook_server(model, processor, runtime, model_id, snapshot, port=8765):
    import torch
    from PIL import Image
    if not torch.version.hip or not torch.cuda.is_available():
        raise RuntimeError('ROCm GPU required; CPU substitution is prohibited')
    if next(model.parameters()).device.type!='cuda':
        raise RuntimeError('Model must already reside on the ROCm GPU')
    lock=threading.Lock()
    def run(data):
        role, pngs=prepare_pair(data)
        if not lock.acquire(blocking=False): raise ValueError('GPU comparison already running')
        record={'schema_version':1,'request_id':str(uuid.uuid4()),'started_at':datetime.now(timezone.utc).isoformat(),'role':role,'provider_label':'AMD official Notebook, direct ROCm execution','backend':'transformers-on-amd-rocm','requested_model':model_id,'response_model':model_id,'snapshot':snapshot,'runtime':runtime,'source_svg_sha256':data['source_sha256'],'sent_png_sha256':[sha(p) for p in pngs],'sent_png_base64':[base64.b64encode(p).decode() for p in pngs],'request_body_sha256':sha(canonical(data)),'prompt':PROMPT,'review_state':'pending','status':'failed','inference_status':'not_generated','model_result':None,'cost_usd':None,'cost_note':'No billing amount is supplied by the Notebook service','hardware_verification':'GPU identity and ROCm version observed from the running process, not signed attestation'}
        started=time.monotonic()
        try:
            images=[Image.open(io.BytesIO(p)).convert('RGB') for p in pngs]
            messages=[{'role':'user','content':[{'type':'image'},{'type':'image'},{'type':'text','text':PROMPT}]}]
            text=processor.apply_chat_template(messages,tokenize=False,add_generation_prompt=True)
            inputs=processor(text=[text],images=images,padding=True,return_tensors='pt').to('cuda')
            record['input_device']=str(inputs.input_ids.device)
            record['model_device']=str(next(model.parameters()).device)
            record['generation_parameters']={'max_new_tokens':384,'do_sample':False}
            torch.cuda.synchronize(); started=time.monotonic()
            with torch.inference_mode(): output_ids=model.generate(**inputs, max_new_tokens=384, do_sample=False)
            torch.cuda.synchronize()
            new_ids=output_ids[:,inputs.input_ids.shape[1]:]
            text=processor.batch_decode(new_ids,skip_special_tokens=True,clean_up_tokenization_spaces=False)[0]
            record['raw_output']=text
            record['output_sha256']=sha(text.encode())
            record['parsing_note']='Only a whole-response Markdown JSON fence may be removed; required fields and values are unchanged.'
            record['inference_status']='generated'
            record['usage']={'input_tokens':int(inputs.input_ids.shape[1]),'output_tokens':int(new_ids.shape[1])}
            try:
                record['model_result']=validate_result({'choices':[{'message':{'content':text}}]})
                record['status']='completed'
            except (ValueError,KeyError,TypeError,IndexError):
                record['status']='needs_review'
                record['error']='Actual image inference returned nonconforming JSON. Raw output retained; human review required.'
        except Exception as exc:
            record['error']='GPU request failed ('+type(exc).__name__+')'
        finally:
            lock.release()
        record['latency_ms']=round((time.monotonic()-started)*1000)
        return record
    server=ThreadingHTTPServer(('127.0.0.1',port),Handler)
    server.allowed_origin='https://notebooks.amd.com'
    server.compare_fn=run
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    print('ShotProof private GPU server started on loopback port',port)
    print('Open the existing authenticated Jupyter base URL plus /proxy/'+str(port)+'/')
    return server
