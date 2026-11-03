import { describe, it, expect } from 'vitest'
import { calculate, fmt, compileFn } from './calc'
import { apply, not, show, wrap } from './programmer'
import { convert, UNITS } from './units'

const c = (e: string, a: 'DEG' | 'RAD' = 'DEG') => fmt(calculate(e, a))

describe('calculator engine', () => {
  it.each([
    ['2+3*4', '14'], ['(2+3)*4', '20'], ['2^3^2', '512'], ['-2^2', '-4'], ['0.1+0.2', '0.3'], ['10/4', '2.5'],
    ['5!', '120'], ['0!', '1'], ['50%', '0.5'], ['200+10%', '220'], ['200-10%', '180'], ['200*10%', '20'],
    ['sqrt(144)', '12'], ['√(81)', '9'], ['cbrt(27)', '3'], ['log(1000)', '3'], ['ln(e)', '1'], ['2(3+4)', '14'],
    ['(2+3', '5'], ['2×3÷6−1', '0'], ['2π', '6.28318530718'], ['10 mod 3', '1'], ['abs(-4)', '4'], ['2^10', '1024'],
  ])('%s = %s', (e, r) => expect(c(e)).toBe(r))

  it('DEG mode trig and inverse trig', () => {
    expect(c('sin(30)')).toBe('0.5'); expect(c('cos(60)')).toBe('0.5'); expect(c('tan(45)')).toBe('1')
    expect(c('sin(180)')).toBe('0'); expect(c('asin(0.5)')).toBe('30'); expect(c('atan(1)')).toBe('45'); expect(c('acos(0)')).toBe('90')
  })
  it('RAD mode trig', () => {
    expect(c('sin(pi/2)', 'RAD')).toBe('1'); expect(c('cos(pi)', 'RAD')).toBe('-1'); expect(c('atan(1)', 'RAD')).toBe('0.785398163397')
  })
  it('Ans and memory variables', () => {
    expect(fmt(calculate('Ans*2+M', 'DEG', 5, 1))).toBe('11')
  })
  it.each([
    ['sqrt(-1)', 'Domain error'], ['0/0', 'Cannot divide by zero'], ['log(0)', 'Domain error'], ['asin(2)', 'Domain error'], ['tan(90)', 'Domain error'],
    ['1/0', 'Cannot divide by zero'], ['200!', 'Overflow'], ['10^400', 'Overflow'], ['2+*', 'Syntax error'], ['2)', 'Unbalanced parentheses'], ['', 'Enter an expression'],
  ])('error: %s → %s', (e, msg) => expect(() => calculate(e)).toThrow(msg))

  it('never uses eval and rejects code-like input', () => {
    expect(() => calculate('process.exit()')).toThrow()
    expect(() => calculate('import("fs")')).toThrow()
  })
  it('compileFn evaluates f(x)', () => {
    const f = compileFn('x^2+1', 'RAD'); expect(f(3)).toBe(10); expect(Number.isNaN(compileFn('sqrt(x)', 'RAD')(-1))).toBe(true)
  })
})

describe('programmer engine', () => {
  it('wraps to word size', () => { expect(wrap(200n, 8)).toBe(-56n); expect(apply('+', 127n, 1n, 8)).toBe(-128n) })
  it('bitwise ops', () => {
    expect(apply('AND', 12n, 10n, 8)).toBe(8n); expect(apply('OR', 12n, 10n, 8)).toBe(14n); expect(apply('XOR', 12n, 10n, 8)).toBe(6n)
    expect(apply('NAND', 15n, 15n, 8)).toBe(-16n); expect(apply('NOR', 0n, 0n, 8)).toBe(-1n); expect(not(0n, 8)).toBe(-1n)
  })
  it('shifts', () => {
    expect(apply('<<', 1n, 31n, 32)).toBe(-2147483648n); expect(apply('>>', -8n, 1n, 32)).toBe(-4n)
    expect(() => apply('<<', 1n, 32n, 32)).toThrow('Shift out of range')
  })
  it('arithmetic and errors', () => {
    expect(apply('÷', 7n, 2n, 32)).toBe(3n); expect(apply('MOD', 7n, 4n, 32)).toBe(3n); expect(() => apply('÷', 1n, 0n, 32)).toThrow('Cannot divide by zero')
  })
  it('base display', () => {
    expect(show(255n, 16, 2)).toBe('11111111'); expect(show(-1n, 8, 16)).toBe('FF'); expect(show(-1n, 8, 10)).toBe('-1'); expect(show(8n, 8, 8)).toBe('10')
    expect(show(0xdeadbeefn, 64, 16)).toBe('DEADBEEF')
  })
  it('64-bit precision is exact', () => { expect(apply('+', 9007199254740993n, 0n, 64)).toBe(9007199254740993n) })
})

describe('unit conversion', () => {
  it('converts common units', () => {
    expect(convert('Length', 1, 'mi', 'km')).toBeCloseTo(1.609344, 9); expect(convert('Mass', 1, 'kg', 'lb')).toBeCloseTo(2.2046226, 6)
    expect(convert('Speed', 100, 'km/h', 'mph')).toBeCloseTo(62.1371, 4); expect(convert('Data', 1, 'GiB', 'MB')).toBeCloseTo(1073.741824, 6)
    expect(convert('Pressure', 1, 'atm', 'kPa')).toBeCloseTo(101.325, 6); expect(convert('Energy', 1, 'kWh', 'kJ')).toBeCloseTo(3600, 6)
  })
  it('converts temperature', () => {
    expect(convert('Temperature', 100, '°C', '°F')).toBeCloseTo(212, 9); expect(convert('Temperature', 32, '°F', '°C')).toBeCloseTo(0, 9)
    expect(convert('Temperature', 0, 'K', '°C')).toBeCloseTo(-273.15, 9)
  })
  it('round-trips every unit in every category', () => {
    for (const [cat, us] of Object.entries(UNITS)) for (const u of us) expect(convert(cat, convert(cat, 7, 'm' in {} ? u : us[0], u), u, us[0])).toBeCloseTo(7, 6)
  })
  it('rejects unknown units', () => { expect(() => convert('Length', 1, 'm', 'zz')).toThrow('Unknown unit') })
})
