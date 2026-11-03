import { describe, expect, it } from 'vitest'
import { compileFn } from './calc'
import { HOME, gridStep, gridTicks, panViewport, sampleCurve, sampleFunctions, screenPoint, worldPoint, zoomViewport } from './graph'
const size = { w: 600, h: 400 }
describe('graph geometry', () => {
  it('maps fractional negative coordinates without losing them', () => {
    const p = { x: -2.25, y: 1.125 }, s = screenPoint(p, HOME, size)
    expect(worldPoint(s, HOME, size)).toEqual(p)
  })
  it('pans in screen pixels and zooms around the pointer', () => {
    expect(panViewport(HOME, 100, -50)).toEqual({ cx: -2, cy: -1, s: 50 })
    const anchor = { x: 450, y: 120 }, original = worldPoint(anchor, HOME, size)
    expect(worldPoint(anchor, zoomViewport(HOME, size, 2, anchor), size)).toEqual(original)
  })
  it('bounds zoom and chooses sensible adjustable grid spacing', () => {
    expect(zoomViewport(HOME, size, 1e99).s).toBe(1e6)
    expect(zoomViewport(HOME, size, 1e-99).s).toBe(1e-4)
    expect(zoomViewport(HOME, size, NaN)).toEqual(HOME)
    expect(gridStep(50, 40)).toBe(1); expect(gridStep(50, 120)).toBe(5)
  })
})
describe('real adaptive graph sampling', () => {
  it.each(['sin(x)', 'cos(x)', 'x^2', 'x^3', 'ln(x)'])('samples %s from the actual expression', expr => {
    const fn = compileFn(expr, 'RAD'), paths = sampleCurve(fn, HOME, size)
    expect(paths.length).toBeGreaterThan(0)
    for (const p of paths.flat()) expect(p.y).toBe(fn(p.x))
  })
  it('does not bridge a pole even when it is between initial samples', () => {
    const pole = 0.01337, paths = sampleCurve(x => 1 / (x - pole), HOME, size)
    expect(paths.length).toBeGreaterThanOrEqual(2)
    for (const path of paths) expect(path.some(p => p.x < pole) && path.some(p => p.x > pole)).toBe(false)
  })
  it('does not bridge tan singularities', () => {
    const paths = sampleCurve(compileFn('tan(x)', 'RAD'), HOME, size)
    for (const pole of [-3 * Math.PI / 2, -Math.PI / 2, Math.PI / 2, 3 * Math.PI / 2]) {
      for (const path of paths) expect(path.some(p => p.x < pole) && path.some(p => p.x > pole)).toBe(false)
    }
  })
  it('has subpixel midpoint chord error for smooth curves', () => {
    const paths = sampleCurve(x => x * x, HOME, size)
    for (const path of paths) for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], mid = (a.x + b.x) / 2
      expect(Math.abs((mid * mid - (a.y + b.y) / 2) * HOME.s)).toBeLessThan(0.7)
    }
  })
  it('respects a strict evaluation budget and handles invalid domains or thrown errors', () => {
    let count = 0
    sampleCurve(x => { count++; return Math.sin(x * 10000) }, HOME, size, { maxSamples: 1000 })
    expect(count).toBeLessThanOrEqual(1000)
    expect(sampleCurve(() => NaN, HOME, size, { maxSamples: 100 })).toEqual([])
    expect(sampleCurve(() => { throw new Error('bad input') }, HOME, size, { maxSamples: 100 })).toEqual([])
    const sqrtPath = sampleCurve(compileFn('sqrt(x)', 'RAD'), HOME, size).flat()
    expect(sqrtPath.length).toBeGreaterThan(0)
    expect(sqrtPath.every(p => p.x >= 0)).toBe(true)
  })
})

describe('graph resource limits', () => {
  it('finishes unsafe integer tick indices at extreme zoom without freezing', () => {
    const ticks = gridTicks(1e12 - 0.001, 1e12 + 0.001, 1e-4)
    expect(ticks.length).toBeGreaterThan(0)
    expect(ticks.length).toBeLessThanOrEqual(300)
    expect(new Set(ticks).size).toBe(ticks.length)
    expect(gridTicks(-1e12 - 0.001, -1e12 + 0.001, 1e-4).length).toBeLessThanOrEqual(300)
    expect(gridTicks(NaN, 1, 1)).toEqual([])
  })
  it('caps total real evaluations across all eight visible functions at 8000', () => {
    let evaluations = 0
    const functions = Array.from({ length: 8 }, () => (x: number) => { evaluations++; return Math.sin(x * 10000) })
    const curves = sampleFunctions(functions, HOME, size)
    expect(curves.length).toBe(8)
    expect(evaluations).toBeGreaterThan(0)
    expect(evaluations).toBeLessThanOrEqual(8000)
  })
  it('allocates sampling across the complete viewport under the shared budget', () => {
    const functions = Array.from({ length: 8 }, () => (x: number) => x)
    for (const segments of sampleFunctions(functions, HOME, { w: 1500, h: 900 })) {
      expect(segments.flat().at(0)?.x).toBe(-15)
      expect(segments.flat().at(-1)?.x).toBe(15)
    }
  })
})
