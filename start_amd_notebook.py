"""Start the private GPU app with already-cached model weights, never downloads."""
import argparse, json, os, time
from pathlib import Path

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--model-dir',required=True,help='Existing Qwen2-VL-7B-Instruct snapshot directory')
    parser.add_argument('--port',type=int,default=8765)
    args=parser.parse_args()
    os.environ['HF_HUB_OFFLINE']='1'
    os.environ['TRANSFORMERS_OFFLINE']='1'
    import torch
    if not torch.version.hip or not torch.cuda.is_available():
        raise RuntimeError('An actual AMD ROCm GPU is required. CPU fallback is disabled.')
    folder=Path(args.model_dir)
    if not (folder/'config.json').is_file(): raise ValueError('Existing model snapshot required')
    from transformers import AutoProcessor, Qwen2VLForConditionalGeneration
    from notebook_backend import start_notebook_server
    model=Qwen2VLForConditionalGeneration.from_pretrained(str(folder),torch_dtype=torch.bfloat16,attn_implementation='eager',local_files_only=True,trust_remote_code=False).to('cuda').eval()
    processor=AutoProcessor.from_pretrained(str(folder),local_files_only=True,trust_remote_code=False,min_pixels=256*28*28,max_pixels=768*28*28)
    runtime={'torch':torch.__version__,'hip':torch.version.hip,'gpu_available':True,'gpu_count':torch.cuda.device_count(),'gpus':[torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())]}
    print(json.dumps(runtime,indent=2))
    return start_notebook_server(model,processor,runtime,'Qwen/Qwen2-VL-7B-Instruct',folder.name,args.port)

if __name__=='__main__':
    shotproof_server=main()
