# CALC Pro 2.0 — acceptance and verification

This checklist maps the requested scope to implementation and behavioral evidence. A source file or attempted command is not a passing result. The scope includes the later requests for programmer history showing decimal and hexadecimal values, complex/matrix engineering mode, and an actual desktop application in addition to the website/PWA.

## Final execution snapshot — 2026-10-30

| Gate | Actual recorded result |
| --- | --- |
| Original supplied-project tests | 50 passed; 3 additional original-source checks reproduced the reported defects. |
| Unit/integration tests | **407 passed, 0 failed** across 7 files; evidence/unit-results.json. |
| TypeScript, ESLint, production build and lockfile | **Passed**; pinned versions resolved consistently using an offline lockfile check. |
| Browser matrix | **106 passed, 20 explicit skips, 0 failures, 0 flaky** across 6 projects; evidence/browser-results.json. |
| Packaged native Mac app | **13 checks passed, 0 renderer/console errors** on the actual macOS arm64 executable; evidence/desktop-tests.json. |
| Offline and update lifecycle | All 5 modes work after cached offline reload; waiting-worker update preserves saved calculations; tested in Chromium desktop/Android profile. |
| Subdirectory production deployment | **4 checks passed**, including relative assets, /calc/ service-worker scope and offline calculation; evidence/subpath-tests.json. |
| Visual QA and icons | Dark/light desktop, mobile and real graph views rendered and inspected; PNG 192/512/maskable 512 and Apple 180 dimensions checked. |
| Production dependencies | **0 advisories** in captured production audit. |
| Developer/build-tool dependencies | **4 low findings**, inherited through Workbox/deepmerge; no moderate/high/critical findings. No patched upstream version was available in the captured audit. |
| Final ZIP inventory, CRC and hashes | **PASS**, recorded by scripts/package-release.py in release/PACKAGE-AUDIT.json and release/SHA256SUMS.txt. |
| Physical devices and store distribution | Windows, Android/iPhone/iPad hardware installation, another Mac and store distribution remain unverified. |

The browser totals contain 21 passing Chromium cases, 21 passing Android-profile cases and 16 passes plus 5 explicit skips in each Firefox, desktop WebKit, iPhone and iPad profile. The skipped cases require Chromium service-worker, clipboard-permission or CDP multi-touch instrumentation. General mode, layout, keypad, graph export and accessibility checks pass on all six profiles. Mobile WebKit has no mouse wheel; that subsection uses supported zoom controls instead. These are automated profiles on the available Mac, not physical-device certification.

## Evidence references

- `src/engine/scientific.test.ts`: operations/precedence, domains/range, security/complexity and numerical boundary regressions.
- `src/engine/programmer.test.ts`: exact arithmetic, every word width, signed/unsigned masks/shifts, base validation, bits and HEX regression.
- `src/engine/units.test.ts`: all 13 categories, independent conversion examples, every ordered unit-pair round trip, temperature limits, precision and input/range validation.
- `src/engine/engineering.test.ts`: complex values/functions/domains/range and matrix parsing/operations/pivoting/residuals/singularities.
- `src/engine/graph.test.ts`: geometry, real adaptive sampling, poles/chord error/evaluation bounds and extreme grid indices.
- `src/engine/engine.test.ts`: preserved and corrected original cross-engine suite.
- `src/storage.test.ts`: guarded persistence and clear-entry behavior.
- `e2e/app.spec.ts`: scientific keys/keyboard, numerical regressions, history/memory/preferences, responsive/console behavior, storage corruption, accessibility, clipboard and production offline all-mode use.
- `e2e/modes.spec.ts`: actual graph/programmer/converter/engineering controls/results, graph PNG and gestures, mode history, clipboard and saved-state recovery.
- `e2e/update.spec.ts`: waiting PWA-update approval and persisted state across reload.
- `scripts/test-desktop.mjs`: actual packaged Electron executable, all modes, persistence, menus, clipboard, graph export and isolation/security settings.

## Browser and native compatibility boundaries

The browser matrix configures Desktop Chromium, Desktop Firefox, Desktop WebKit, iPhone 13/WebKit, Pixel 7/Chromium and iPad 7/WebKit profiles. These are automated engines/profiles on the available host, not physical Windows/Android/iOS certificates. Chromium-specific CDP gestures, clipboard permissions and service-worker lifecycle tests are deliberately skipped on unsupported engines; the final report must retain skip counts and reasons. General pointer/layout/mode checks still run where supported. Mouse-wheel injection is omitted only on mobile profiles, where the zoom buttons and real Chromium touch/pinch test cover supported input. No physical multi-touch Safari device was available.

