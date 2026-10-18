import base64, io, json, os, struct, sys, unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server

class Response(io.BytesIO):
    status=200

class InferenceTests(unittest.TestCase):
    def setUp(self):
        manifest=json.loads((server.ROOT/'asset-manifest.json').read_text())
        assets={a['role']:a for a in manifest['assets']}
        # Header-only fixtures exercise validation and request wiring, not model inference.
        raw=b'\x89PNG\r\n\x1a\n'+b'\x00\x00\x00\rIHDR'+struct.pack('>II',720,450)
        png='data:image/png;base64,'+base64.b64encode(raw).decode()
        self.data={'role':'occlusion','reference_png':png,'candidate_png':png,'source_sha256':[assets['reference']['sha256'],assets['occlusion']['sha256']]}
        self.env={'AMD_BASE_URL':'https://example.invalid/v1','AMD_MODEL':'test-vision-only','AMD_API_KEY':'unit-test-sentinel'}
        self.result={'findings':[{'observation':'Covered area','category':'occlusion','uncertainty':'Cannot verify concealed detail'}],'limitations':['Synthetic test']}
    def transport(self,req,timeout):
        self.request=req
        return Response(json.dumps({'id':'mock-not-a-live-run','model':'test-vision-only','usage':{'total_tokens':10},'choices':[{'message':{'content':json.dumps(self.result)}}]}).encode())
    def run_compare(self):
        with patch.dict(os.environ,self.env,clear=True): return server.compare(self.data,self.transport)
    def test_missing_credentials_blocks_without_request(self):
        with patch.dict(os.environ,{},clear=True),self.assertRaisesRegex(ValueError,'No inference'):
            server.compare(self.data,lambda *a,**k:self.fail('must not send'))
    def test_request_carries_both_images_and_records_hashes(self):
        record=self.run_compare();payload=json.loads(self.request.data)
        self.assertEqual(len(payload['messages'][0]['content']),3)
        self.assertEqual(record['status'],'completed')
        self.assertEqual(record['model_result'],self.result)
        self.assertEqual(len(record['sent_png_sha256']),2)
        self.assertEqual(record['request_body_sha256'],server.sha(self.request.data))
        self.assertNotIn('unit-test-sentinel',json.dumps(record))
        self.assertIsNone(record['cost_usd'])
        self.assertEqual(record['review_state'],'pending')
    def test_invented_schema_is_rejected_and_original_preserved(self):
        self.result={'approved':True};record=self.run_compare()
        self.assertEqual(record['status'],'failed');self.assertIsNone(record['model_result'])
        self.assertIn('raw_response',record)
    def test_source_mismatch_blocks(self):
        self.data['source_sha256'][1]='0'*64
        with self.assertRaisesRegex(ValueError,'binding'): self.run_compare()
    def test_invalid_image_blocks(self):
        self.data['candidate_png']='data:image/png;base64,not-base64'
        with self.assertRaisesRegex(ValueError,'encoding'): self.run_compare()
    def test_http_or_credential_url_blocks(self):
        for base in ['http://example.invalid/v1','https://user:pass@example.invalid/v1','https://example.invalid/v1?key=bad']:
            self.env['AMD_BASE_URL']=base
            with self.assertRaisesRegex(ValueError,'HTTPS'):self.run_compare()
    def test_provider_failure_is_not_success(self):
        from urllib.error import HTTPError
        def fail(*a,**k): raise HTTPError('https://example.invalid',429,'quota',{},None)
        with patch.dict(os.environ,self.env,clear=True): record=server.compare(self.data,fail)
        self.assertEqual(record['status'],'failed');self.assertEqual(record['http_status'],429)
    def test_uncertainty_is_required(self):
        del self.result['findings'][0]['uncertainty']
        self.assertEqual(self.run_compare()['status'],'failed')
    def test_fence_normalization_does_not_change_fields(self):
        raw={'choices':[{'message':{'content':'```json\n'+json.dumps(self.result)+'\n```'}}]}
        self.assertEqual(server.validate_result(raw),self.result)
        del self.result['findings'][0]['uncertainty']
        with self.assertRaises(ValueError):
            server.validate_result({'choices':[{'message':{'content':'```json\n'+json.dumps(self.result)+'\n```'}}]})

if __name__=='__main__': unittest.main()
