# CALC Pro desktop application

CALC Pro ships in three forms: a browser website, an installable offline PWA, and a standalone desktop application. The desktop application bundles the production interface and Electron runtime. It does not require Node.js, a terminal, a development server, or an internet connection after installation.

## Mac installation

The release artifact `release/CALC-Pro-2.0.0-macOS-arm64.zip` contains `CALC Pro.app` for Apple silicon Macs. Extract the ZIP, then drag the application into Applications and open it. The unpacked application also lives under `release/desktop/CALC Pro-darwin-arm64/` for local use.

This build uses an **ad hoc code signature**, which verifies local bundle integrity but does not establish an Apple Developer identity. It is **not notarized**. Gatekeeper can warn when an unsigned-by-Apple/not-notarized application is downloaded or transferred to another computer. Review the supplied source and release hashes; if you trust the artifact, use the system's Open Anyway option in Privacy & Security. Do not disable Gatekeeper globally.

The supplied native artifact targets macOS arm64 only. Windows, Linux, and Intel macOS packaging can be generated from the same desktop source on their corresponding host, but no untested platform package is represented as verified. iPhone and Android use the installable PWA; this release does not claim App Store or Play Store native packages.

## Development and packaging

Use a supported Node.js release (see the project package.json), then run these commands from the project root:

```sh
npm ci
npm run desktop:runtime
npm run build
npm run desktop:dev
```

To produce a desktop package and execute the packaged application tests:

```sh
npm run desktop:package
npm run test:desktop
```

`desktop:runtime` installs the version pinned in package-lock.json into project-local node_modules. If the regular Electron installer cannot download the runtime, it downloads the official GitHub release using curl and checks its SHA256 against the checksum included in the pinned Electron package before extraction. Downloaded runtime archives remain in `.cache/electron/`; this cache can be deleted after packaging to recover space.

The packaging script stages only the compiled `dist/` assets, the small desktop entry point, icons, and minimal application metadata. It does not ship the development node_modules directory, test browser runtimes, or the original source ZIP. The macOS output is ad hoc signed, verified with `codesign --verify --deep --strict`, and archived using ditto so native bundle permissions are preserved.

## Desktop behavior

- All five modes run from bundled local files, including graphing, complex arithmetic, matrix calculations, unit conversion and exact programmer arithmetic.
- Scientific and programmer histories, memory and preferences persist in Electron's local application profile. Website/PWA and desktop profiles are intentionally independent.
- Native menus provide standard editing, copy/paste, zoom, fullscreen, window management and application controls.
- Graph PNG export uses the normal native save flow.
- The in-app Desktop app control explains that the application is already installed.
- Updates are manual: replace the application with a newer desktop release. There is no unconfigured remote updater. At startup, stale service workers and cache storage are cleared while local history and preferences are retained, so the new bundled interface becomes authoritative.

## Security and privacy

The desktop main process serves only files inside the bundled dist directory over the private `calc-pro://app/` protocol. Paths are decoded and confined to the bundle; unsupported methods, hosts and traversal paths are rejected. The protocol is registered as a standard secure origin so relative assets, local storage, canvas and the clipboard work normally.

The renderer uses `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false` and web security. There is no preload or IPC bridge exposing Node.js or filesystem APIs. Remote requests, new windows, webviews and navigation outside the local app are blocked. Permissions are denied except local-origin clipboard access used by explicit calculator copy/paste controls. Downloads are restricted to local PNG graph exports. The production content security policy applies to the desktop interface.

No calculation, history, clipboard content or user preference is sent to a remote service. Application state normally lives in the operating system's CALC Pro user-data directory. Automated desktop verification uses a temporary profile under evidence and deletes it after the run, so it does not access or change the user's ordinary calculator profile.

## Verification evidence

Actual packaged-application checks write `evidence/desktop-tests.json`, and packaging metadata is written to `evidence/desktop-package.json`. Screenshots and a real exported PNG are saved under evidence. The test launches the `.app` executable itself, exercises every calculator mode, checks the sandbox/Node isolation settings and native menus, verifies clipboard and graph export, and closes/relaunches the app to verify saved state.

A package is not considered verified merely because packaging succeeds. Consult the final acceptance report and evidence for the latest executed status. Physical installation on another Mac, Apple Developer signing/notarization, store distribution and non-macOS native builds are separate unverified release steps.

References: [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security), [custom protocol API](https://www.electronjs.org/docs/latest/api/protocol), and [Electron Packager options](https://electron.github.io/packager/main/interfaces/Options.html).