The actual native executable passed13 checks in evidence/desktop-tests.json with zero renderer/console errors; its ASAR contains the exact final production JavaScript (SHA256374b2ce534bbd56172770fdc939d42bba69c36c2fd86bd612c74c92eae052fd4). The native target is Apple silicon macOS arm64. Its bundle uses an ad hoc integrity signature and is not Apple-notarized. A successful local packaged launch does not establish Gatekeeper behavior after downloading on another Mac. Windows/Linux/Intel Mac native artifacts and iOS/Android store packages are not claimed.

## 1. Preserve and improve the existing application

| ID | Required acceptance | Implementation | Corresponding test/evidence | Actual verification result |
| --- | --- | --- | --- | --- |
| A01 | Extract/inspect supplied ZIP; preserve working components and source evidence | Original CALC-Pro.zip retained; existing React/TypeScript/Vite/PWA mode architecture extended | Original 50-test baseline; evidence/baseline.txt; engine.test.ts | Baseline PASS; source/package review PASS |
| A02 | Fix compilation, runtime, dependency and mathematical defects; maintain organized source | Pure engine modules, guarded mode components, storage/UI modules; updated toolchain | TypeScript, ESLint, production build, engine regressions and browser console checks | TypeScript/lint/build PASS in release run; Browser PASS (106 passed; 20 scoped skips) |
| A03 | Remove fake/broken controls and unnecessary broad runtime; preserve real functionality | Dedicated deterministic parser; all five functional mode components | app.spec.ts scientific control loop; modes.spec.ts all-mode interactions; dependency review | Browser PASS (106 passed; 20 scoped skips); final package review PASS |

## 2–3. Scientific functionality and numerical correctness

| ID | Required acceptance | Implementation | Corresponding test/evidence | Actual verification result |
| --- | --- | --- | --- | --- |
| S01 | Addition, subtraction, multiplication and division | calc.ts AST arithmetic interpreter | scientific.test.ts operation table; engine.test.ts; app.spec.ts keypad | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S02 | Parentheses, nested expressions, implicit multiplication and scientific notation | Bounded parser, numeric tokenizer and trailing-parenthesis preparation | Nested/group/implicit-product/notation cases; unmatched-close rejection | Unit PASS |
| S03 | Correct precedence and associativity, including 2^3^2 and negative powers/bases | Right-associative powers, unary sign ordering and grouped bases | 2^3^2=512; -2^2=-4; (-2)^2=4; 2^-3; negative-base domain cases | Unit PASS |
| S04 | Clearly defined percentage behavior | Postfix percent and contextual right-percent addition/subtraction | scientific.test.ts percent table; NUMERICS.md examples; keypad Percent | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S05 | Positive/negative sign switching | Calculator Change sign edit action | app.spec.ts scientific controls/editing | Browser PASS (106 passed; 20 scoped skips) |
| S06 | Square, cube, arbitrary powers and negative powers | Power interpreter plus x²/x³/xʸ keys | scientific.test.ts powers; app.spec.ts function-button loop | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S07 | Square root, cube root and nth root | Domain-checked sqrt/cbrt/nthRoot functions | Real roots/negative odd roots/nth-root domain and underflow cases; root controls | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S08 | Factorial with appropriate domain limits | Bounded integer factorial for 0–170 | 0!, 5!, repeated factorial, negative/fractional/171! rejection | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S09 | Reciprocal and absolute value | Validated reciprocal/abs functions | Reciprocal/absolute values and zero reciprocal tests; controls | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S10 | Modulus and remainder with defined negative-input behavior | Floor modulus and truncating remainder; stable disparate-scale path | Scientific mod/rem value/domain and large-scale remainder regressions | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S11 | Natural/base10/arbitrary-base logs and exponential functions | ln/log/logbase/exp dispatch with domains | Log/exp values, invalid base/nonpositive arguments, overflow/underflow cases | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S12 | sin/cos/tan, inverse trig, hyperbolics and DEG/RAD | Angle-aware real functions, exact quadrantal handling and large-angle guard | DEG/RAD/inverse/hyperbolic/singularity cases; angle and function controls | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S13 | π/e constants, answer recall and expression reuse | Scoped constants/Ans; scientific history expression/result actions | Constant/Ans/M tests; app.spec.ts answer/history reuse | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S14 | Clear, clear-entry, delete and undo | Controlled expression editing, clearEntry helper, bounded undo stack | storage.test.ts clear-entry cases; app.spec.ts editing/control assertions | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S15 | Copy/paste and physical keyboard support | Native input editing plus explicit clipboard controls and shortcuts | app.spec.ts keyboard calculation/editing and clipboard copy/native paste/fallback | Browser PASS (106 passed; 20 scoped skips) |
| S16 | Secure deterministic parser without JavaScript eval | Whitelisted tokens/AST/functions; no dynamic JavaScript generation | Malicious property/import/assignment/code-like inputs; complexity/depth tests; production CSP | Unit PASS; production policy review PASS |
| S17 | Reproduce/fix extremely small numbers incorrectly rounded to zero | Removed arbitrary near-zero cutoff; tiny-value exponent formatting | Original defect reproduction; 1e-20/1e-100/1e-300/5e-324 and tiny trig regressions | Original defect confirmed; regression Unit PASS |
| S18 | Correct overflow; distinguish evaluated zero denominator from overflow | Operand-level zero/range checks; finite-result normalization | 1/(2-2), 0/0, 1/0, 10^400, exp/factorial overflow and underflow cases | Original defect confirmed; regression Unit PASS |
| S19 | Fix signed hexadecimal overflow | Raw programmer digit text parsed before one word mask | Original 8-bit 801 reproduction; programmer.test.ts signed HEX accumulation tests; modes E2E | Original defect confirmed; Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| S20 | Very large/small values, floating precision, domains and decimal edge cases | Binary64 calculations, finite formatting and explicit domain/range errors | Boundary formatting/precision; factorial/log/root/trig errors; adjacent decimals; negative powers | Unit PASS |
| S21 | Graceful invalid expressions and understandable errors rather than successful NaN/Infinity | CalcError UI handling and finite formatting | Invalid syntax/domain/range unit cases; app.spec.ts numerical errors and recovery | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |

