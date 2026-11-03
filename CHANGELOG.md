# Changelog

## 2.0.0 — 2026-10-29

The supplied calculator’s React/TypeScript/Vite/PWA structure and working mode components were retained and extended. Final acceptance depends on the execution evidence in `docs/ACCEPTANCE.md`.

### Added

- Standalone macOS arm64 Electron application with bundled offline assets, sandboxed renderer, local-only protocol, native menus, project-local runtime download, ad hoc integrity signing and packaged-app verification scripts. Desktop acceptance remains separate from source/build success.

- Engineering workspace with complex arithmetic, principal elementary functions and validated real matrix operations up to 4×4.
- Signed/unsigned programmer interpretation, exact per-base parsing, interactive bit toggles and persistent programmer history displaying decimal and hexadecimal results.
- Scientific hyperbolic functions, cube/nth-root/arbitrary-base-log/exponential controls, sign switching, clear-entry, undo, expression clipboard controls and fuller keyboard support.
- Timestamped scientific history with individual deletion, favorites, full-precision result reuse and clear-all.
- Angle and frequency conversion categories, unit-name search, precision controls and explicit absolute-zero validation.
- Graph color/visibility controls, selected-point evaluation, adjustable grid/axes, touch pinch zoom and PNG export.
- Dark/light themes, selectable accents, responsive navigation, focus styles, local-storage feedback and reduced-motion handling.
- PNG app icons, maskable icon, Apple touch icon, scoped offline cache and user-controlled update prompt.
- Expanded unit/regression suites, browser E2E coverage and release traceability documentation.

### Corrected

- Tiny finite scientific results and tiny trigonometric values were incorrectly snapped to zero.
- Computed zero denominators could be mislabeled as overflow.
- Signed hexadecimal digit accumulation fed wrapped negative values back into subsequent digits.
- Unrestricted mathematical expression evaluation admitted capabilities beyond calculator expressions; it was replaced with a bounded parser and interpreter.
- Adjacent decimal literals could be interpreted as implicit multiplication rather than invalid input.
- Extreme-value display rounding could turn finite values into `Infinity`.
- Very different modulus scales could lose a valid remainder.
- Conversion text underflow could silently become zero, and tiny negative Kelvin values could evade physical-domain validation.
- Complex division/logarithm/root and determinant scaling now avoid selected unnecessary intermediate range failures.
- Extreme graph tick indices could fail to advance; bounded offset iteration prevents that loop from freezing.
- Invalid/corrupted saved mode data and failed clipboard/storage operations now receive controlled recovery or feedback.

### Maintenance and security

- Removed the old broad math runtime from application dependencies after introducing the dedicated deterministic engine.
- Refreshed build/test tooling to address published advisories; the final lockfile and final audit result govern the actual release versions/status.
- Added a production content security policy and kept application assets/calculations local.
- Bound expression length/depth/tokens, programmer input, graph function count/sampling and matrix size.

### Validation status

Latest captured Vitest report: 407 tests passed, 0 failed. TypeScript/lint/production build passed in the release run. Full browser-matrix and packaged-desktop checks are pending final execution. Production dependencies have 0 reported advisories; the full build/test tool tree has 4 low-severity advisories inherited through Workbox/deepmerge, with no safe patched upstream release established. See `docs/ACCEPTANCE.md` for final evidence, package results and physical-platform gaps. No 100% completion or physical-device certification is inferred from these partial gates.

## Final release corrections — 2026-10-29

- Fixed a real fast-typing cursor race by applying keypad selections during the React layout commit, before subsequent input.
- Preserved accessible mode names when tablet navigation hides text labels.
- Made complex integer powers exact through bounded exponentiation by squaring, retaining genuine tiny components.
- Verified the secure macOS arm64 packaged application, including actual native PNG export, clipboard, menus and full relaunch persistence.
- Added standalone subdirectory-hosting/offline validation and real dark/light/mobile/graph visual evidence.
- Pinned the actual verified dependency versions. Remaining low-severity development-only Workbox/deepmerge advisories are documented separately from the zero-advisory production dependency tree.
