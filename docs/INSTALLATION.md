# Installation, offline use and deployment

## Standalone Mac application

For the native Apple silicon application, extract `release/CALC-Pro-2.0.0-macOS-arm64.zip` and move `CALC Pro.app` into Applications. This application bundles its runtime and production interface; it does not need Node.js, npm, a terminal or a web server for ordinary use. Package existence and acceptance must be confirmed in `docs/ACCEPTANCE.md` and `evidence/desktop-package.json` / `evidence/desktop-tests.json`.

The native build has an ad hoc integrity signature and is not notarized by Apple. A downloaded/transferred app can trigger Gatekeeper; inspect the source/hash and use the operating system’s Open Anyway control only if you trust it. Do not disable Gatekeeper globally. Native Windows/Linux/Intel Mac packages and installation on a second physical Mac are unverified. Android and iOS use the PWA. Full details are in [DESKTOP.md](DESKTOP.md).

To rebuild and test the native package from source:

```bash
npm ci
npm run desktop:runtime
npm run desktop:package
npm run test:desktop
```

The native app uses its own local profile; browser/PWA history does not automatically migrate into it. Native updates are manual replacement with a newer verified application bundle.

## Local Mac development

Use Node.js 22.12+ or Node.js 24+ and npm. From Terminal:

```bash
cd "/Users/prabhuram04yahoo.com/Documents/Bhupesh/Projects/CALC-Pro"
npm ci
npm run dev
```

Open the printed Vite address, normally `http://127.0.0.1:5173`. This is the development server; use the production build below for installation/offline acceptance.

```bash
npm run build
npm run preview
```

Open `http://127.0.0.1:4173`. Keep Terminal running while serving the local build. Stop a server with Ctrl+C. The app’s normal calculations do not require internet after all production assets have been cached, but an initial installation and later software updates need access to the site.

Do not open the generated HTML using Finder or `file://`. Service workers require a secure context. Localhost/127.0.0.1 is suitable for testing on the same computer; a phone opening its own localhost does not connect to your Mac.

## Mac app installation

In Chrome, open the production site and select the address-bar installation icon, or **More → Cast, save, and share → Install page as app**. In Edge, use the install icon or its Apps menu. Menu wording can differ with browser version. The in-app **Install app** control invokes the browser’s prompt when available and otherwise displays guidance. See [Chrome installation help](https://support.google.com/chrome/answer/9658361) and [Edge app installation](https://support.microsoft.com/en-US/edge/install-manage-or-uninstall-apps-in-microsoft-edge).

Safari supports **File → Add to Dock** on macOS Sonoma 14 or later. Open the production site first, choose Add to Dock, name the application and add it. Safari web apps can have separate website data from an existing browser tab, so do not assume tab history automatically migrates into a new standalone app. See [Apple’s Mac web-app guide](https://support.apple.com/en-ie/104996).

## Windows

Open the HTTPS production site in Chrome or Edge. Use the address-bar installation icon, Chrome’s **Install page as app** command, or Edge’s **Apps → Install this site as an app**. Approve the browser’s installation dialog. Launch CALC Pro from the resulting application entry/shortcut. Exact OS-level shortcut behavior depends on the browser. No separate Windows EXE/MSI is supplied.

## Android

Open the HTTPS production site in Chrome. Use **More → Install and create shortcut → Install**, or **Add to home screen / Install app** on versions using that wording. Follow the displayed prompt. Wait for the app’s first cached load before testing offline. See [Google’s Android web-app instructions](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid).

## iPhone and iPad

Open the HTTPS production site in Safari. Tap Share (or Page Menu, then Share), select **Add to Home Screen**, keep **Open as Web App** enabled where offered, then tap Add. Launch from the Home Screen. If Add to Home Screen is absent from the share sheet, use Edit Actions to make it available. Browser/OS versions vary; Safari does not expose Chromium’s install prompt. See [Apple’s iPhone web-app guide](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios) and [WebKit’s web-app behavior notes](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/).

## Confirm offline operation

1. Load the production build while online and wait for offline setup to finish.
2. Reload once so the active service worker controls the page.
3. Disconnect the network or enable the browser’s offline network mode.
4. Reload the same application URL. Calculate `2^3^2`, plot a function, convert a unit and perform a programmer operation.
5. Reopen history/preferences to confirm the same browser profile retains them.

If a first offline visit fails, restore the connection, load the site fully and repeat. Clearing browser site data removes both cached files and saved calculations. Private-mode policies, disk pressure or OS/browser storage eviction can also remove them. Installation is not a guarantee of permanent storage.

## Software updates

When the site publishes a changed production build, the service worker can download its assets while online. CALC Pro shows an update banner when a waiting version is available. Finish any current editing, then select **Update & reload**. Saved history and preferences remain in localStorage, provided the browser has not removed site data. The update can reset unsaved transient UI state. Older caches are cleaned after the worker’s lifecycle permits it.

## Static HTTPS deployment

Build with `npm run build` and upload the complete contents of `dist/` to a static HTTPS host. Include `index.html`, generated assets, manifest, service worker and all icons. Relative build paths support serving from a subdirectory as well as an origin root; keep the generated files together. Serve HTML/worker files with an update-friendly cache policy and content-hashed assets with long-lived caching. Do not publicly expose the Vite development or preview server as the production service.

No hosting account, external publication or public deployment is performed merely by building the project. Production-host header and caching configuration should be verified on the chosen host.

## Tests and troubleshooting

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run browsers:install
npm run test:e2e
```

Playwright browser downloads and `npm ci` require internet. Browser download failures do not imply application tests passed. Use `docs/ACCEPTANCE.md` and the captured test reports to identify what actually ran.

If the port is occupied, stop the previous local server or select a free port and use that address consistently. Different ports are different site origins and therefore have separate history and caches. Clipboard permission denial leaves native text selection/copy/paste available. A storage warning means new changes persist only for the current session until browser storage becomes available.

Physical Windows/Android/iOS/iPadOS installation and standalone behavior remain unverified unless explicitly recorded in the acceptance report. Desktop engine automation and mobile viewport emulation provide useful evidence but do not certify a physical operating system.

## Development cache space

`npm run browsers:install` downloads the test browsers into the project’s `.playwright-browsers/` directory. These browser runtimes are only needed to run browser tests and are excluded from release archives. The Electron installer uses a project-local `.cache/electron/` archive cache. These development caches can be removed after verification and re-downloaded when needed; do not remove the compiled production assets from a packaged app. The previous duplicate working folder has been removed; the authoritative project remains in the requested CALC-Pro directory.
