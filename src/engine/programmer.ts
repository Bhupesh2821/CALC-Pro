export type Bits = 8 | 16 | 32 | 64
export type Base = 2 | 8 | 10 | 16
export type Op = '+' | '-' | '×' | '÷' | 'MOD' | 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | '<<' | '>>'

function checkBits(bits: number): asserts bits is Bits {
  if (![8, 16, 32, 64].includes(bits)) throw new Error('Choose an 8, 16, 32 or 64-bit word')
}
function checkBase(base: number): asserts base is Base {
  if (![2, 8, 10, 16].includes(base)) throw new Error('Choose BIN, OCT, DEC or HEX')
}
/** All operations wrap modulo 2^bits. Signed values use two's complement. */
export const wrap = (value: bigint, bits: Bits, signed = true) => {
  checkBits(bits)
  return signed ? BigInt.asIntN(bits, value) : BigInt.asUintN(bits, value)
}
export const not = (value: bigint, bits: Bits, signed = true) => wrap(~value, bits, signed)
export function show(value: bigint, bits: Bits, base: number, signed = true): string {
  checkBase(base)
  const normalized = wrap(value, bits, signed)
  return (base === 10 ? normalized : BigInt.asUintN(bits, normalized)).toString(base).toUpperCase()
}
/** Parse digits independently of signed interpretation, then mask exactly once. */
export function parseWord(input: string, base: number, bits: Bits, signed = true): bigint {
  checkBase(base)
  checkBits(bits)
  let text = input.trim()
  if (text.length > 256) throw new Error('Input is limited to 256 characters')
  let sign = 1n
  if (/^[+-]/.test(text)) { if (text[0] === '-') sign = -1n; text = text.slice(1) }
  const prefix = base === 16 ? /^0x/i : base === 8 ? /^0o/i : base === 2 ? /^0b/i : null
  if (prefix) text = text.replace(prefix, '')
  const pattern = base === 16 ? /^[0-9a-f]+$/i : base === 10 ? /^\d+$/ : base === 8 ? /^[0-7]+$/ : /^[01]+$/
  if (!pattern.test(text)) throw new Error(`Enter valid base-${base} integer digits`)
  let result = 0n
  for (const digit of text.toUpperCase()) result = result * BigInt(base) + BigInt(parseInt(digit, 16))
  return wrap(sign * result, bits, signed)
}
export function toggleBit(value: bigint, index: number, bits: Bits, signed = true): bigint {
  checkBits(bits)
  if (!Number.isInteger(index) || index < 0 || index >= bits) throw new Error('Bit index out of range')
  return wrap(value ^ (1n << BigInt(index)), bits, signed)
}
export function wordRange(bits: Bits, signed = true) {
  checkBits(bits)
  return signed ? { min: -(1n << BigInt(bits - 1)), max: (1n << BigInt(bits - 1)) - 1n } : { min: 0n, max: (1n << BigInt(bits)) - 1n }
}
export function apply(op: Op, a: bigint, c: bigint, bits: Bits, signed = true): bigint {
  if ((op === '<<' || op === '>>') && (c < 0n || c >= BigInt(bits))) throw new Error(`Shift out of range: count must be between 0 and ${bits - 1}`)
  a = wrap(a, bits, signed)
  if (op !== '<<' && op !== '>>') c = wrap(c, bits, signed)
  let result: bigint
  switch (op) {
    case '+': result = a + c; break
    case '-': result = a - c; break
    case '×': result = a * c; break
    case '÷': if (c === 0n) throw new Error('Cannot divide by zero'); result = a / c; break
    case 'MOD': if (c === 0n) throw new Error('Cannot divide by zero'); result = a % c; break
    case 'AND': result = a & c; break
    case 'OR': result = a | c; break
    case 'XOR': result = a ^ c; break
    case 'NAND': result = ~(a & c); break
    case 'NOR': result = ~(a | c); break
    case '<<':
    case '>>':
      if (c < 0n || c >= BigInt(bits)) throw new Error(`Shift out of range: count must be between 0 and ${bits - 1}`)
      result = op === '<<' ? a << c : a >> c
      break
    default: throw new Error('Unsupported operation')
  }
  return wrap(result, bits, signed)
}
