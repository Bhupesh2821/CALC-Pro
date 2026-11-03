const FACTORS: Record<string, Record<string, number>> = {
  Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, 'µm': 1e-6, nm: 1e-9, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254, nmi: 1852 },
  Mass: { kg: 1, g: 0.001, mg: 1e-6, t: 1000, lb: 0.45359237, oz: 0.028349523125, st: 6.35029318 },
  Time: { s: 1, ms: 0.001, 'µs': 1e-6, min: 60, h: 3600, d: 86400, wk: 604800, yr: 31557600 },
  Area: { 'm²': 1, 'km²': 1e6, 'cm²': 1e-4, ha: 1e4, acre: 4046.8564224, 'ft²': 0.09290304, 'in²': 6.4516e-4, 'mi²': 2589988.110336 },
  Volume: { L: 1, mL: 0.001, 'm³': 1000, 'gal (US)': 3.785411784, 'gal (UK)': 4.54609, 'qt (US)': 0.946352946, 'pt (US)': 0.473176473, 'cup (US)': 0.2365882365, 'fl oz (US)': 0.0295735295625, 'ft³': 28.316846592, 'in³': 0.016387064 },
  Speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: 0.44704, kn: 1852 / 3600, 'ft/s': 0.3048 },
  Pressure: { Pa: 1, kPa: 1e3, MPa: 1e6, bar: 1e5, atm: 101325, psi: 6894.757293168, mmHg: 133.322387415 },
  Energy: { J: 1, kJ: 1e3, cal: 4.184, kcal: 4184, Wh: 3600, kWh: 3.6e6, eV: 1.602176634e-19, BTU: 1055.05585262 },
  Power: { W: 1, kW: 1e3, MW: 1e6, hp: 745.69987158227 },
  Data: { bit: 0.125, B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1048576, GiB: 1073741824, TiB: 1099511627776 },
  Angle: { rad: 1, '°': Math.PI / 180, grad: Math.PI / 200, turn: 2 * Math.PI, arcmin: Math.PI / 10800, arcsec: Math.PI / 648000 },
  Frequency: { Hz: 1, kHz: 1e3, MHz: 1e6, GHz: 1e9, rpm: 1 / 60 },
}
export const UNITS: Record<string, string[]> = { ...Object.fromEntries(Object.entries(FACTORS).map(([key, values]) => [key, Object.keys(values)])), Temperature: ['°C', '°F', 'K'] }
export const UNIT_NAMES: Record<string, string> = {
  m: 'metre', km: 'kilometre', cm: 'centimetre', mm: 'millimetre', 'µm': 'micrometre', nm: 'nanometre', mi: 'mile', yd: 'yard', ft: 'foot', in: 'inch', nmi: 'nautical mile',
  kg: 'kilogram', g: 'gram', mg: 'milligram', t: 'tonne', lb: 'pound', oz: 'ounce', st: 'stone', s: 'second', ms: 'millisecond', 'µs': 'microsecond', min: 'minute', h: 'hour', d: 'day', wk: 'week',
  L: 'litre', mL: 'millilitre', Pa: 'pascal', kPa: 'kilopascal', MPa: 'megapascal', atm: 'standard atmosphere', psi: 'pounds per square inch', J: 'joule', kJ: 'kilojoule', cal: 'thermochemical calorie', kcal: 'thermochemical kilocalorie', Wh: 'watt hour', kWh: 'kilowatt hour', eV: 'electronvolt',
  yr: 'Julian year', BTU: 'international table British thermal unit', hp: 'mechanical horsepower', W: 'watt', kW: 'kilowatt', MW: 'megawatt', B: 'byte', KB: 'kilobyte', MB: 'megabyte', GB: 'gigabyte', TB: 'terabyte', KiB: 'kibibyte', MiB: 'mebibyte', GiB: 'gibibyte', TiB: 'tebibyte',
  'm²': 'square metre', 'km²': 'square kilometre', 'cm²': 'square centimetre', 'ft²': 'square foot', 'in²': 'square inch', 'mi²': 'square mile', ha: 'hectare', 'm³': 'cubic metre', 'ft³': 'cubic foot', 'in³': 'cubic inch',
  'm/s': 'metres per second', 'km/h': 'kilometres per hour', mph: 'miles per hour', kn: 'knot', 'ft/s': 'feet per second', mmHg: 'millimetres of mercury',
  acre: 'acre', bar: 'bar', bit: 'bit', turn: 'full turn', 'gal (US)': 'US liquid gallon', 'gal (UK)': 'imperial gallon', 'qt (US)': 'US liquid quart', 'pt (US)': 'US liquid pint', 'cup (US)': 'US customary cup', 'fl oz (US)': 'US fluid ounce',
  rad: 'radian', '°': 'degree', grad: 'gradian', arcmin: 'arcminute', arcsec: 'arcsecond', Hz: 'hertz', kHz: 'kilohertz', MHz: 'megahertz', GHz: 'gigahertz', rpm: 'revolutions per minute', '°C': 'Celsius', '°F': 'Fahrenheit', K: 'kelvin',
}
/** Strict decimal input, retaining the distinction between zero and an underflowed literal. */
export function parseConversionInput(input: string): number {
  const text = input.trim()
  if (text.length > 128 || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) throw new Error('Enter a finite decimal number, optionally using scientific notation')
  const value = Number(text)
  if (!Number.isFinite(value)) throw new Error('Input exceeds the supported numeric range')
  if (value === 0 && /[1-9]/.test(text.split(/[eE]/)[0])) throw new Error('Input is too small for numeric precision')
  return value
}
export function convert(category: string, value: number, from: string, to: string): number {
  if (!Number.isFinite(value)) throw new Error('Enter a finite number')
  if (!Object.hasOwn(UNITS, category) || !UNITS[category].includes(from) || !UNITS[category].includes(to)) throw new Error('Unknown unit')
  let result: number
  if (category === 'Temperature') {
    const minimum = from === '°C' ? -273.15 : from === '°F' ? -459.67 : 0
    if (value < minimum) throw new Error('Temperature cannot be below absolute zero')
    if (from === to) return Object.is(value, -0) ? 0 : value
    const kelvin = from === '°C' ? value + 273.15 : from === '°F' ? (value - 32) * (5 / 9) + 273.15 : value
    const k = Math.max(0, kelvin)
    result = to === '°C' ? k - 273.15 : to === '°F' ? (k - 273.15) * (9 / 5) + 32 : k
  } else {
    // The ratio avoids an overflowing intermediate when the conversion is finite.
    result = value * (FACTORS[category][from] / FACTORS[category][to])
  }
  if (!Number.isFinite(result)) throw new Error('Conversion exceeds the supported numeric range')
  if (result === 0 && value !== 0 && category !== 'Temperature') throw new Error('Conversion is too small for numeric precision')
  return Object.is(result, -0) ? 0 : result
}
export function convertText(category: string, value: number, from: string, to: string, precision = 12): string {
  if (!Number.isInteger(precision) || precision < 3 || precision > 15) throw new Error('Precision must be between 3 and 15 significant digits')
  const result = convert(category, value, from, to)
  // Keep significant digits and scientific notation; never round tiny finite values to zero.
  const rounded = Number(result.toPrecision(precision))
  // Rounding MAX_VALUE upward must not turn a finite conversion into Infinity.
  return Number.isFinite(rounded) ? rounded.toString() : result.toString()
}
