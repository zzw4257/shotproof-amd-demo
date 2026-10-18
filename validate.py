"""Portable package validation. No hidden recovery files or original paths required."""
import hashlib,json,pathlib,subprocess,xml.etree.ElementTree as ET
p=pathlib.Path(__file__).resolve().parent
manifest=json.loads((p/'asset-manifest.json').read_text())
assert len(manifest['assets'])==4
for a in manifest['assets']:
    b=(p/a['path']).read_bytes();assert len(b)==a['bytes'];assert hashlib.sha256(b).hexdigest()==a['sha256']
    root=ET.fromstring(b);assert root.attrib['viewBox']=='0 0 720 450'
    assert a['model_result'] is None and a['human_review_result'] is None
    for n in root.iter():
        assert n.tag.rsplit('}',1)[-1] not in {'script','image','foreignObject'}
        assert not any(k.endswith('href') for k in n.attrib)
results=[]
for name in ['test_core.cjs','test_ui.cjs']:
    r=subprocess.run(['node',str(p/'tests'/name)],check=True,text=True,capture_output=True);results.append(json.loads(r.stdout))
for name in ['core.js','app.js','assets-data.js','inference.js']:
    subprocess.run(['node','--check',str(p/name)],check=True)
print(json.dumps({'asset_hashes_verified':4,'tests':results,'browser_acceptance':json.loads((p/'validation/browser-results.json').read_text())['status'] if (p/'validation/browser-results.json').exists() else 'not run','public_release':False},indent=2))
