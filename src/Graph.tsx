import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { compileFn, fmt } from './engine/calc'
import { HOME, gridStep, gridTicks, panViewport, sampleFunctions, screenPoint, worldPoint, zoomViewport, type GraphSize, type Point, type Viewport } from './engine/graph'
import { useStored } from './useStored'

const COLORS = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#22d3ee', '#fb923c', '#e879f9']
type FunctionEntry = { id: string; expression: string; color: string; visible: boolean }
const INITIAL: FunctionEntry[] = [
  { id: 'initial-sin', expression: 'sin(x)', color: COLORS[0], visible: true },
  { id: 'initial-square', expression: 'x^2/4-2', color: COLORS[1], visible: true },
]
const validViewport = (v: Viewport) => !!v && typeof v === 'object' && Number.isFinite(v.cx) && Math.abs(v.cx) <= 1e12 && Number.isFinite(v.cy) && Math.abs(v.cy) <= 1e12 && Number.isFinite(v.s) && v.s >= 1e-4 && v.s <= 1e6
const cleanEntries = (v: FunctionEntry[]) => Array.isArray(v) && v.length <= 8 && v.every(e => e && typeof e.id === 'string' && typeof e.expression === 'string' && e.expression.length <= 512 && typeof e.color === 'string' && /^#[\da-f]{6}$/i.test(e.color) && typeof e.visible === 'boolean')

export function Graph() {
  const [storedEntries, setEntries] = useStored<FunctionEntry[]>('cp.graph.functions', INITIAL)
  const entries = cleanEntries(storedEntries) ? storedEntries : INITIAL
  const [storedView, setView] = useStored<Viewport>('cp.graph.view', HOME)
  const v = validViewport(storedView) ? storedView : HOME
  const [grid, setGrid] = useStored('cp.graph.grid', true)
  const [axes, setAxes] = useStored('cp.graph.axes', true)
  const [density, setDensity] = useStored('cp.graph.density', 80)
  const [cur, setCur] = useState<Point | null>(null)
  const [selectedX, setSelectedX] = useState('0')
  const [size, setSize] = useState<GraphSize>({ w: 600, h: 400 })
  const [exportError, setExportError] = useState('')
  const [lightTheme, setLightTheme] = useState(() => document.documentElement.dataset.theme === 'light')
  const cv = useRef<HTMLCanvasElement>(null), box = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, Point>())
  const viewRef = useRef(v), sizeRef = useRef(size)
  sizeRef.current = size
  const pendingView = useRef<Viewport | null>(null), pendingCursor = useRef<Point | null | undefined>(undefined), frame = useRef<number | null>(null)
  useEffect(() => { viewRef.current = v }, [v])
  const scheduleFrame = useCallback(() => {
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      if (pendingView.current) { setView(pendingView.current); pendingView.current = null }
      if (pendingCursor.current !== undefined) { setCur(pendingCursor.current); pendingCursor.current = undefined }
    })
  }, [setView])
  const queueView = useCallback((next: Viewport) => { viewRef.current = next; pendingView.current = next; scheduleFrame() }, [scheduleFrame])
  const queueCursor = useCallback((next: Point | null) => { pendingCursor.current = next; scheduleFrame() }, [scheduleFrame])
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current) }, [])
  const compiled = useMemo(() => entries.map(e => {
    if (!e.expression.trim()) return { fn: null, error: '' }
    try { return { fn: compileFn(e.expression, 'RAD'), error: '' } }
    catch (error) { return { fn: null, error: error instanceof Error ? error.message : 'Invalid expression' } }
  }), [entries])
  const curves = useMemo(() => sampleFunctions(compiled.map((c, i) => entries[i].visible ? c.fn : null), v, size), [compiled, entries, v, size])
  const selectedNumber = Number(selectedX)
  const pointSyntax = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(selectedX.trim())
  const pointUnderflow = selectedNumber === 0 && /[1-9]/.test(selectedX.trim().split(/[eE]/)[0])
  const pointX = pointSyntax && Number.isFinite(selectedNumber) && !pointUnderflow ? selectedNumber : NaN

  useEffect(() => {
    const observer = new MutationObserver(() => setLightTheme(document.documentElement.dataset.theme === 'light'))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setSize({ w: Math.max(el.clientWidth, 50), h: Math.max(el.clientHeight, 50) }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => {
    const c = cv.current
    if (!c) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = c.getBoundingClientRect()
      queueView(zoomViewport(viewRef.current, sizeRef.current, e.deltaY < 0 ? 1.15 : 1 / 1.15, { x: e.clientX - rect.left, y: e.clientY - rect.top }))
    }
    c.addEventListener('wheel', onWheel, { passive: false })
    return () => c.removeEventListener('wheel', onWheel)
  }, [queueView])
  useEffect(() => {
    const c = cv.current
    if (!c) return
    const { w, h } = size, d = Math.min(window.devicePixelRatio || 1, 2)
    c.width = Math.round(w * d); c.height = Math.round(h * d)
    const g = c.getContext('2d')
    if (!g) return
    g.scale(d, d)
    const light = lightTheme
    g.fillStyle = light ? '#f7f9ff' : '#0b1220'; g.fillRect(0, 0, w, h)
    const toScreen = (p: Point) => screenPoint(p, v, size)
    const origin = toScreen({ x: 0, y: 0 })
    const step = gridStep(v.s, [40, 80, 120].includes(density) ? density : 80)
    const left = worldPoint({ x: 0, y: 0 }, v, size), right = worldPoint({ x: w, y: h }, v, size)
    g.font = '11px ui-monospace, SFMono-Regular, monospace'; g.lineWidth = 1
    const line = (x1: number, y1: number, x2: number, y2: number) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke() }
    if (grid) {
      g.strokeStyle = light ? '#dde4f0' : '#1e2a3e'; g.fillStyle = light ? '#526079' : '#8798b5'
      for (const value of gridTicks(left.x, right.x, step)) {
        const x = toScreen({ x: value, y: 0 }).x
        line(x, 0, x, h)
        if (value !== 0) g.fillText(fmt(Number(value.toPrecision(8))), x + 4, Math.min(Math.max(origin.y + 14, 14), h - 5))
      }
      for (const value of gridTicks(right.y, left.y, step)) {
        const y = toScreen({ x: 0, y: value }).y
        line(0, y, w, y)
        if (value !== 0) g.fillText(fmt(Number(value.toPrecision(8))), Math.min(Math.max(origin.x + 5, 5), w - 70), y - 5)
      }
    }
    if (axes) {
      g.strokeStyle = light ? '#8a98ad' : '#61718c'; g.lineWidth = 1.3
      if (origin.x >= 0 && origin.x <= w) line(origin.x, 0, origin.x, h)
      if (origin.y >= 0 && origin.y <= h) line(0, origin.y, w, origin.y)
    }
    curves.forEach((segments, i) => {
      g.strokeStyle = entries[i].color; g.lineWidth = 2.3
      for (const segment of segments) {
        g.beginPath()
        segment.forEach((p, j) => { const q = toScreen(p); if (j) g.lineTo(q.x, q.y); else g.moveTo(q.x, q.y) })
        g.stroke()
      }
    })
    if (cur) {
      const p = toScreen(cur)
      g.strokeStyle = '#60a5fa80'; g.lineWidth = 1; g.setLineDash([4, 4]); line(p.x, 0, p.x, h); line(0, p.y, w, p.y); g.setLineDash([])
      compiled.forEach((c, i) => {
        if (!c.fn || !entries[i].visible) return
        const y = c.fn(cur.x), sy = toScreen({ x: cur.x, y }).y
        if (Number.isFinite(sy) && sy >= 0 && sy <= h) { g.fillStyle = entries[i].color; g.beginPath(); g.arc(p.x, sy, 4.5, 0, Math.PI * 2); g.fill() }
      })
    }
  }, [compiled, curves, v, size, cur, entries, grid, axes, density, lightTheme])

  const update = (i: number, patch: Partial<FunctionEntry>) => setEntries(entries.map((e, j) => i === j ? { ...e, ...patch } : e))
  const eventPoint = (e: PointerEvent<HTMLCanvasElement>): Point => { const r = e.currentTarget.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.focus({ preventScroll: true }); e.currentTarget.setPointerCapture(e.pointerId)
    const p = eventPoint(e); pointers.current.set(e.pointerId, p); queueCursor(worldPoint(p, viewRef.current, size))
  }
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    const p = eventPoint(e), previous = [...pointers.current.values()]
    const currentView = viewRef.current
    let next = currentView
    if (pointers.current.has(e.pointerId)) {
      const old = pointers.current.get(e.pointerId)!
      pointers.current.set(e.pointerId, p)
      const current = [...pointers.current.values()]
      if (previous.length >= 2 && current.length >= 2) {
        const midpoint = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
        const a = midpoint(previous[0], previous[1]), b = midpoint(current[0], current[1])
        const distance = (ps: Point[]) => Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y)
        next = panViewport(currentView, b.x - a.x, b.y - a.y)
        if (distance(previous) > 1) next = zoomViewport(next, size, distance(current) / distance(previous), b)
      } else next = panViewport(currentView, p.x - old.x, p.y - old.y)
      queueView(next)
    }
    queueCursor(worldPoint(p, next, size))
  }
  const up = (e: PointerEvent<HTMLCanvasElement>) => { pointers.current.delete(e.pointerId); if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }
  const zoom = (factor: number) => queueView(zoomViewport(viewRef.current, size, factor))
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key === 'ArrowLeft') queueView(panViewport(viewRef.current, 40, 0))
    else if (e.key === 'ArrowRight') queueView(panViewport(viewRef.current, -40, 0))
    else if (e.key === 'ArrowUp') queueView(panViewport(viewRef.current, 0, 40))
    else if (e.key === 'ArrowDown') queueView(panViewport(viewRef.current, 0, -40))
    else if (e.key === '+' || e.key === '=') zoom(1.25)
    else if (e.key === '-') zoom(0.8)
    else if (e.key === '0' || e.key === 'Home') queueView(HOME)
    else return
    e.preventDefault()
  }
  const exportPng = () => {
    setExportError('')
    try {
      cv.current?.toBlob(blob => {
        if (!blob) { setExportError('Could not export graph. Please try again.'); return }
        const a = document.createElement('a'), url = URL.createObjectURL(blob)
        a.href = url; a.download = 'CALC-Pro-graph.png'; a.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }, 'image/png')
    } catch { setExportError('Image export is unavailable in this browser.') }
  }
  const formatY = (i: number, x: number) => {
    if (!Number.isFinite(x)) return 'Enter a finite x value within the numeric range'
    const y = compiled[i]?.fn?.(x)
    return typeof y === 'number' && Number.isFinite(y) ? fmt(y) : 'Outside real domain'
  }

  return (
    <section className="panel graph-workspace" aria-label="Graphing calculator">
      <div className="section-heading"><div><p className="eyebrow">EXPLORE IN TWO DIMENSIONS</p><h2>Graphing workspace</h2></div><span className="badge">RAD</span></div>
      <div className="graph-layout">
        <div className="graph-functions">
          {entries.map((e, i) => (
            <div className="graph-function" key={e.id}>
              <div className="fn">
                <input type="color" className="function-color" value={e.color} aria-label={`Function color ${i + 1}`} onChange={ev => update(i, { color: ev.target.value })} />
                <label className="grow"><span className="mu">f{i + 1}(x)</span><input value={e.expression} maxLength={512} aria-label={`Function expression ${i + 1}`} aria-invalid={!!compiled[i].error} placeholder="e.g. sin(x)/x" onChange={ev => update(i, { expression: ev.target.value })} /></label>
                <button aria-label={`Show function ${i + 1}`} aria-pressed={e.visible} title={e.visible ? 'Hide function' : 'Show function'} onClick={() => update(i, { visible: !e.visible })}>{e.visible ? '◉' : '○'}</button>
                <button aria-label={`Remove function ${i + 1}`} onClick={() => setEntries(entries.filter((_, j) => j !== i))}>×</button>
              </div>
              {compiled[i].error && <p className="err" role="alert">{compiled[i].error}</p>}
            </div>
          ))}
          <button className="add-function" disabled={entries.length >= 8} onClick={() => setEntries([...entries, { id: crypto.randomUUID(), expression: '', color: COLORS[entries.length % COLORS.length], visible: true }])}>+ Add function</button>
          <p className="mu">Up to 8 real functions. Trigonometry uses radians. Try sin(x), x^3, ln(x), or 1/x.</p>
          <div className="graph-point"><label>Evaluate at x<input aria-label="Evaluate at x" inputMode="decimal" value={selectedX} maxLength={40} aria-invalid={!Number.isFinite(pointX)} onChange={e => setSelectedX(e.target.value)} /></label>
            <div className="point-values" aria-live="polite">{entries.map((e, i) => e.visible && e.expression.trim() && !compiled[i].error ? <div key={e.id}><span style={{ borderLeft: `3px solid ${e.color}`, paddingLeft: 8 }}>f{i + 1}(x)</span><output aria-label={`Function ${i + 1} evaluated value`}>{formatY(i, pointX)}</output></div> : null)}</div>
          </div>
        </div>
        <div className="graph-stage">
          <div className="bar graph-toolbar">
            <button onClick={() => zoom(1.25)} aria-label="Zoom in">＋</button><button onClick={() => zoom(0.8)} aria-label="Zoom out">−</button><button onClick={() => queueView(HOME)}>Reset viewport</button><button onClick={exportPng}>Export PNG</button>
            <label className="inline-check"><input type="checkbox" checked={grid} onChange={e => setGrid(e.target.checked)} />Show grid</label>
            <label className="inline-check"><input type="checkbox" checked={axes} onChange={e => setAxes(e.target.checked)} />Show axes</label>
            <label className="grid-density">Grid density<select aria-label="Grid density" value={density} onChange={e => setDensity(Number(e.target.value))}><option value={40}>Fine</option><option value={80}>Balanced</option><option value={120}>Coarse</option></select></label>
          </div>
          <div className="gbox" ref={box}>
            <canvas ref={cv} tabIndex={0} role="img" aria-label="Function graph. Arrow keys pan, plus and minus zoom, 0 resets."
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={e => pointers.current.delete(e.pointerId)} onPointerLeave={() => { if (!pointers.current.size) queueCursor(null) }} onKeyDown={key} />
          </div>
          <div className="graph-readout" role="status" aria-live="off">{cur ? <><span>x {fmt(Number(cur.x.toPrecision(9)))}</span><span>y {fmt(Number(cur.y.toPrecision(9)))}</span>{entries.map((e, i) => e.visible && compiled[i].fn ? <span key={e.id} style={{ borderBottom: `2px solid ${e.color}` }}>f{i + 1} {formatY(i, cur.x)}</span> : null)}</> : <span>Drag to pan · Scroll or pinch to zoom · Hover or tap to inspect</span>}</div>
          <p className="mu">Center ({fmt(v.cx)}, {fmt(v.cy)}) · Scale {fmt(v.s)} px/unit. Adaptive sampling splits detected gaps; very rapid oscillations may require zooming in.</p>
          {exportError && <p className="err" role="alert">{exportError}</p>}
        </div>
      </div>
    </section>
  )
}
