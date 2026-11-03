const { app, BrowserWindow, Menu, dialog, protocol, session } = require('electron')
const { readFile, mkdir } = require('node:fs/promises')
const { resolve, relative, isAbsolute, extname } = require('node:path')

const APP_URL = 'calc-pro://app/'
const APP_ORIGIN = 'calc-pro://app'
const ROOT = resolve(__dirname, '..', 'dist')
const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
app.setName('CALC Pro')
protocol.registerSchemesAsPrivileged([{ scheme: 'calc-pro', privileges: { standard: true, secure: true, supportFetchAPI: true, allowServiceWorkers: true, corsEnabled: true } }])
if (process.env.CALC_PRO_PROFILE) app.setPath('userData', resolve(process.env.CALC_PRO_PROFILE))
const ownPage = url => { try { const u = new URL(url); return u.protocol === 'calc-pro:' && u.hostname === 'app' && !u.username && !u.password && !u.port } catch { return false } }
let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'CALC Pro', width: 1320, height: 920, minWidth: 380, minHeight: 600,
    backgroundColor: '#0c1018', show: false, autoHideMenuBar: false,
    icon: resolve(ROOT, 'icons', 'icon-512.png'),
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, webSecurity: true, allowRunningInsecureContent: false, navigateOnDragDrop: false, devTools: !app.isPackaged },
  })
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  mainWindow.webContents.on('will-navigate', (event, url) => { if (!ownPage(url) || !['/', '/index.html'].includes(new URL(url).pathname)) event.preventDefault() })
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault())
  mainWindow.webContents.on('render-process-gone', async (_event, details) => {
    if (details.reason === 'clean-exit') return
    const result = await dialog.showMessageBox(mainWindow, { type: 'error', title: 'CALC Pro', message: 'The calculator window stopped unexpectedly.', detail: 'Saved history remains on this device. Reload the workspace to continue.', buttons: ['Reload', 'Close'] })
    if (result.response === 0) void mainWindow.loadURL(APP_URL)
    else mainWindow.close()
  })
  mainWindow.once('ready-to-show', () => mainWindow.show())
  mainWindow.on('closed', () => { mainWindow = null })
  void mainWindow.loadURL(APP_URL)
}
function installMenus() {
  const template = []
  if (process.platform === 'darwin') template.push({ role: 'appMenu' })
  template.push({ role: 'editMenu' }, { label: 'View', submenu: [ { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' } ] }, { role: 'windowMenu' }, { label: 'Help', submenu: [{ label: 'About CALC Pro', click: () => dialog.showMessageBox({ type: 'info', title: 'CALC Pro', message: `CALC Pro ${app.getVersion()}`, detail: 'Scientific, graphing, programmer, engineering and unit calculation. All calculator assets are bundled locally. History and preferences stay on this device.' }) }] })
  if (process.platform !== 'darwin') template.unshift({ label: 'File', submenu: [{ role: 'quit' }] })
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function ready() {
  await mkdir(app.getPath('userData'), { recursive: true })
  protocol.handle('calc-pro', async request => {
    try {
      const u = new URL(request.url)
      if (!ownPage(request.url) || !['GET','HEAD'].includes(request.method)) return new Response('Forbidden', { status: 403 })
      const pathname = decodeURIComponent(u.pathname)
      if (pathname.includes('\0')) return new Response('Invalid path', { status: 400 })
      const target = resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname))
      const rel = relative(ROOT, target)
      if (!rel || rel.startsWith('..') || isAbsolute(rel)) return new Response('Forbidden', { status: 403 })
      const body = await readFile(target)
      return new Response(request.method === 'HEAD' ? null : body, { headers: { 'Content-Type': CONTENT_TYPES[extname(target)] || 'application/octet-stream', 'Content-Security-Policy': CSP, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } })
    } catch { return new Response('Not found', { status: 404 }) }
  })
  // Bundled assets are authoritative after an app update. Browser history/preferences are retained.
  await session.defaultSession.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] })
  const clipboardPermission = permission => ['clipboard-read', 'clipboard-sanitized-write'].includes(permission)
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => !!webContents && ownPage(webContents.getURL()) && (requestingOrigin === APP_ORIGIN || ownPage(requestingOrigin)) && clipboardPermission(permission))
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => callback(!!webContents && ownPage(webContents.getURL()) && clipboardPermission(permission)))
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
    callback({ cancel: !ownPage(details.url) && !details.url.startsWith('blob:calc-pro://app/') && !details.url.startsWith('data:') })
  })
  session.defaultSession.on('will-download', (event, item) => {
    const urls = item.getURLChain()
    if (!urls.every(url => url.startsWith('blob:calc-pro://app/') || url.startsWith('data:image/png')) || !item.getFilename().toLowerCase().endsWith('.png')) { event.preventDefault(); return }
    item.setSaveDialogOptions({ title: 'Export graph', defaultPath: 'CALC-Pro-graph.png', filters: [{ name: 'PNG image', extensions: ['png'] }] })
  })
  installMenus(); createWindow()
}
if (!app.requestSingleInstanceLock()) app.quit()
else {
  app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus() } })
  app.whenReady().then(ready).catch(error => { dialog.showErrorBox('CALC Pro could not start', error.message); app.quit() })
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
