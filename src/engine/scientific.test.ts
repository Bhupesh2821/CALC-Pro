import { describe, expect, it } from 'vitest'
import { calculate, compileFn, fmt, LIMITS, prepare } from './calc'

const c = (expression: string, angle: 'DEG' | 'RAD' = 'DEG') => fmt(calculate(expression, angle))
describe('scientific operations and precedence', () => {
  it.each([
    ['2+3*4', '14'], ['10-3-2', '5'], ['8/4/2', '1'], ['2^3^2', '512'], ['-2^2', '-4'], ['(-2)^2', '4'], ['2^-3', '0.125'],
    ['((-3+5)*2)^3', '64'], ['(-2)^3', '-8'], ['(-8)^(1/3)', 'Domain error'], ['2(3+4)', '14'], ['(2+3)(4-1)', '15'],
    ['2pi', '6.28318530718'], ['2π', '6.28318530718'], ['3e-5+2e-5', '0.00005'], ['.1+.2', '0.3'], ['1.+.5', '1.5'],
    ['2^3', '8'], ['sqrt(81)', '9'], ['cbrt(-8)', '-2'], ['nthRoot(-8,3)', '-2'], ['root(16,4)', '2'], ['nthRoot(16,-2)', '0.25'],
    ['0!', '1'], ['5!', '120'], ['3!!', '720'], ['reciprocal(4)', '0.25'], ['abs(-12)', '12'],
    ['7 mod 3', '1'], ['-7 mod 3', '2'], ['7 mod -3', '-2'], ['rem(-7,3)', '-1'], ['remainder(7,-3)', '1'],
    ['ln(e)', '1'], ['log(1000)', '3'], ['log10(100)', '2'], ['log(8,2)', '3'], ['logbase(81,3)', '4'], ['exp(0)', '1'],
    ['sin(30)', '0.5'], ['cos(60)', '0.5'], ['tan(45)', '1'], ['sin(180)', '0'], ['cos(90)', '0'], ['asin(.5)', '30'], ['acos(0)', '90'], ['atan(1)', '45'],
    ['sinh(0)', '0'], ['cosh(0)', '1'], ['tanh(0)', '0'], ['asinh(0)', '0'], ['acosh(1)', '0'], ['atanh(0)', '0'],
    ['50%', '0.5'], ['(20+30)%', '0.5'], ['200+10%', '220'], ['200-10%', '180'], ['200*10%', '20'], ['200/10%', '2000'], ['200+10%+10%', '242'],
    ['(2+3', '5'], ['√(81)', '9'], ['∛(27)', '3'], ['2×3÷6−1', '0'], ['min(2,-1,7)', '-1'], ['max(2,-1,7)', '7'],
  ])('%s → %s', (expression, expected) => {
    if (expected.includes('error')) expect(() => c(expression)).toThrow(expected)
    else expect(c(expression)).toBe(expected)
  })
  it('retains internal precision instead of rounding every operation', () => { expect(calculate('(1/3)*3')).toBe(1); expect(calculate('0.1+0.2')).toBeCloseTo(0.3, 15) })
  it('recalls answer and memory', () => { expect(calculate('Ans*2+M', 'DEG', 3, 4)).toBe(10) })
  it('radian quadrants, singularities and inverse functions', () => {
    expect(c('sin(pi)', 'RAD')).toBe('0'); expect(c('cos(pi/2)', 'RAD')).toBe('0'); expect(c('asin(1)', 'RAD')).toBe('1.57079632679')
    expect(() => calculate('tan(pi/2)', 'RAD')).toThrow('tangent is undefined')
  })
})
describe('precision, range and domain regressions', () => {
  it.each(['1e-20', '1e-100', '1e-300', '5e-324', '1/1e300', '10^-300'])('preserves tiny nonzero %s', expression => {
    const result = calculate(expression); expect(result).toBeGreaterThan(0); expect(fmt(result)).not.toBe('0')
  })
  it('does not zero small trig values', () => { expect(calculate('sin(1e-20)', 'RAD')).toBe(1e-20); expect(calculate('sin(1e-20)')).toBeGreaterThan(0) })
  it('formats full finite range without Infinity or NaN', () => { expect(fmt(Number.MAX_VALUE)).not.toMatch(/Infinity|NaN/); expect(fmt(Number.MIN_VALUE)).toBe('5e-324'); expect(fmt(-0)).toBe('0') })
  it.each(['1/0', '0/0', '1/(2-2)', 'reciprocal(0)', '0^-1', '5 mod 0', 'rem(5,0)'])('distinguishes zero division %s', expression => expect(() => calculate(expression)).toThrow('Cannot divide by zero'))
  it.each(['10^400', '1e308*10', 'exp(1000)', '171!', '1e309'])('reports overflow %s', expression => expect(() => calculate(expression)).toThrow('Overflow'))
  it.each(['1e-400', '1e-300/1e100', '1e-200*1e-200', '10^-400', 'exp(-1000)'])('reports underflow %s', expression => expect(() => calculate(expression)).toThrow('Underflow'))
  it.each(['sqrt(-1)', 'ln(0)', 'log(-1)', 'logbase(2,1)', 'logbase(2,-3)', '(-1)!', '1.5!', 'asin(2)', 'acos(-2)', 'acosh(0)', 'atanh(1)', 'nthroot(-4,2)', 'nthroot(4,0)', 'tan(90)', 'tan(270)', 'tan(-90)', 'sin(1e20)'])('reports domain error %s', expression => expect(() => calculate(expression)).toThrow('Domain error'))
  it('finite near-singularity values remain finite', () => expect(Number.isFinite(calculate('tan(89.9999)'))).toBe(true))
})
describe('secure bounded parser and graph compilation', () => {
  it.each(['eval(1)', 'import("fs")', 'process.exit()', 'constructor', 'x=2', 'a[0]', '1;2', '{}', 'sin.constructor', '2+*3', 'sin()', 'sin(1,2)', 'pi.foo', '2)', 'x', 'i'])('rejects %s', input => expect(() => calculate(input)).toThrow())
  it('rejects oversized and deeply nested expressions', () => {
    expect(() => calculate('1'.repeat(LIMITS.characters + 1))).toThrow('too long')
    expect(() => calculate('('.repeat(60) + '1')).toThrow('deeply nested')
    expect(() => calculate('1+'.repeat(100) + '1')).toThrow('deeply nested')
    expect(() => calculate('-'.repeat(100) + '1')).toThrow('deeply nested')
  })
  it('rejects unmatched closing parentheses', () => expect(() => prepare(')1(')).toThrow('Unbalanced'))
  it('parses graph functions once and handles invalid points', () => {
    const square = compileFn('x^2+1', 'RAD'); expect(square(-.5)).toBe(1.25)
    expect(compileFn('sin(x)', 'RAD')(Math.PI / 2)).toBe(1)
    expect(Number.isNaN(compileFn('1/x', 'RAD')(0))).toBe(true)
    expect(Number.isNaN(compileFn('ln(x)', 'RAD')(-1))).toBe(true)
    expect(() => compileFn('M+x', 'RAD')).toThrow('may use x')
  })
})


describe('additional numerical boundary regressions', () => {
  it.each(['1.2.3', '.1.2', '1 2', '1e2.3'])('rejects adjacent literals %s', expression => expect(() => calculate(expression)).toThrow('Syntax error'))
  it('continues supporting implicit products after parenthesized values', () => expect(calculate('(2+3)4')).toBe(20))
  it('retains remainders when the modulus has a very different scale', () => {
    expect(calculate('1 mod 1e308')).toBe(1)
    expect(calculate('-1 mod -1e308')).toBe(-1)
    expect(calculate('1e308 mod 3')).toBe(2)
    expect(calculate('0 mod 3')).toBe(0)
  })
  it('retains finite max-value formatting at every supported precision', () => {
    for (let precision = 1; precision <= 15; precision++) {
      expect(Number.isFinite(Number(fmt(Number.MAX_VALUE, precision)))).toBe(true)
      expect(Number.isFinite(Number(fmt(-Number.MAX_VALUE, precision)))).toBe(true)
    }
    expect(fmt(1.25, NaN)).toBe('1.25')
  })
  it('identifies nth-root underflow instead of returning zero', () => expect(() => calculate('nthRoot(1e-300,0.1)')).toThrow('Underflow'))
})
