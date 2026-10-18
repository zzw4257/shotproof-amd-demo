# Actual AMD demo script, about 90 seconds

Use the private authenticated ShotProof GPU app. Do not film unrelated browser tabs, addresses, messages or credentials. Keep both images and the model's original output inspectable.

0–15 s: Show the original reference and candidate. Explain that these are synthetic illustrations and no accuracy benchmark is claimed.

15–35 s: Select occlusion, then click Request image comparison. The running backend sends both PNGs to Qwen2-VL-7B on the observed AMD MI300X VF. Show the actual returned model and measured generation time. Do not substitute a cached result or text-only request.

35–55 s: Read the visible finding. The hidden region remains unresolved. Explain that low or numeric model uncertainty is not calibrated confidence. If format validation fails, show the raw output and failed status.

55–75 s: Choose Agent demonstration when the agent operates the demo. Add a review reason and mark uncertain. This demonstrates the workflow without falsely recording a human approval. A real owner can later select Human reviewer and add a separate decision.

75–90 s: Export the actual evidence after filming. Browser download menus may expose personal filenames, so keep them out of the deliverable video. Verify exact transmitted PNG hashes and raw-output hash with verify_evidence.py. Show the validation result in the final material if useful.

Mention that the live environment is private and requires AMD login. A public recorded-results viewer must be explicitly labeled as recorded. No anonymous judge access or production benefit is implied.
