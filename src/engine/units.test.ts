import { describe, expect, it } from 'vitest'
import { convert, convertText, UNITS, UNIT_NAMES, parseConversionInput } from './units'

describe('unit conversion coverage and numerical behavior', () => {
  it('includes every required category', () => expect(Object.keys(UNITS).sort()).toEqual(['Length', 'Mass', 'Temperature', 'Area', 'Volume', 'Speed', 'Time', 'Pressure', 'Energy', 'Power', 'Data', 'Angle', 'Frequency'].sort()))
  it.each([
    ['Length', 1, 'mi', 'km', 1.609344], ['Mass', 1, 'lb', 'kg', 0.45359237], ['Temperature', 100, '°C', '°F', 212],
    ['Area', 1, 'acre', 'm²', 4046.8564224], ['Volume', 1, 'gal (US)', 'L', 3.785411784], ['Volume', 1, 'gal (UK)', 'L', 4.54609],
    ['Speed', 1, 'mph', 'm/s', 0.44704], ['Time', 1, 'd', 's', 86400], ['Pressure', 1, 'atm', 'Pa', 101325],
    ['Energy', 1, 'kWh', 'kJ', 3600], ['Power', 1, 'hp', 'W', 745.69987158227], ['Data', 1, 'GiB', 'MB', 1073.741824],
    ['Data', 8, 'bit', 'B', 1], ['Angle', 180, '°', 'rad', Math.PI], ['Frequency', 60, 'rpm', 'Hz', 1],
  ] as const)('%s: %s %s to %s', (category, value, from, to, expected) => expect(convert(category, value, from, to)).toBeCloseTo(expected, 9))
  it('round-trips every ordered unit pair in every category', () => {
    for (const [category, units] of Object.entries(UNITS)) for (const from of units) for (const to of units) {
      // 300 K / 300°C / 300°F are all physical inputs.
      const start = category === 'Temperature' ? 300 : 7.125
      expect(convert(category, convert(category, start, from, to), to, from)).toBeCloseTo(start, 9)
    }
  })
  it('handles temperature offsets and limits', () => {
    expect(convert('Temperature', 32, '°F', '°C')).toBeCloseTo(0)
    expect(convert('Temperature', -273.15, '°C', 'K')).toBe(0)
    expect(convert('Temperature', -459.67, '°F', 'K')).toBeCloseTo(0)
    expect(convert('Temperature', 0, 'K', '°C')).toBeCloseTo(-273.15)
    for (const [unit, value] of [['K', -1], ['°C', -274], ['°F', -460]] as const) expect(() => convert('Temperature', value, unit, 'K')).toThrow('absolute zero')
  })
  it('rejects nonfinite and unknown values consistently including temperature', () => {
    for (const value of [NaN, Infinity, -Infinity]) expect(() => convert('Length', value, 'm', 'ft')).toThrow('finite')
    expect(() => convert('Length', 1, 'm', 'invalid')).toThrow('Unknown unit')
    expect(() => convert('Temperature', 1, 'invalid', 'K')).toThrow('Unknown unit')
    expect(() => convert('Unknown', 1, 'm', 'm')).toThrow('Unknown unit')
    expect(() => convert('__proto__', 1, 'x', 'x')).toThrow('Unknown unit')
  })
  it('preserves tiny values and finite large intermediates', () => {
    expect(convertText('Length', 1e-100, 'm', 'nm')).toBe('1e-91')
    expect(convert('Length', 1e308, 'km', 'km')).toBe(1e308)
    for (const precision of [3, 6, 9, 12, 15]) {
      const maximum = convertText('Length', Number.MAX_VALUE, 'm', 'm', precision)
      expect(maximum).not.toMatch(/Infinity|NaN/)
      expect(Number.isFinite(Number(maximum))).toBe(true)
    }
    expect(convert('Temperature', 1e308, '°F', 'K')).toBeCloseTo(1e308 * (5 / 9), -290)
    expect(convert('Temperature', 9e307, 'K', '°F')).toBeCloseTo(9e307 * (9 / 5), -290)
    expect(() => convert('Length', 1e308, 'km', 'nm')).toThrow('numeric range')
    expect(() => convert('Length', Number.MIN_VALUE, 'nm', 'km')).toThrow('too small')
  })
  it('parses decimal text with strict syntax and reports literal range failures', () => {
    expect(parseConversionInput('  +.125e2  ')).toBe(12.5)
    expect(parseConversionInput('-0e-400')).toBe(-0)
    expect(parseConversionInput('5e-324')).toBe(Number.MIN_VALUE)
    for (const text of ['', ' ', '0x10', '1_000', 'Infinity', 'NaN', '1e', '1.2.3', '1'.repeat(129)]) expect(() => parseConversionInput(text)).toThrow()
    expect(() => parseConversionInput('1e-400')).toThrow('too small')
    expect(() => parseConversionInput('1e400')).toThrow('numeric range')
  })
  it('rejects temperatures below absolute zero even by a small amount', () => {
    expect(() => convert('Temperature', -1e-20, 'K', 'K')).toThrow('absolute zero')
    expect(convert('Temperature', 1e-100, 'K', 'K')).toBe(1e-100)
    expect(convert('Temperature', 1e-100, '°C', '°C')).toBe(1e-100)
  })
  it('provides full searchable names for every supported unit', () => {
    for (const units of Object.values(UNITS)) for (const unit of units) expect(typeof UNIT_NAMES[unit]).toBe('string')
  })
  it('applies configurable significant digits without claiming arbitrary precision', () => {
    expect(convertText('Length', 1, 'm', 'ft', 6)).toBe('3.28084')
    expect(convertText('Length', 1, 'm', 'ft', 12)).toBe('3.28083989501')
    expect(() => convertText('Length', 1, 'm', 'ft', 16)).toThrow('Precision')
  })
})
