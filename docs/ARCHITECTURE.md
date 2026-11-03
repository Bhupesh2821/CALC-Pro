# Architecture

CALC Pro remains a client-side React 18 application written in TypeScript and bundled by Vite. The original mode-level component organization was preserved. The numerical engines are independent of React, making them testable without a browser. No application backend is required.

## Source layout

| Location | Responsibility |
| --- | --- |
| `src/main.tsx` | React entry point and shared stylesheet. |
| `src/App.tsx` | Mode navigation, error boundary, appearance preferences, notifications, install guidance and service-worker update UI. |
| `src/Calculator.tsx` | Scientific/standard keypad, expression editing, preview, answer/memory state and scientific history. |
| `src/Graph.tsx` | Canvas workspace, function controls, resize handling, pointers, selected-point values and PNG export. |
| `src/Programmer.tsx` | Exact-integer UI, number-base selection, bit inspector and DEC/HEX history. |
| `src/Units.tsx` | Category/unit selection, search, input validation, precision and conversion results. |
| `src/Engineering.tsx` | Complex expression and matrix input/result workspaces. |
| `src/engine/calc.ts` | Tokenizer, parser, bounded AST interpreter, real functions, formatting and graph compilation. |
| `src/engine/programmer.ts` | BigInt parsing, word-size masks, signed interpretation, operations and bit toggling. |
| `src/engine/units.ts` | Local conversion factors, temperature formulas, input validation and formatting. |
| `src/engine/engineering.ts` | Complex elementary functions and real matrix operations. |
| `src/engine/graph.ts` | Canvas-independent geometry, grid ticks and bounded adaptive curve sampling. |
| `src/storage.ts`, `src/useStored.ts` | Guarded localStorage access, typed defaults, persistence and clipboard feedback. |
| `src/styles.css`, `src/Icon.tsx` | Responsive themes, tokens, controls and local vector icons. |
| `public/` | Offline local icons and static assets. |
| `src/**/*.test.ts`, `e2e/` | Numeric/security regressions and real-browser integration tests. |
| `vite.config.ts` | Build paths, PWA manifest/cache generation, security policy and unit-test configuration. |
| `desktop/main.cjs` | Standalone Electron main process, sandboxed window, local asset protocol, native menus, permissions and download/navigation restrictions. |
| `desktop/install-runtime.mjs`, `scripts/package-desktop.mjs`, `scripts/test-desktop.mjs` | Project-local pinned runtime installation, source-free native packaging and actual packaged-process verification. |

## Expression evaluation

Input is normalized from display operators, then tokenized and parsed into a small explicitly typed syntax tree. A recursive interpreter handles only supported node kinds, symbols, operators and function names. There is no JavaScript `eval`, `Function` constructor, property access, assignment, imports, array/object literal execution or user-defined function registration.

The parser caps input at 2,048 characters, 512 tokens, nesting/AST depth 48 and eight arguments per function call. Evaluation follows the tree directly. Graph compilation parses once and returns a closure over the validated tree; it does not compile JavaScript. Real graph-domain failures return an invalid point to the sampler, which breaks the curve instead of drawing a false segment.

Scientific mode supplies only answer/memory values. Graph mode supplies x and rejects answer/memory symbols. Engineering uses the same parser in complex mode but provides its own arithmetic/functions and accepts only i, π and e as constants. Function-specific domains and numerical range checks are applied by the engines.

## Programmer model

The UI keeps the raw digit text separately from the interpreted word. Parsing validates digits against the selected base, accumulates the magnitude as a BigInt and applies the word mask once. This prevents signed hexadecimal overflow from corrupting subsequent entered digits.

Every result normalizes modulo 2ⁿ. Signed mode uses `BigInt.asIntN`; unsigned uses `BigInt.asUintN`. Nondecimal views always show the unsigned two’s-complement bit pattern. Signed division truncates toward zero and signed right shift preserves the sign bit. Unsigned operands are nonnegative, so right shift fills with zero. Invalid shifts and zero divisors produce errors.

## Graph rendering and resource bounds

The graph is a device-pixel-ratio-aware canvas. ResizeObserver keeps the drawable area aligned to its responsive container. Viewport transformations are pure functions shared with tests. Pointer events support mouse/touch panning and two-pointer pinch zoom; wheel zoom preserves the coordinate beneath the pointer.

Curve sampling combines baseline samples and midpoint refinement. Nonfinite values, detected gaps and unresolved sharp changes split segments. Up to eight functions share an 8,000-evaluation curve budget per render; refinement depth is capped. Viewport changes are coalesced with requestAnimationFrame. Grid tick generation uses a bounded offset loop so huge absolute tick indices cannot create a non-advancing loop. This bounds work but is not a hard real-time guarantee on every device.

