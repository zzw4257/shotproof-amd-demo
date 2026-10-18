"""Verify exported byte hashes. This does not authenticate hardware or model truth."""
import base64, hashlib, json, sys
from pathlib import Path
def digest(data): return hashlib.sha256(data).hexdigest()
def verify(path):
    data=json.loads(Path(path).read_text())
    runs=data.get('runs',[])
    if not runs: raise ValueError('No execution records')
    if 'original_svg_base64' in data:
        for asset in data['asset_manifest']['assets']:
            if digest(base64.b64decode(data['original_svg_base64'][asset['role']],validate=True))!=asset['sha256']:
                raise ValueError('Original SVG hash mismatch')
    checks=[]
    for run in runs:
        if 'sent_png_base64' in run:
            payloads=run['sent_png_base64']
        else:
            assets={a['role']:a for a in data['assets']}
            payloads=[assets['reference']['png_base64'],assets[run['role']]['png_base64']]
        if len(payloads)!=2 or len(run['sent_png_sha256'])!=2: raise ValueError('Expected two images')
        for blob,expected in zip(payloads,run['sent_png_sha256']):
            if digest(base64.b64decode(blob,validate=True))!=expected: raise ValueError('PNG hash mismatch')
        if 'raw_output' in run and digest(run['raw_output'].encode())!=run['output_sha256']:
            raise ValueError('Raw output hash mismatch')
        if 'response_body_base64' in run and digest(base64.b64decode(run['response_body_base64'],validate=True))!=run['response_body_sha256']:
            raise ValueError('Response body hash mismatch')
        checks.append({'request_id':run['request_id'],'role':run['role'],'recorded_status':run['status'],'image_and_output_hashes':'verified'})
    return {'runs':checks,'claim_boundary':'Byte integrity only. No hardware attestation, accuracy or human approval is established.'}
if __name__=='__main__':
    print(json.dumps(verify(sys.argv[1]),indent=2))
