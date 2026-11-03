import { Component, useEffect, useState, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Calculator } from './Calculator'
import { Graph } from './Graph'
import { Programmer } from './Programmer'
import { Units } from './Units'
import { Engineering } from './Engineering'
import { Icon } from './Icon'
import { useStored } from './useStored'
import { NOTICE_EVENT } from './storage'

const MODES = [
  { name: 'Scientific', icon: 'calculator', title: 'A little more possibility.', subtitle: 'From everyday arithmetic to your next big idea.', component: Calculator },
  { name: 'Graphing', icon: 'graph', title: 'See the bigger picture.', subtitle: 'Explore functions, find patterns, and follow your curiosity.', component: Graph },
  { name: 'Programmer', icon: 'code', title: 'Every bit, accounted for.', subtitle: 'Exact integers. Clear representations. Complete control.', component: Programmer },
  { name: 'Converter', icon: 'units', title: 'A change of perspective.', subtitle: 'Thirteen categories. Reliable conversions. No guesswork.', component: Units },
  { name: 'Engineering', icon: 'engineering', title: 'Solve beyond the ordinary.', subtitle: 'Complex numbers and matrices, in one focused workspace.', component: Engineering },
] as const

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <section className="panel"><h2>Let’s get you back to work.</h2><p>A workspace could not be displayed. Your saved calculations are still stored on this device.</p><button onClick={() => location.reload()}>Reload application</button></section> : this.props.children
  }
}