## 4. Interactive real-function graphing

| ID | Required acceptance | Implementation | Corresponding test/evidence | Actual verification result |
| --- | --- | --- | --- | --- |
| G01 | Plot multiple user functions including sin/cos/x²/x³/logs | Up to eight bounded parsed functions; real canvas drawing | graph.test.ts actual expression sampling; modes.spec.ts graph real expressions | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| G02 | Function colors, visibility, edit, add and delete | Persistent graph-function controls | modes.spec.ts graph edits/color/toggle/delete/reload | Browser PASS (106 passed; 20 scoped skips) |
| G03 | Zoom in/out, mouse drag, touch pan and pinch | Pure viewport transforms, pointer/wheel/buttons and pinch handling | Geometry tests; graph mouse/wheel/keyboard E2E; Chromium CDP touch drag/pinch | Unit PASS; Browser PASS (106 passed; 20 scoped skips); CDP injection is Chromium-specific |
| G04 | Coordinate tracking; negative/fractional coordinates; selected-point evaluation | Screen/world mapping, cursor readout and direct evaluation at x | Negative/fractional geometry; x² at2.5=6.25; cos0=1; point-domain E2E | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| G05 | Axes, adjustable grid and viewport reset | Grid/axis toggles, density select, reset and bounded ticks | Grid geometry/extreme-index regressions; graph controls E2E | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| G06 | Discontinuity-aware accurate/adaptive sampling | Baseline plus midpoint subdivision; split gaps/poles/unresolved sharp changes | 1/(x−a) and tan pole tests; subpixel smooth-curve chord error and domain cases | Unit PASS; finite sampling limits documented |
| G07 | Responsive graph layout and bounded rendering work | ResizeObserver; bounded viewport; shared8k curve budget and RAF coalescing | graph.test.ts evaluation/tick budgets; app.spec.ts responsive modes | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| G08 | Export actual graphs as PNG | Canvas Blob encoding and local PNG download | modes.spec.ts PNG signature and nontrivial byte-count assertions | Browser PASS (106 passed; 20 scoped skips) |

## 5. Programmer mode and decimal/hexadecimal history

