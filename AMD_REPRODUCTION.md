# Actual AMD execution

On 2026-10-17, the signed-in official AMD One-Click Tutorials page exposed **OCR with vLLM**. Its normal Request Notebook flow opened a private Jupyter environment. The observed process reported one **AMD Instinct MI300X VF**, PyTorch `2.7.0a0+git6c0e746`, HIP `6.3.42133-1b9c17779`, Transformers `4.50.1` and vLLM `0.7.4.dev388+g51641aaa7`.

The actual ShotProof backend uses **Transformers/PyTorch on ROCm**, not vLLM serving. The tutorial supplied the environment. Qwen2-VL-7B-Instruct snapshot `eed13092ef92e448dd6875b2a00151bd3f7db0ac` already existed in its model cache. Loading used `local_files_only=True`, offline flags and `trust_remote_code=False`. No weights, packages or keys were downloaded or created.

## Reproduce in an authorized AMD notebook

Place this source folder in the existing notebook environment. Confirm the GPU and cached snapshot yourself. In a notebook code cell run:

```python
%run start_amd_notebook.py --model-dir /path/to/existing/Qwen2-VL-7B-Instruct/snapshot
```

Open the existing authenticated Jupyter base URL plus `/proxy/8765/`. The app server binds only to `127.0.0.1`; the already authenticated Jupyter service provides access. It creates no public tunnel or new credential. `jupyter_server_proxy`, PyTorch, Transformers and Pillow must already exist. This script does not install anything or silently fall back to CPU.

Choose the reference and candidate in the original ShotProof UI and request comparison. The browser sends the actual two PNGs. The backend puts image tensors and model on the ROCm device and records the model output, runtime identity, input/output token counts, synchronized generation time, original source hashes and exact transmitted PNG bytes/hashes.

## Preserved evidence

Three initial direct-model requests and four subsequent actual UI requests were saved in the AMD session archive before the final recording. The first UI request failed strict JSON parsing because the model wrapped JSON in Markdown. A correction permits only a whole-response JSON fence to be removed. Required fields and allowed category values remain strict. The initial rejected output is preserved, not overwritten.

The three later UI receipts recorded generation times of **1398 ms (addition), 1282 ms (occlusion), 1566 ms (lighting)**. These are individual synchronized generation measurements, not an end-to-end latency benchmark. The initial direct-model warm-up took 13902 ms. Initial direct-model outputs omitted uncertainty and used an unsupported `color` category in the lighting case; these remain in the archive.

Use `python3 verify_evidence.py PATH_TO_EXPORT.json` to verify embedded PNG and raw-output hashes. This verifies byte integrity, not trusted authorship, signed hardware identity or semantic accuracy.

## Interpretation limits

The images are original synthetic illustrations with authored text labels. They are demonstration fixtures, not a hidden test set. No detection accuracy, calibrated confidence, natural-product generalization or reviewer-time benefit is established. A model response saying `uncertainty: 0` or `low` is an uncalibrated model statement. Agent demo annotations carry `author_type: agent_demo` and do not constitute human approval.

The running GPU app requires the owner's AMD login. It has not been made public. Token Factory remains a separate blocked account-assignment path; the private GPU workflow does not depend on it.

The model's official repository lists Apache-2.0: https://huggingface.co/Qwen/Qwen2-VL-7B-Instruct . No model weights are redistributed. Project-owned code and original SVG assets are released under MIT. This does not relicense the model, its generated outputs, or third-party runtime packages; see THIRD_PARTY_NOTICES.md.