export function App() {
  const desktop = location.protocol === 'calc-pro:'
  const [mode, setMode] = useStored('cp.mode', 'Scientific', (v): v is string => typeof v === 'string' && MODES.some(m => m.name === v))
  const [theme, setTheme] = useStored('cp.theme', 'dark', (v): v is string => v === 'light' || v === 'dark')
  const [accent, setAccent] = useStored('cp.accent', 'blue', (v): v is string => ['blue', 'cyan', 'violet', 'green'].includes(String(v)))
  const [dialog, setDialog] = useState<'settings' | 'help' | 'install' | null>(null)
  const [notice, setNotice] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  const [install, setInstall] = useState<InstallEvent | null>(null)
  const { offlineReady: [ready], needRefresh: [update], updateServiceWorker } = useRegisterSW({ onRegisterError: () => setNotice('Offline setup is unavailable. Use HTTPS or localhost to enable it.') })
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.dataset.accent = accent }, [theme, accent])
  useEffect(() => {
    const show = (e: Event) => setNotice(String((e as CustomEvent).detail))
    const connectivity = () => setOnline(navigator.onLine)
    const capture = (e: Event) => { e.preventDefault(); setInstall(e as InstallEvent) }
    window.addEventListener(NOTICE_EVENT, show)
    window.addEventListener('online', connectivity); window.addEventListener('offline', connectivity)
    window.addEventListener('beforeinstallprompt', capture)
    return () => { window.removeEventListener(NOTICE_EVENT, show); window.removeEventListener('online', connectivity); window.removeEventListener('offline', connectivity); window.removeEventListener('beforeinstallprompt', capture) }
  }, [])
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(''), 6500); return () => clearTimeout(id) }, [notice])
  useEffect(() => {
    if (!dialog) return
    const previous = document.activeElement as HTMLElement | null
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setDialog(null) }
      if (event.key === 'Tab') {
        const nodes = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"] button:not(:disabled), [role="dialog"] select, [role="dialog"] input, [role="dialog"] a[href]'))
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    window.addEventListener('keydown', close)
    return () => { window.removeEventListener('keydown', close); previous?.focus() }
  }, [dialog])
  const current = MODES.find(m => m.name === mode) || MODES[0]
  const Page = current.component
  const installApp = async () => { if (install) { await install.prompt(); await install.userChoice; setInstall(null) } else setDialog('install') }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">Skip to calculator</a>
      <aside className="sidebar" aria-label="Application navigation">
        <a className="brand" href="./" aria-label="CALC Pro home"><span className="brand-mark"><Icon name="calculator" size={26} /></span><span>CALC<span className="brand-pro">PRO</span><small>PRECISION, REIMAGINED</small></span></a>
        <div className="nav-caption">YOUR WORKSPACE</div>
        <nav aria-label="Calculator modes">{MODES.map(m => <button key={m.name} aria-label={m.name} aria-current={mode === m.name ? 'page' : undefined} className={mode === m.name ? 'active' : ''} onClick={() => setMode(m.name)}><Icon name={m.icon} /><span>{m.name}</span>{mode === m.name && <span className="nav-dot" />}</button>)}</nav>
        <div className="sidebar-note"><span className="orbit-symbol">∑</span><p>Room for<br /><strong>brighter thinking.</strong></p><small>Built for the way you solve.</small></div>
        <div className="sidebar-bottom"><button onClick={() => setDialog('settings')}><Icon name="settings" />Appearance</button><button onClick={() => setDialog('help')}><Icon name="help" />Quick guide</button><button onClick={() => void installApp()}><Icon name="download" />{desktop ? 'Desktop app' : 'Install app'}</button><div className="local-status"><i />Private by design<span>Everything stays on this device</span></div></div>
      </aside>
      <div className="workspace-shell">
        <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>{mode}</b></div><div className="topbar-status"><span className="status-dot" />{desktop ? 'Desktop · bundled offline' : online ? ready ? 'Offline ready' : 'Local workspace' : 'Working offline'}<span className="version">v2.0</span></div></header>
        <main id="workspace" tabIndex={-1}>
          <div className="page-intro"><div><div className="eyebrow">{mode.toUpperCase()} WORKSPACE</div><h1>{current.title}</h1><p>{current.subtitle}</p></div><span className="intro-badge"><Icon name={current.icon} size={25} /></span></div>
          {update && <div className="update-banner" role="status">A new version is ready. Your saved history will be preserved.<button onClick={() => void updateServiceWorker(true)}>Update & reload</button></div>}
          <ErrorBoundary key={mode}><Page /></ErrorBoundary>
          <footer className="workspace-footer"><span><Icon name="check" size={14} /> Made for focus. Built for precision.</span><span>Local calculations · No account needed</span></footer>
        </main>
      </div>
      {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification">×</button></div>}
      {dialog && <div className="modal-backdrop" onClick={() => setDialog(null)}><section className="modal panel" role="dialog" aria-modal="true" aria-label={dialog === 'settings' ? 'Appearance' : dialog === 'help' ? 'Quick guide' : 'Install CALC Pro'} onClick={e => e.stopPropagation()}><div className="section-heading"><h2>{dialog === 'settings' ? 'Make it yours.' : dialog === 'help' ? 'Your quick guide.' : desktop ? 'CALC Pro is installed.' : 'CALC Pro, always at hand.'}</h2><button autoFocus onClick={() => setDialog(null)} aria-label="Close dialog">×</button></div>
        {dialog === 'settings' ? <><label>Theme<select aria-label="Theme" value={theme} onChange={e => setTheme(e.target.value)}><option value="dark">Midnight</option><option value="light">Daylight</option></select></label><div><p>Accent color</p><div className="bar">{['blue', 'cyan', 'violet', 'green'].map(a => <button key={a} className={`accent-swatch ${a}`} aria-pressed={accent === a} onClick={() => setAccent(a)}>{a}</button>)}</div></div><p className="mu">Your choices are saved on this device.</p></> : dialog === 'help' ? <div className="guide"><p><b>Scientific:</b> type an expression or use the keypad. Enter or = calculates, Esc clears, and Ctrl/⌘ Z undoes. Native keyboard editing, selection, copy and paste are supported.</p><p><b>Functions:</b> log(x) is base 10; ln(x) is natural; logbase(x,b) and nthRoot(x,n) take two arguments. Powers associate right: 2^3^2 = 512. Missing closing parentheses are completed automatically.</p><p><b>Percent:</b> 50% = 0.5. With addition or subtraction the right-hand percent is relative to the left value: 200+10% = 220. Multiplication uses fractions: 200×10% = 20.</p><p><b>Precision:</b> scientific and engineering modes use IEEE 754 double precision, formatted to 12 significant digits. Reusing history results preserves up to 17 digits. Very small results remain in scientific notation; values below the representable range may underflow to zero.</p><p><b>Graphing:</b> uses radians. Drag to pan, wheel or pinch to zoom. Focus the canvas for arrow keys, +/−, and 0 to reset. Domain gaps and poles break curves; finite sampling cannot resolve every rapid oscillation.</p><p><b>Programmer:</b> integer arithmetic wraps modulo 2ⁿ. Signed mode reads two’s complement; unsigned right shift fills with zeros. Division truncates toward zero.</p><p><b>Limits:</b> expressions are bounded, factorials accept integers 0–170, and matrices are limited to 4×4. Everything runs locally. Clearing browser data removes saved calculations.</p></div> : <div className="guide">{desktop ? <p>You’re using the standalone desktop application. Every calculator mode is bundled and available offline immediately. No browser or development server is required. Move CALC Pro.app into Applications to keep it handy.</p> : <p>Open CALC Pro over HTTPS, or run the included local server. Wait for the first load to finish before going offline.</p>}<p><b>Mac:</b> Chrome or Edge → address bar Install icon. Safari on macOS Sonoma or later → File → Add to Dock.</p><p><b>Windows:</b> Chrome or Edge → address bar Install icon or browser menu → Install app.</p><p><b>Android:</b> Chrome menu → Install and create shortcut → Install, or Add to home screen on older versions.</p><p><b>iPhone / iPad:</b> Safari → Share → Add to Home Screen → Open as Web App where offered → Add.</p><p className="mu">Installation prompts vary by browser. Localhost is available on this computer only; use an HTTPS deployment to install on a phone.</p></div>}
      </section></div>}
    </div>
  )
}
