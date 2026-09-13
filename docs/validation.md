# Validation and evidence

## What is established

- The final ParaDrain 0.1 model matches the shared product geometry and canonical location keyframes.
- The clean Blender file has one final-product scene, 17 product objects and one shared mesh for both baskets.
- The shared data preserves the 404 × 112 × 450 mm body, 400 mm rear interface, 120 mm station pitch and 8 mm inter-basket clearance.
- Screen, floor, top-cover and retainer internal gaps are 18 mm. Engaged keeper geometry obstructs a 4 mm upward retainer movement.
- Continuous swept-component tests check the translated product solids across 41 keyframe intervals. Tapered guide bounds are conservative.
- The HTML carry-path adaptation preserves the retainer/keeper relationship during the loaded lift and preserves docking, transfer and reset ordering.

## Reproduce

```sh
npm ci
npm test
python3 tools/validate_geometry.py
npm run build
npx playwright install chromium
npm run test:browser
```

For Blender verification, open the canonical `.blend` and execute `blender/verify.py`. `blender/build.py` rebuilds the final file from shared source before verification when needed.

## Reports

- [Current product-geometry report](../evidence/geometry-validation.json): 313,696 continuous component-pair checks, dimensions, slots, keeper obstruction and mass.
- [Promotion report](../evidence/promotion.json): source identity and saved-file equivalence.
- [Local Cloudflare Pages preview](../evidence/pages-preview.json): product loading, technical assets, story and 404 behavior; no live deployment.
- [Public-package report](../evidence/public-package.json): local sharing-package checks and browser verification summary.

`npm test` checks geometry contracts and source/adapted motion. Playwright exercises the actual production HTML, playback, seeking, chapter selection, viewing controls, mobile layout, technical links and the fallback. Browser behavior is ordinary application testing; no LLM or agent-host qualification is involved.

## What is not established

No simulation or test here establishes hydraulic capacity, bypass activation, flood protection, field capture efficiency, removal of all litter, guide forces, loaded handling, materials durability, final hardware strength or manufacturing readiness. Litter objects in the demonstration follow authored paths; they do not establish physical retention by being animated alongside the basket.

The final label records a design decision. It does not convert the specification's open physical targets into passing results.