| ID | Required acceptance | Implementation | Corresponding test/evidence | Actual verification result |
| --- | --- | --- | --- | --- |
| P01 | BIN/OCT/DEC/HEX and instant conversion | BigInt parseWord/show; matching-prefix support | Programmer base pattern/round-trip tests; modes.spec.ts representations | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| P02 | AND/OR/XOR/NOT, retained NAND/NOR and arithmetic/bitwise operations | Exact BigInt operation dispatch | Programmer operation table; every-operator mode E2E | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| P03 | Left/right shifts with count validation | Signed arithmetic/unsigned logical shift; counts0…n−1 | Shift-mode/count tests; keyboard and button E2E | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| P04 | 8/16/32/64-bit signed/unsigned interpretation and two’s complement | asIntN/asUintN masking and explicit UI interpretation | Every-width limits/wrap; FF signed−1/unsigned255; exact64 regressions | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| P05 | Interactive bit display, correct masking and overflow | Every selected bit toggles before width normalization | All-bit tests at every width; Bit7/Bit31 E2E | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| P06 | Validate every base, negative values, HEX overflow and exact64 values | Strict digit text parser, independent of signed interpretation | Malformed digits/prefix/size limits; signed HEX and >2^53 cases | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| P07 | Every programmer button and keyboard action functional | Digit/operator/NOT/negate/AC/delete controls; shortcuts | modes.spec.ts every arithmetic/bitwise op, keyboard division, invalid input and controls | Browser PASS (106 passed; 20 scoped skips) |
| P08 | Persistent timestamped calculation history with both DEC and HEX | Validated cp.prog.history string entries; favorites/search/reuse/delete/clear | modes.spec.ts programmer history persistence/favorites/reuse/search/deletion | Browser PASS (106 passed; 20 scoped skips) |

## 6. Unit conversion system

| ID | Required acceptance | Implementation | Corresponding test/evidence | Actual verification result |
| --- | --- | --- | --- | --- |
| U01 | Length, mass, temperature, area, volume, speed and time | Local factor tables plus affine temperature formulas | units.test.ts category set/independent constants; modes.spec.ts thirteen categories | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| U02 | Pressure, energy, power, data, angles and frequency | Local constants with explicit conventional unit definitions | All-category representative values and all ordered-pair round trips | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| U03 | Dynamic searchable units, swap and instant recalculation | Search by name/symbol; current-selection retention; swap controls | Full-name coverage; converter search/swap/preference E2E | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| U04 | Input validation and precision control | Strict decimal syntax/range, absolute-zero guard;6/9/12/15 significant digits | Literal underflow, finite max, invalid text/units, temperature and precision tests | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| U05 | Copy result and reliable constants; no fake currency feed | Explicit clipboard feedback; documented local constants; no currency mode | Actual clipboard E2E; NUMERICS.md primary references; source/network review | Browser PASS (106 passed; 20 scoped skips); constants unit tests PASS |

## 7. History, memory, preferences and local storage

| ID | Required acceptance | Implementation | Corresponding test/evidence | Actual verification result |
| --- | --- | --- | --- | --- |
| H01 | Persistent timestamped searchable scientific history | cp.hist up to500 entries; timestamps and filter | app.spec.ts history/reload/search; storage schemas | Browser PASS (106 passed; 20 scoped skips) |
| H02 | Reuse expressions/results; delete individual; clear all; favorites | Separate full-value result reuse; per-entry and global actions | app.spec.ts history/favorites/reuse/deletion and reload assertions | Browser PASS (106 passed; 20 scoped skips) |
| H03 | MR/MC/M+/M− and visible memory state | Persistent finite memory register and status label | Ans/M engine test; app.spec.ts memory controls and reload | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| H04 | Persistent user preferences | Mode/theme/accent/angle/keypad and graph/programmer/converter/engineering keys | app.spec.ts preferences; modes.spec.ts saved edits and malformed storage | Browser PASS (106 passed; 20 scoped skips) |
| H05 | Graceful storage errors/corruption; no unnecessary transmission | Guarded JSON reads/writes, component schemas, in-memory fallback and notice | storage.test.ts; app.spec.ts blocked storage; modes.spec.ts corrupt mode state | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |

## 8–9. Premium UI, responsive interaction and accessibility

