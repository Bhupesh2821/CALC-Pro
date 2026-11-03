import { describe, expect, it } from 'vitest'
import { apply, not, parseWord, show, toggleBit, wordRange, wrap, type Bits } from './programmer'

describe('exact programmer operations', () => {
  it.each([8, 16, 32, 64] as Bits[])('wraps signed and unsigned at %i bits', bits => {
    const modulus = 1n << BigInt(bits)
    expect(wrap(modulus - 1n, bits)).toBe(-1n)
    expect(wrap(modulus, bits)).toBe(0n)
    expect(wrap(-1n, bits, false)).toBe(modulus - 1n)
    expect(apply('+', (modulus >> 1n) - 1n, 1n, bits)).toBe(-(modulus >> 1n))
    expect(apply('+', modulus - 1n, 1n, bits, false)).toBe(0n)
    expect(not(0n, bits)).toBe(-1n)
    expect(not(0n, bits, false)).toBe(modulus - 1n)
    expect(wordRange(bits).min).toBe(-(modulus >> 1n))
    expect(wordRange(bits, false).max).toBe(modulus - 1n)
  })
  it.each([
    ['+', 7n, 3n, 10n], ['-', 7n, 3n, 4n], ['×', 7n, 3n, 21n], ['÷', 7n, 3n, 2n], ['÷', -7n, 3n, -2n], ['MOD', -7n, 3n, -1n],
    ['AND', 12n, 10n, 8n], ['OR', 12n, 10n, 14n], ['XOR', 12n, 10n, 6n], ['NAND', 12n, 10n, -9n], ['NOR', 12n, 10n, -15n], ['<<', 1n, 4n, 16n], ['>>', -8n, 1n, -4n],
  ] as const)('%s(%s,%s)', (op, a, b, result) => expect(apply(op, a, b, 32)).toBe(result))
  it('uses logical right shift in unsigned mode', () => {
    expect(apply('>>', -1n, 1n, 8, false)).toBe(127n)
    expect(apply('>>', -1n, 1n, 8)).toBe(-1n)
    expect(apply('<<', 1n, 63n, 64)).toBe(-9223372036854775808n)
  })
  it.each([-1n, 8n, 256n])('rejects invalid shift count %s before masking', count => expect(() => apply('<<', 1n, count, 8)).toThrow('Shift out of range'))
  it('distinguishes exact integer zero division', () => {
    expect(() => apply('÷', 1n, 0n, 32)).toThrow('Cannot divide by zero')
    expect(() => apply('MOD', 1n, 0n, 32)).toThrow('Cannot divide by zero')
    expect(apply('÷', -128n, -1n, 8)).toBe(-128n)
  })
  it('keeps all 64-bit digits beyond Number precision', () => {
    expect(parseWord('9007199254740993', 10, 64)).toBe(9007199254740993n)
    expect(apply('+', 9007199254740993n, 2n, 64)).toBe(9007199254740995n)
    expect(show(18446744073709551615n, 64, 10, false)).toBe('18446744073709551615')
  })
  it('regresses signed hexadecimal digit accumulation without negative feedback', () => {
    expect(parseWord('F', 16, 8)).toBe(15n)
    expect(parseWord('FF', 16, 8)).toBe(-1n)
    expect(parseWord('FFF', 16, 8)).toBe(-1n)
    expect(parseWord('FF0', 16, 8)).toBe(-16n)
    expect(parseWord('80000000', 16, 32)).toBe(-2147483648n)
    expect(parseWord('FFFFFFFF', 16, 32)).toBe(-1n)
    expect(parseWord('FFFFFFFFFFFFFFFF', 16, 64)).toBe(-1n)
    expect(parseWord('FFFFFFFFFFFFFFFF', 16, 64, false)).toBe(18446744073709551615n)
  })
  it('accepts prefixes and signed integers in all bases', () => {
    expect(parseWord('0xFF', 16, 16)).toBe(255n)
    expect(parseWord('-FF', 16, 16)).toBe(-255n)
    expect(parseWord('0b1010', 2, 16)).toBe(10n)
    expect(parseWord('-0o77', 8, 16)).toBe(-63n)
    expect(parseWord(' +42 ', 10, 16)).toBe(42n)
  })
  it.each([['2', 2], ['8', 8], ['A', 10], ['G', 16], ['1.2', 10], ['1e2', 10], ['', 10], ['-', 10], ['0x10', 10]] as const)('rejects %s in base %i', (text, base) => expect(() => parseWord(text, base, 32)).toThrow('integer digits'))
  it('limits input size and validates word parameters', () => {
    expect(() => parseWord('1'.repeat(257), 2, 64)).toThrow('256 characters')
    expect(() => parseWord('1', 3, 32)).toThrow('Choose BIN')
    expect(() => wrap(1n, 7 as Bits)).toThrow('Choose an 8')
  })
  it('converts identical bit patterns to every representation', () => {
    expect(show(-1n, 8, 16)).toBe('FF')
    expect(show(-1n, 8, 8)).toBe('377')
    expect(show(-1n, 8, 2)).toBe('11111111')
    expect(show(-1n, 8, 10)).toBe('-1')
    expect(show(-1n, 8, 10, false)).toBe('255')
    expect(show(255n, 8, 10)).toBe('-1')
  })
  it.each([8, 16, 32, 64] as Bits[])('toggles every bit exactly at %i bits', bits => {
    let value = 0n
    for (let bit = 0; bit < bits; bit++) value = toggleBit(value, bit, bits)
    expect(value).toBe(-1n)
    for (let bit = 0; bit < bits; bit++) value = toggleBit(value, bit, bits)
    expect(value).toBe(0n)
    expect(() => toggleBit(0n, bits, bits)).toThrow('Bit index')
    expect(() => toggleBit(0n, -1, bits)).toThrow('Bit index')
  })
})
