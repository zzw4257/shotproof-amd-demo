# ShotProof

Compare a reference and candidate image, inspect a real AMD vision-model proposal, and preserve the evidence behind a reviewer decision.

The working private demo runs Qwen2-VL-7B-Instruct on an AMD Instinct MI300X VF through the official AMD Notebook environment. It sends both actual images, retains raw responses and byte hashes, and keeps reviewer annotations separate. See [AMD_REPRODUCTION.md](AMD_REPRODUCTION.md) for the observed runtime and complete limits.

## Judge access

Open the [recorded AMD evidence viewer](https://oldblog.zzw4257.cn/shotproof-amd-demo/evidence.html). It loads three saved comparisons and verifies exact PNG and raw-output hashes. This static page makes no inference request and needs no login. It includes the captioned 42-second actual GPU demonstration and five-slide pitch.

## Run locally without credentials

    python3 server.py

Open http://127.0.0.1:8765. Manual image review and evidence export work offline. The image-request endpoint blocks when neither an AMD Notebook backend nor an approved API configuration exists. It never loads canned model results or substitutes CPU inference.

## Run on an existing AMD GPU notebook

Use the already installed runtime and cached model. Run `start_amd_notebook.py` from a notebook with the existing snapshot path, then use its authenticated `/proxy/8765/` route. It creates no public tunnel, API key or package/model download. Full steps: [AMD_REPRODUCTION.md](AMD_REPRODUCTION.md).

## Review workspace

The HTML workspace keeps the image pair central, with manual observations in a separate review inspector. On narrow screens, Reference/Candidate tabs show the complete image at a readable size. The static `docs/review.html` route supports manual notes and export; it does not expose a nonfunctional model endpoint.

The recorded viewer in `docs/evidence.html` verifies all PNG and raw-output hashes before showing a run. Findings are parsed from the hashed original output; changing an unverified duplicate display field does not change the finding. An invalid receipt hides the result and disables export, while import and restore controls remain usable.

## Evidence and review

The original synthetic reference, addition, occlusion and lighting illustrations retain their original hashes. The request records exact transmitted PNG bytes/hashes, source SVG hashes, model/snapshot, runtime, token counts, generation time and raw output. Whole-response Markdown JSON fences may be removed for parsing; no semantic field is invented. Invalid outputs remain visible. The agent demonstration identity is distinct from a human reviewer. Export before leaving a browser session.

## Validation

    python3 validate.py
    python3 -m unittest discover -s tests -p 'test_inference.py' -v
    python3 verify_evidence.py path/to/export.json

The original 110 engineering checks and nine gateway tests pass. The redesigned workspace also passed real browser checks at 1600, 768, 390 and 320 px, including tamper blocking, recovery, mobile image switching and actual manual-note export. Run `node tests/browser_redesign.cjs` with Playwright available while the local server is running. Real browser checks at three viewport sizes passed, and the authenticated UI has made actual MI300X image requests. These checks do not establish model accuracy or production readiness.

## Limits and release status

These authored illustrations are workflow examples with text labels, not an evaluation set. Earlier research STOP conclusions remain unchanged. No customer benefit, calibrated confidence or signed hardware attestation is claimed. The live URL requires AMD login. The source and recorded evidence viewer are released for review; the live GPU app remains private. No final hackathon submission has occurred. The MIT license covers project-owned code and original SVG illustrations only. Model weights are not bundled or relicensed. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for scope and upstream model terms.
