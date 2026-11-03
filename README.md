# CALC Pro 2.0

A private calculator workspace for scientific expressions, interactive graphs, exact programmer arithmetic, unit conversion, complex numbers and matrices. It is delivered as a browser website, an installable offline PWA and a bundled macOS desktop application; packaged-desktop acceptance is recorded separately below. CALC Pro extends the supplied React/TypeScript/Vite/PWA project; the original archive is preserved as `CALC-Pro.zip` for reference.

## Run on your Mac

For the standalone application, extract `CALC-Pro-2.0.0-macOS-arm64.zip` and move **CALC Pro.app** into Applications. It runs without Node.js, a terminal, a server or internet. The commands below run the website and development version.

Use Node.js 22.12+ or Node.js 24+. The lockfile records the tested dependency resolution.

```bash
cd "/Users/prabhuram04yahoo.com/Documents/Bhupesh/Projects/CALC-Pro"
npm ci
npm run dev
```

Open the address shown by Vite, normally `http://127.0.0.1:5173`. For the production build and offline PWA:

```bash
npm run build
npm run preview
```

Open `http://127.0.0.1:4173`. The server is needed for the first load and updates. After caching, core functions work offline while the browser retains its stored assets. Do not open `dist/index.html` through a `file://` URL. An HTTPS deployment is needed to install on other devices; this computer’s localhost address is not your phone’s localhost address.

## Workspaces

| Mode | Capabilities |
| --- | --- |
| Scientific | Secure expression parser; arithmetic, nested parentheses, implicit multiplication, scientific notation, percent, sign, powers/roots, factorial, reciprocal, modulus/remainder, logarithms, exponentials, trig/inverse/hyperbolic functions, DEG/RAD, constants, answer and memory recall, live preview, undo, keyboard editing and clipboard controls. |
| Graphing | Up to eight editable real functions; colors and visibility; axes and grid controls; mouse/touch panning and pinch/wheel zoom; coordinate tracking; point evaluation; reset; PNG export; bounded adaptive sampling with discontinuity breaks. |
| Programmer | Exact BigInt arithmetic at 8/16/32/64 bits; BIN/OCT/DEC/HEX; signed/unsigned interpretation; two’s complement; logical operations, shifts and interactive bits; persistent history showing both DEC and HEX. |
| Converter | Length, mass, temperature, area, volume, speed, time, pressure, energy, power, data, angle and frequency; searchable units, swap, copy and selectable significant digits. |
| Engineering | Complex arithmetic and principal elementary functions; real matrices up to 4×4; addition, subtraction, multiplication, transpose, determinant, inverse and AX=B solutions. |

Scientific history includes timestamps, search, favorites, expression/result reuse, individual deletion and clear-all. Preferences, memory, drafts, graph configuration and engineering inputs are saved locally. The interface includes dark/light themes, four accent choices, keyboard focus indicators, responsive layouts, touch controls, safe-area handling and reduced-motion support.

## Numerical rules

Scientific, graphing, conversion and engineering calculations use IEEE 754 binary64, not arbitrary precision. Scientific/engineering output normally uses 12 significant digits; conversion offers 6, 9, 12 or 15. Range-boundary formatting can retain additional digits to keep a finite value finite. Full-precision scientific history results are retained for reuse.

- `2^3^2 = 512`; `-2^2 = -4`; `(-2)^2 = 4`.
- `50% = 0.5`; `200+10% = 220`; `200×10% = 20`.
- `log(x)` means base 10; `ln(x)` means natural logarithm; use `logbase(x,b)` for another base.
- `nthRoot(x,n)` supports real odd roots of negative values; factorial accepts integers 0–170.
- Scientific `mod` uses the divisor’s sign; `rem` uses the dividend’s sign. Programmer `MOD` is integer remainder, matching truncating integer division.
- Programmer arithmetic wraps modulo 2ⁿ; signed right shifts preserve sign, unsigned shifts fill with zero.
- Graphing and complex functions use radians. Complex roots/logarithms use principal branches.

Invalid syntax, domain failures, zero division, overflow and detected underflow produce readable messages. See [numerical behavior](docs/NUMERICS.md) for exact limits and examples.

## Install as an app

Load the production site once and wait for offline setup. Use **Install app** in CALC Pro, or your browser’s installation menu. Chrome/Edge offer desktop installation; Safari on macOS Sonoma 14+ supports **File → Add to Dock**. On Android Chrome use **Install and create shortcut → Install** or the installation option offered by your version. On iPhone/iPad Safari use **Share → Add to Home Screen**, keeping **Open as Web App** enabled where offered. Browser wording and support vary. Full instructions and offline checks are in [Installation](docs/INSTALLATION.md).