| ID | Required acceptance | Implementation | Corresponding test/evidence | Actual verification result |
| --- | --- | --- | --- | --- |
| V01 | Dark graphite/navy, restrained accents, typography/hierarchy and polished workspaces | Shared theme tokens, display/keypad/sidebar/mode layouts | Desktop/mobile screenshots; scientific control loop; appearance tests | Browser PASS (106 passed; 20 scoped skips) and visual review PASS |
| V02 | Light mode and selectable accents | Persistent dark/light and four accent controls | app.spec.ts appearance/reload; accessibility contrast checks | Browser PASS (106 passed; 20 scoped skips) |
| V03 | Mouse/touch/physical keyboard and accessible focus/navigation/ARIA | Semantic labeled controls; keyboard handlers; focus-visible styles | app.spec.ts control/keyboard/focus/axe checks; modes interactions | Browser PASS (106 passed; 20 scoped skips) |
| V04 | Desktop/mobile/tablet/orientation layouts; no normal horizontal overflow | Responsive grids/navigation/typography; safe-area CSS | app.spec.ts all modes responsive across six configured projects; screenshots | Browser PASS (106 passed; 20 scoped skips) |
| V05 | Touch sizing, contrast, reduced motion and safe areas | Responsive key sizes, theme colors, reduced-motion media rule/insets | Automated accessibility/responsive checks and source/visual review | Browser PASS (106 passed; 20 scoped skips); physical safe-area behavior unverified |
| V06 | macOS/Windows/Android/iPhone/iPad compatibility | Standards-based browser/PWA interface plus separate Mac app | Chromium/Firefox/WebKit desktop and iPhone/Pixel/iPad profiles | Browser PASS (106 passed; 20 scoped skips); physical Windows/Android/iOS/iPadOS unverified |

## 10. Installable offline PWA

| ID | Required acceptance | Implementation | Corresponding test/evidence | Actual verification result |
| --- | --- | --- | --- | --- |
| W01 | Valid manifest; PNG app icons/maskable icon and Apple touch icon | Relative id/start/scope,192/512/maskable512 and Apple180 assets | app.spec.ts manifest/icon dimensions; final package inventory | Browser PASS (106 passed; 20 scoped skips); inventory PASS |
| W02 | Service worker, offline caching and reliable assets/paths | Generated Workbox precache; local assets and relative build base | Production build PASS; app.spec.ts cache/reload/all-mode offline operations | Browser PASS (106 passed; 20 scoped skips) |
| W03 | Correct update lifecycle without silent disruption | Waiting-worker prompt and user-triggered reload | update.spec.ts PWA update waits for approval and preserves calculations | Browser PASS (106 passed; 20 scoped skips); Chromium-specific lifecycle harness |
| W04 | History/preferences persist offline and after reload | Browser storage independent of network/cache | app.spec.ts offline and history/prefs reload tests | Browser PASS (106 passed; 20 scoped skips) |
| W05 | Standalone installation and platform instructions | Install event/fallback help; platform instructions and primary sources | Manifest and browser checks; INSTALLATION.md; target-device install gate | Automated checks PASS; physical OS installation unverified |

## Engineering addition and actual standalone application

| ID | Required acceptance | Implementation | Corresponding test/evidence | Actual verification result |
| --- | --- | --- | --- | --- |
| E01 | Complex numbers with real user expressions and principal functions | Shared safe parser; binary64 complex arithmetic/functions | engineering.test.ts complex functions/domains/range; modes.spec.ts complex results | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| E02 | Matrix add/subtract/multiply/transpose/determinant/inverse/solve | Validated real≤4×4 matrices and scaled pivoting | Matrix independent results, inverse identity/residual/singularity/range tests; all7 mode ops | Unit PASS; Browser PASS (106 passed; 20 scoped skips) |
| E03 | Editable engineering inputs, copy, clear, result reuse and errors | Complex/matrix input/output controls and Use result as A | Engineering mode/control and clipboard E2E | Browser PASS (106 passed; 20 scoped skips) |
| D01 | Actual desktop app in addition to website/PWA | Electron macOS arm64 bundle with compiled local interface | desktop/main.cjs; desktop:package; test:desktop launches packaged executable | Desktop PASS (13 packaged-app checks); not satisfied by source alone |
| D02 | Desktop offline functionality, persistence, menus, graph export and security | Bundled calc-pro origin; isolated/sandboxed renderer; native menus and PNG flow | scripts/test-desktop.mjs; evidence/desktop-tests.json and screenshots/export | Desktop PASS (13 packaged-app checks) |
| D03 | Installable native package and integrity evidence | Versioned Mac ZIP and ad hoc bundle signature; no Apple notarization | evidence/desktop-package.json; codesign verify and archive audit | Desktop PASS (13 packaged-app checks); physical second-Mac install and other native targets unverified |

