# CALC PRO — FINAL RELEASE

Version 2.0.0 · Released 2026-10-30

CALC Pro is delivered as a production website, installable offline PWA and a tested standalone macOS Apple silicon application. All project files are in the requested CALC-Pro directory. The previous duplicate working copy was deleted; the original CALC-Pro.zip remains historical evidence.

## Downloads

- release/CALC-Pro-2.0.0-source-and-web.zip: complete updated source, production dist, assets, tests, desktop packaging source, documentation and evidence.
- release/CALC-Pro-2.0.0-macOS-arm64.zip: ready-to-run CALC Pro.app.
- release/SHA256SUMS.txt and release/PACKAGE-AUDIT.json: hashes, CRC verification and inventory results.

## Run the Mac app

Extract the macOS ZIP and drag CALC Pro.app into Applications. Open it normally. It needs no Node.js, terminal, web server or internet. This is an ad hoc signed build and is not Apple-notarized; Gatekeeper can require Open Anyway under Privacy & Security for a downloaded copy. Other native operating systems and Intel Mac packages are not claimed.

## Run the website

```sh
cd "/Users/prabhuram04yahoo.com/Documents/Bhupesh/Projects/CALC-Pro"
npm ci
npm run build
npm run preview
```

Open http://127.0.0.1:4173. Use npm run dev for development. The complete dist directory can be deployed to an HTTPS static host; no external host was published in this local release.

## Install the PWA

Load the production website and wait for offline readiness. Mac/Windows Chrome or Edge: Install icon; macOS Safari: File > Add to Dock where supported. Android Chrome: Install and create shortcut > Install, or the offered home-screen option. iPhone/iPad Safari: Share > Add to Home Screen. A phone needs an HTTPS URL rather than this Mac's localhost address. Full instructions are in docs/INSTALLATION.md.

## Implemented

Scientific functions and secure expressions; interactive multi-function graphing and PNG export; exact BigInt programmer operations and DEC+HEX history; 13 conversion categories; complex arithmetic and 7 matrix operations; searchable/favorite persistent history, memory and preferences; dark/light themes, accents, keyboard and responsive controls; offline caching and prompted updates.

## Bugs fixed

Tiny finite values rounded to zero; computed zero denominators mislabeled as overflow; signed HEX digit accumulation; malformed decimals; large-scale modulo loss; finite maximum formatting overflow; converter underflow and absolute-zero validation; complex integer-power residuals; extreme graph grid loops; tablet navigation labels; and the scientific keypad cursor race during fast typing.

## Actual verification

- 407 unit/integration tests passed; 0 failures.
- 106 browser tests passed across Chromium, Firefox, WebKit and mobile/tablet profiles; 20 explicit engine-specific skips; 0 failures or flaky tests.
- 13 checks passed on the actual packaged Mac app, including all modes, native clipboard/PNG, menus, renderer security and persistence after full relaunch.
- 4 subdirectory/offline scope checks passed.
- TypeScript, ESLint, production build, offline lockfile consistency, icon dimensions and rendered visual QA passed.
- Both release ZIPs passed CRC/inventory checks; SHA256 hashes are supplied.

## Limits and release boundaries

Scientific/engineering/graph/conversion use binary64, not arbitrary precision. Matrices are real and limited to 4x4; graph sampling is bounded; histories retain up to 500 entries. The Mac build is ad hoc signed and not notarized. Physical Windows/Android/iOS/iPadOS installation and another Mac were not verified. Production dependencies have 0 advisories; the development tree retains 4 low Workbox/deepmerge findings and no moderate/high/critical findings. This release does not claim 100% physical-platform certification or store readiness.

See docs/ACCEPTANCE.md for requirement-by-requirement implementation, tests and actual results. No software behavior is marked complete merely because its source exists.