## Standalone Mac application

The desktop application bundles the same production interface with Electron and works offline without Node.js, a terminal or a running local server. The native target is macOS arm64 (Apple silicon). Its package is `release/CALC-Pro-2.0.0-macOS-arm64.zip`; extract and move `CALC Pro.app` into Applications. Final packaging/launch results are recorded in the acceptance checklist, so an expected filename is not a success claim.

For development or rebuilding:

```bash
npm run desktop:runtime
npm run desktop:package
npm run test:desktop
```

The package has an ad hoc integrity signature and is not Apple-notarized. Gatekeeper can require the system’s Open Anyway approval for a downloaded app. Do not disable system security globally. Desktop data is stored in its own local profile, independently of browser/PWA data. See [desktop installation, security and verification](docs/DESKTOP.md).

## Verify a release

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run browsers:install
npm run test:e2e
npm run test:e2e:report
npm audit
```

`npm run check` runs lint, unit tests and the production build. Playwright is a separate step and exercises the production preview. Tests are assertions against real evaluated results and actual controls, including graph PNG data and reload persistence.

| Release gate | Current result |
| --- | --- |
| TypeScript, lint and production build | Latest release run passed; final packaged snapshot checks pending |
| Unit/regression suites | 407 passed, 0 failed in the latest captured Vitest report |
| Browser and responsive end-to-end suites | PENDING_FINAL_RUN |
| Offline production reload and calculation | PENDING_FINAL_RUN |
| Dependency audit and package integrity | Production dependency audit: 0 advisories; full tool tree: 4 low-severity advisories; package integrity pending |
| Physical Windows, Android, iPhone/iPad and standalone installation | Not verified on physical devices in this environment |

The [acceptance checklist](docs/ACCEPTANCE.md) maps the requested features to source and test evidence. A source file’s existence is not a passing acceptance result.

## Privacy and storage

Calculations are evaluated on this device. CALC Pro has no account requirement, analytics, remote fonts, currency feed or calculation API. Its service worker requests same-origin application assets for caching and updates. Clipboard access occurs only when you use a copy/paste control and remains subject to browser permissions.

Saved data is local to the browser profile and site origin, is not encrypted by the app, and is not synchronized across devices or tabs. Browser cleanup, private browsing policies or storage eviction can remove it. If storage is blocked or full, the app continues in memory and shows a notice. Favorites do not override the 500-entry retention cap.

## Limits and verification boundaries

- Binary64 rounding, cancellation and conditioning still apply; displayed digits are not a measurement-accuracy guarantee.
- Graphs use bounded numerical sampling. Very rapid oscillations, tiny gaps and extreme zoom may need a narrower viewport. Sampling is not symbolic discontinuity analysis.
- Matrices contain real finite numbers, up to 4×4. Singular or numerically unstable solutions are rejected; this is not an arbitrary-size linear algebra package.
- Browser emulation on macOS cannot certify physical Android/iOS touch behavior, Windows rendering or operating-system installation flows.
- The desktop package targets Apple silicon macOS (arm64). It uses an ad hoc integrity signature, without Apple Developer identity or notarization. Windows/Linux/Intel Mac native packages and physical installation on another Mac are unverified. See the separate desktop evidence before treating a package as accepted.
- A local preview is for local use; deploy `dist/` on a suitable HTTPS static host for shared production access.

## Project guide

- [Architecture](docs/ARCHITECTURE.md)
- [Standalone desktop app](docs/DESKTOP.md)
- [Installation and deployment](docs/INSTALLATION.md)
- [Numerics and conversion references](docs/NUMERICS.md)
- [Acceptance and test evidence](docs/ACCEPTANCE.md)
- [Changelog](CHANGELOG.md)

The active source is in `src/`, application assets in `public/`, automated browser tests in `e2e/`, the generated production site in `dist/` after building, and desktop source/packaging in `desktop/` and `scripts/`. Do not edit the historical ZIP to change the running application.

## Final verified release

Version 2.0.0: 407 unit tests, 106 browser tests and 13 packaged Mac-app checks passed. The browser suite records 20 explicit engine-specific skips and 0 failures. Compilation, TypeScript, lint, offline scope and visual checks passed. See [Final release](RELEASE.md), [acceptance matrix](docs/ACCEPTANCE.md) and evidence/final-verification.json. The separate macOS archive contains the ready-to-run application; the source archive includes the production website and all tests. Physical-device and signing boundaries remain documented.