## 11–13. Performance, reliability, mandatory testing and security

| ID | Required acceptance | Implementation | Corresponding test/evidence | Actual verification result |
| --- | --- | --- | --- | --- |
| Q01 | Bounded evaluation/render/history work; avoid reproducible freezing | Parser/input/matrix limits, graph shared budget/ticks/RAF, history caps | Complexity/resource-bound regressions and browser interaction tests | Unit PASS; Browser PASS (106 passed; 20 scoped skips); no hard real-time device guarantee |
| Q02 | Startup/bundle/memory/render reliability and no critical console failures | Local assets, removed broad math runtime, finite outputs, error boundary | Production build size output; app.spec.ts all modes console/runtime checks | Build PASS; Browser PASS (106 passed; 20 scoped skips) |
| Q03 | Executed unit/integration/E2E tests; rerun actual failures | Vitest engine/storage suites and Playwright real controls | evidence/unit-results.json and browser-results.json; final rerun logs | PASS: 407 passed, 0 failed in the captured report; Browser PASS (106 passed; 20 scoped skips) |
| Q04 | TypeScript, lint and production compilation | Release package scripts | npm run typecheck; npm run lint; npm run build | PASS in latest release command run; final package snapshot checks PASS |
| Q05 | No eval/injection; bounded expressions, validated inputs/storage, local privacy | Whitelist interpreter, escaped React text, strict number/matrix parsing, CSP | Malicious-input/complexity/corrupt-state tests; desktop isolation checks | Unit PASS; Browser PASS (106 passed; 20 scoped skips) and Desktop PASS (13 packaged-app checks) |
| Q06 | Safe dependencies, no secrets and no unnecessary tracking | Pinned lockfile, local-only runtime assets/calculations and scoped audit | Production/full audit JSON; source/network review | Production audit0 advisories; full tool tree4 low inherited via Workbox/deepmerge; gap documented |

## 14–17. Release artifacts, quality gate and completion reporting

| ID | Required acceptance | Implementation | Corresponding test/evidence | Actual verification result |
| --- | --- | --- | --- | --- |
| R01 | Complete updated source/assets/tests and production build | src/public/config/lockfile/e2e/desktop/scripts plus generated dist | Final inventory; source checks; unit/browser/native execution | Source/units/build pass as above; Package PASS (CRC/inventory/SHA256) |
| R02 | README/install/run commands/architecture/changelog/limitations | README, CHANGELOG and docs including DESKTOP/NUMERICS/ACCEPTANCE | Documentation/source consistency check | Documentation and final evidence-count review PASS |
| R03 | Downloadable completed project ZIP and native app artifact | Versioned source+build archive and separate Macapp archive | CRC/required-file/hash checks; packaged app executable tests | Package PASS (CRC/inventory/SHA256) and Desktop PASS (13 packaged-app checks) |
| R04 | Every visible button and mode accepted by behavior, not source existence | Actual scientific/mode/application/native controls | app.spec.ts, modes.spec.ts, update.spec.ts, test-desktop.mjs and visual QA | Browser PASS (106 passed; 20 scoped skips) and Desktop PASS (13 packaged-app checks) |
| R05 | Final report includes actual results, compatibility/build status and limits | This checklist plus final delivery report | Compare actual reports, package contents and remaining platform gaps | Final report delivered; physical-platform and distribution boundaries remain explicit |

## Documented numerical and product limits

Scientific/engineering/conversion/graph modes use finite IEEE 754 binary64, with display precision and range behavior described in `NUMERICS.md`; programmer words use exact BigInt within the selected width. Graphing uses bounded numerical sampling, not symbolic discontinuity analysis. Matrices are real and limited to 4×4. Browser profile storage is local, unencrypted by the application, subject to eviction, and independent from desktop data. Favorites do not bypass the 500-entry caps. These are explicit product limits rather than arbitrary-precision or physical measurement claims.

The project is authoritative at `/Users/prabhuram04yahoo.com/Documents/Bhupesh/Projects/CALC-Pro`; the previous duplicate working copy was removed at the user’s request. Development browser/runtime caches are excluded from release archives and can be reinstalled for testing. The original supplied `CALC-Pro.zip` remains historical evidence, not the active release source.

Do not report 100% solely because implementation, tests or packaging were attempted. Final completion must distinguish implemented behavior, passing automated checks, verified local packaged-app operation, unresolved tooling advisories, and remaining physical-platform/installability gates.