Graph functions, colors, visibility, viewport, axes and grid settings persist locally. PNG export encodes the actual canvas and creates a local download blob.

## Matrices and complex numbers

Complex results are `{ re, im }` binary64 pairs. Elementary functions use radians and principal branches. Selected scaled algorithms reduce avoidable intermediate overflow in multiplication, division, logarithms and square roots.

Matrices are validated real rectangular arrays with 1–4 rows and columns. Add/subtract require equal shapes; multiplication checks compatible dimensions; determinant/inverse require a square matrix. Solving AX=B supports one or several right-hand sides. Scaled partial pivoting rejects singular or insufficiently reliable systems. Inputs are copied before elimination so operations do not mutate user matrices.

## Persistence and errors

Data is JSON in localStorage under `cp.*` keys. Core groups include `cp.hist`, `cp.mem`, `cp.ans`, `cp.draft`, `cp.angle`, `cp.sci`; `cp.prog.prefs` and `cp.prog.history`; `cp.graph.*`; `cp.units.selection`; `cp.eng.*`; and mode/theme/accent preferences.

Scientific and programmer histories retain at most 500 entries each. Programmer BigInt values are serialized as decimal/hexadecimal strings. Scientific entries retain display text plus a numeric round-trip string for result reuse. Storage reads handle invalid JSON, oversized values and schema mismatches; mode components apply additional field validation. Storage write failure leaves the current React state usable and emits a visible notice.

This is same-origin device/profile storage, not encrypted storage or an account database. It does not provide cross-tab synchronization, cloud backup or unlimited retention. Browser data eviction can remove it.

## PWA and deployment

The PWA plugin generates a web manifest and Workbox service worker at build time. JavaScript, CSS, HTML, icons and the manifest are precached. Build base, scope and start URL are relative, supporting a static-host subdirectory. The application registers the worker explicitly through the PWA virtual module. A new waiting worker is surfaced as an update prompt; applying it reloads the application while preserving persisted history/preferences.

Serve the complete `dist/` directory with HTTPS in deployment. Localhost is a secure-context exception for local development/testing. Browser installation is progressive enhancement: the calculator remains usable in a normal tab when no native install prompt exists.

## Standalone desktop architecture

The macOS desktop build embeds the generated site and a pinned Electron runtime. The renderer loads assets from the private secure `calc-pro://app/` origin, with decoded paths confined to the bundled `dist/` directory. Only expected local requests are accepted. The renderer enables sandboxing, context isolation and web security; Node integration is disabled. There is no preload/IPC bridge exposing filesystem or Node APIs to calculator expressions.

The main process provides native menus and limits permissions, navigation, new windows, webviews, remote requests and downloads. Graph export is restricted to a local PNG save flow. Local history/preferences use Electron’s application profile and remain independent from browser storage. Desktop updates replace the bundle manually; startup clears obsolete service-worker/cache assets while preserving history/preferences so the new local build is authoritative.

The packaging script stages compiled assets, desktop entry files/icons and minimal metadata, rather than development dependencies or source archives. The macOS bundle is ad hoc signed for integrity and not Apple-notarized. `test:desktop` launches the packaged executable itself, rather than treating Electron source or packaging success as runtime evidence. Physical installation and other native platforms remain separate gates. See `DESKTOP.md` for current status and security details.

## Security and dependency policy

The production HTML sets a self-origin content security policy, forbids dynamic script evaluation and object content, and permits inline styles for React theme/function-color values. All calculations and assets are local; there are no remote analytics, account tokens, embedded secrets or currency services.

Install with `npm ci` from the release lockfile. Development and test tooling also belong in the security audit. `npm audit` describes published advisories at the time it runs; a zero-advisory result is not a proof that no future issue exists. The Vite preview server is a local validation server, not a public production server.

## Validation layers

Unit suites verify independent numerical results, domain/range handling, parser rejection, bit masks, conversion pairs, matrix residuals and graph geometry/sampling bounds. Browser tests exercise actual inputs/buttons, navigation, persistence, canvas output, clipboard behavior, responsive dimensions, theme controls and offline production reload. Physical operating-system installation and real-device behavior remain a separate acceptance layer; browser-engine emulation cannot replace them.

## Latest dependency-audit scope

The captured production-only audit reports zero advisories. The captured full developer/tool dependency tree reports four low-severity advisories propagated through Workbox and deepmerge. The audit’s suggested downgrade to a much older PWA plugin is not a safe automatic upgrade path. Keep this limitation visible, refresh the audit for the final lockfile, and do not describe the whole dependency tree as advisory-free. Electron runtime/OS behavior also requires its own release maintenance beyond npm’s production-only scope.
