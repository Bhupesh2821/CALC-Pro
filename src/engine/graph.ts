/** Bounded, canvas-independent graph geometry and adaptive curve sampling. */
export type Viewport = { cx: number; cy: number; s: number }
export type GraphSize = { w: number; h: number }
export type Point = { x: number; y: number }
export const HOME: Viewport = { cx: 0, cy: 0, s: 50 }
export const clampScale = (s: number) => Math.min(1e6, Math.max(1e-4, s))
const clampCenter = (n: number) => Math.min(1e12, Math.max(-1e12, n))
export const screenPoint = (p: Point, v: Viewport, size: GraphSize): Point => ({ x: size.w / 2 + (p.x - v.cx) * v.s, y: size.h / 2 - (p.y - v.cy) * v.s })
export const worldPoint = (p: Point, v: Viewport, size: GraphSize): Point => ({ x: (p.x - size.w / 2) / v.s + v.cx, y: (size.h / 2 - p.y) / v.s + v.cy })
export function panViewport(v: Viewport, dx: number, dy: number): Viewport {
  return { ...v, cx: clampCenter(v.cx - dx / v.s), cy: clampCenter(v.cy + dy / v.s) }
}
/** Keep the coordinate under a chosen screen point fixed while zooming. */
export function zoomViewport(v: Viewport, size: GraphSize, factor: number, anchor: Point = { x: size.w / 2, y: size.h / 2 }): Viewport {
  if (!Number.isFinite(factor) || factor <= 0) return v
  const p = worldPoint(anchor, v, size), s = clampScale(v.s * factor)
  return { s, cx: clampCenter(p.x - (anchor.x - size.w / 2) / s), cy: clampCenter(p.y + (anchor.y - size.h / 2) / s) }
}
export function gridStep(scale: number, density = 80) {
  const raw = density / scale, p = 10 ** Math.floor(Math.log10(raw))
  return ([1, 2, 5, 10].map(m => m * p).find(step => step >= raw) ?? p * 10)
}
/** Offset-based iteration remains bounded even when tick indices exceed 2^53. */
export function gridTicks(min: number, max: number, step: number, limit = 300): number[] {
  if (![min, max, step].every(Number.isFinite) || step <= 0 || max < min) return []
  const start = Math.ceil(min / step), end = Math.floor(max / step), values: number[] = []
  for (let offset = 0; offset < Math.min(300, Math.max(0, Math.trunc(limit))); offset++) {
    const index = start + offset
    if (index > end) break
    const value = index * step
    if (Number.isFinite(value) && value >= min && value <= max && value !== values.at(-1)) values.push(value)
  }
  return values
}
export type SampleOptions = { maxSamples?: number; tolerance?: number; maxDepth?: number }
/**
 * At most maxSamples real evaluations; approximately 2px baseline spacing plus
 * midpoint subdivision to a 0.65px chord error. Gaps and unresolved sharp
 * changes are split instead of drawing false lines across poles. This is a
 * numerical visualization, not symbolic discontinuity or root analysis.
 */
export function sampleCurve(f: (x: number) => number, v: Viewport, size: GraphSize, options: SampleOptions = {}): Point[][] {
  const maxSamples = Math.min(20000, Math.max(20, options.maxSamples ?? 12000))
  const tolerance = options.tolerance ?? 0.65, maxDepth = Math.min(10, options.maxDepth ?? 8)
  const segments: Point[][] = []
  let segment: Point[] = [], count = 0
  const finish = () => { if (segment.length > 1) segments.push(segment); segment = [] }
  const xAt = (px: number) => v.cx + (px - size.w / 2) / v.s
  const evaluate = (x: number): Point | null => {
    if (++count > maxSamples) return null
    try { const y = f(x); return Number.isFinite(y) ? { x, y } : null } catch { return null }
  }
  const append = (p: Point) => {
    const last = segment.at(-1)
    if (!last || last.x !== p.x) segment.push(p)
  }
  const connect = (a: Point | null, b: Point | null, ax: number, bx: number, depth: number) => {
    if (count >= maxSamples) { finish(); return }
    const mx = ax + (bx - ax) / 2, m = evaluate(mx)
    if (!a && !b && !m) { finish(); return }
    if (!a || !b || !m) {
      if (depth < maxDepth && bx - ax > 1 / v.s / 256) {
        connect(a, m, ax, mx, depth + 1); finish(); connect(m, b, mx, bx, depth + 1)
      } else finish()
      return
    }
    const ay = (a.y - v.cy) * v.s, by = (b.y - v.cy) * v.s, my = (m.y - v.cy) * v.s
    const error = Math.abs(my - (ay + by) / 2)
    // Huge off-screen values cannot contribute pixels. Split at sign changes
    // so 1/(x-a) and tan(x) never acquire a bridge across their asymptotes.
    const offscreen = size.h * 2
    if (Math.abs(ay) > offscreen && Math.abs(by) > offscreen && Math.abs(my) > offscreen && Math.sign(ay) === Math.sign(by) && Math.sign(ay) === Math.sign(my)) { finish(); return }
    if (error > tolerance || Math.abs(by - ay) > size.h * 1.5) {
      if (depth < maxDepth) { connect(a, m, ax, mx, depth + 1); connect(m, b, mx, bx, depth + 1) }
      else finish()
      return
    }
    append(a); append(m); append(b)
  }
  const stepPx = Math.max(2, size.w / 1500, size.w * 4 / Math.max(16, maxSamples - 4))
  let ax = xAt(0), a = evaluate(ax)
  for (let px = stepPx; px <= size.w + stepPx && count < maxSamples; px += stepPx) {
    const bx = xAt(Math.min(size.w, px)), b = evaluate(bx)
    connect(a, b, ax, bx, 0)
    a = b; ax = bx
    if (px >= size.w) break
  }
  finish()
  return segments
}

/** One shared bounded evaluation budget for the complete visible graph. */
export function sampleFunctions(functions: readonly (((x: number) => number) | null)[], view: Viewport, size: GraphSize): Point[][][] {
  const visible = functions.slice(0, 8).filter(Boolean).length
  const budget = Math.floor(8000 / Math.max(1, visible))
  return functions.map((fn, i) => fn && i < 8 ? sampleCurve(fn, view, size, { maxSamples: budget, maxDepth: 7 }) : [])
}
