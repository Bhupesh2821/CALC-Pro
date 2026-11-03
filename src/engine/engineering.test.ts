import { describe, expect, it } from 'vitest'
import { calculateComplex, complexAdd, complexDivide, complexMultiply, complexSubtract, formatComplex, parseMatrix, validateMatrix, addMatrices, multiplyMatrices, transpose, determinant, inverseMatrix, solveMatrix, formatMatrix } from './engineering'

const expectComplex = (expression: string, re: number, im = 0, digits = 10) => {
  const value = calculateComplex(expression)
  expect(value.re).toBeCloseTo(re, digits)
  expect(value.im).toBeCloseTo(im, digits)
}
const expectMatrix = (actual: number[][], expected: number[][], digits = 10) => {
  expect(actual.length).toBe(expected.length)
  actual.forEach((row, i) => { expect(row.length).toBe(expected[i].length); row.forEach((value, j) => expect(value).toBeCloseTo(expected[i][j], digits)) })
}

describe('complex arithmetic and principal functions', () => {
  it.each([
    ['(3+2i)*(1-i)', 5, -1], ['i^2', -1, 0], ['i^4', 1, 0], ['(3+2i)+(1-5i)', 4, -3], ['(3+2i)-(1-5i)', 2, 7],
    ['(3+2i)/(1-i)', 0.5, 2.5], ['1/(1+i)', 0.5, -0.5], ['(2+i)^-1', 0.4, -0.2], ['2^3^2', 512, 0],
    ['sqrt(-1)', 0, 1], ['sqrt(3+4i)', 2, 1], ['sqrt(3-4i)', 2, -1], ['sqrt(-3+4i)', 1, 2], ['sqrt(-3-4i)', 1, -2],
    ['sqrt(0)', 0, 0], ['cbrt(8)', 2, 0], ['nthRoot(16,4)', 2, 0], ['exp(i*pi)', -1, 0], ['ln(-1)', 0, Math.PI],
    ['log(100)', 2, 0], ['logbase(8,2)', 3, 0], ['log10(1000)', 3, 0], ['sin(i)', 0, Math.sinh(1)], ['cos(i)', Math.cosh(1), 0],
    ['tan(i)', 0, Math.tanh(1)], ['sinh(i)', 0, Math.sin(1)], ['cosh(i)', Math.cos(1), 0], ['tanh(i)', 0, Math.tan(1)],
    ['asin(0.5)', Math.PI / 6, 0], ['acos(.5)', Math.PI / 3, 0], ['atan(1)', Math.PI / 4, 0],
    ['asinh(0)', 0, 0], ['acosh(1)', 0, 0], ['atanh(.5)', Math.atanh(.5), 0],
    ['conj(3+2i)', 3, -2], ['re(3+2i)', 3, 0], ['im(3+2i)', 2, 0], ['abs(3+4i)', 5, 0], ['arg(i)', Math.PI / 2, 0],
    ['reciprocal(i)', 0, -1], ['5!', 120, 0], ['200+10%', 220, 0], ['(3+4i)%', .03, .04], ['-7 mod 3', 2, 0], ['rem(-7,3)', -1, 0],
    ['sin(pi)', 0, 0], ['cos(pi/2)', 0, 0], ['(-2)^3', -8, 0], ['min(3,-2,1)', -2, 0], ['max(3,-2,1)', 3, 0],
  ])('%s', (expression, re, im) => expectComplex(expression, re, im))
  it('implements exported arithmetic without mutating inputs', () => {
    const a = { re: 2, im: 3 }, b = { re: 4, im: -1 }
    expect(complexAdd(a, b)).toEqual({ re: 6, im: 2 }); expect(complexSubtract(a, b)).toEqual({ re: -2, im: 4 })
    expect(complexMultiply(a, b)).toEqual({ re: 11, im: 10 }); expect(a).toEqual({ re: 2, im: 3 })
  })
  it('multiplication rescales avoidable intermediate overflow', () => {
    const max = Number.MAX_VALUE
    const result = complexMultiply({ re: max, im: max / 10 }, { re: 1.01, im: .1 })
    expect(result.re / max).toBeCloseTo(1, 12)
    expect(result.im / max).toBeCloseTo(.201, 12)
    expect(() => calculateComplex('(1e308+1e308i)*(2+2i)')).toThrow('Overflow')
    expect(() => calculateComplex('1e-300*1e-100i')).toThrow('Underflow')
  })
  it('division avoids intermediate overflow for large equal components', () => {
    expect(complexDivide({ re: 1e308, im: 1e308 }, { re: 1, im: 1 })).toEqual({ re: 1e308, im: 0 })
    expect(complexDivide({ re: 1e308, im: 1e308 }, { re: 1e308, im: 1e308 })).toEqual({ re: 1, im: 0 })
    expect(complexDivide({ re: 5e-324, im: 5e-324 }, { re: 5e-324, im: 5e-324 })).toEqual({ re: 1, im: 0 })
  })
  it('supports huge complex logarithms and roots when the final components fit', () => {
    const logged = calculateComplex('ln(1e308+1e308i)')
    expect(logged.re).toBeCloseTo(Math.log(1e308) + Math.log(2) / 2, 10)
    const root = calculateComplex('sqrt(1e308+1e308i)')
    expect(root.re / 1e154).toBeCloseTo(1.09868411346781, 10)
    expect(root.im / 1e154).toBeCloseTo(.455089860562227, 10)
  })
  it('retains tiny complex components and formats imaginary units clearly', () => {
    expect(calculateComplex('1e-100i')).toEqual({ re: 0, im: 1e-100 })
    expect(formatComplex({ re: 0, im: 1 })).toBe('i'); expect(formatComplex({ re: 0, im: -1 })).toBe('-i')
    expect(formatComplex({ re: 3, im: -2 })).toBe('3 − 2i'); expect(formatComplex({ re: 0, im: 1e-100 })).toBe('1e-100i')
  })
  it.each(['1/0', 'i/0', 'sqrt()', 'sin(1,2)', 'mod(i,2)', '(2i)!', 'ln(0)', 'logbase(2,1)', 'nthroot(2,0)', 'tan(pi/2)', '1;2', 'x', 'Ans', 'M', '1.2.3', 'import(1)', 'i.foo', '1e309', 'exp(1000)', '1700!'])('rejects invalid or out-of-range %s', expression => expect(() => calculateComplex(expression)).toThrow())
})

describe('matrix input validation and formatting', () => {
  it('parses newline, semicolon, comma and scientific notation', () => { expect(parseMatrix('1, 2; 3e-1, -4')).toEqual([[1, 2], [.3, -4]]); expect(parseMatrix('1\n2\n3')).toEqual([[1], [2], [3]]) })
  it('clones validated input', () => { const a = [[1, 2]]; const b = validateMatrix(a); b[0][0] = 9; expect(a[0][0]).toBe(1) })
  it('formats matrices for exact round-trip to the text input at display precision', () => { const a = [[1, 2], [-3, 4]]; expect(parseMatrix(formatMatrix(a))).toEqual(a) })
  it.each(['', '1 2;3', 'NaN', 'Infinity', '1e309', '1e-400', '1+2', '1,2,3,4,5', '1;2;3;4;5'])('rejects malformed matrix %s', raw => expect(() => parseMatrix(raw)).toThrow())
  it.each([null, {}, [], [[]], [[Infinity]], [[NaN]], [[1, 2], [3]], [[1, '2']]])('rejects invalid runtime matrix', input => expect(() => validateMatrix(input)).toThrow())
})

describe('matrix operations, pivoting and residual checks', () => {
  const a = [[1, 2], [3, 4]], b = [[5, 6], [7, 8]]
  it('adds and subtracts matrices', () => { expect(addMatrices(a, b)).toEqual([[6, 8], [10, 12]]); expect(addMatrices(a, b, true)).toEqual([[-4, -4], [-4, -4]]) })
  it('multiplies square and rectangular matrices', () => { expect(multiplyMatrices(a, b)).toEqual([[19, 22], [43, 50]]); expect(multiplyMatrices([[1, 2, 3]], [[4], [5], [6]])).toEqual([[32]]) })
  it('transposes rectangular matrices', () => expect(transpose([[1, 2, 3], [4, 5, 6]])).toEqual([[1, 4], [2, 5], [3, 6]]))
  it.each([[[[1, 2], [3, 4]], -2], [[[0, 1], [2, 3]], -2], [[[3]], 3], [[[1, 2], [2, 4]], 0], [[[2, 1, 3], [0, -1, 4], [0, 0, 5]], -10]])('computes a determinant', (matrix, expected) => expect(determinant(matrix as number[][])).toBeCloseTo(expected as number, 10))
  it('avoids avoidable determinant product underflow or overflow', () => {
    expect(determinant([[1e-200, 0, 0, 0], [0, 1e-200, 0, 0], [0, 0, 1e200, 0], [0, 0, 0, 1e200]])).toBeCloseTo(1, 10)
    expect(determinant([[1e200, 0, 0, 0], [0, 1e200, 0, 0], [0, 0, 1e-200, 0], [0, 0, 0, 1e-200]])).toBeCloseTo(1, 10)
    expect(() => determinant([[1e-200, 0], [0, 1e-200]])).toThrow('Underflow')
    expect(() => determinant([[1e200, 0], [0, 1e200]])).toThrow('Overflow')
  })
  it('inverts using row pivoting and verifies A×A⁻¹ identity', () => {
    expectMatrix(inverseMatrix(a), [[-2, 1], [1.5, -.5]])
    const pivoted = [[0, 1], [2, 3]]
    expectMatrix(multiplyMatrices(pivoted, inverseMatrix(pivoted)), [[1, 0], [0, 1]])
  })
  it('solves AX=B and verifies recomputed residual with multiple right sides', () => {
    const coefficient = [[3, 2, -1], [2, -2, 4], [-1, .5, -1]], rhs = [[1, 2], [-2, 1], [0, 3]]
    const x = solveMatrix(coefficient, rhs)
    expectMatrix(multiplyMatrices(coefficient, x), rhs)
    expectMatrix(solveMatrix(coefficient, [[1], [-2], [0]]), [[1], [-2], [-2]])
  })
  it('accepts well-conditioned systems at tiny scale', () => { expectMatrix(solveMatrix([[1e-200, 0], [0, 2e-200]], [[1e-200], [4e-200]]), [[1], [2]]) })
  it('does not mutate matrix inputs', () => { const before = JSON.stringify(a); inverseMatrix(a); determinant(a); expect(JSON.stringify(a)).toBe(before) })
  it.each([
    () => addMatrices([[1]], [[1, 2]]), () => multiplyMatrices([[1, 2]], [[1, 2]]), () => determinant([[1, 2]]),
    () => inverseMatrix([[1, 2], [2, 4]]), () => inverseMatrix([[0]]), () => solveMatrix(a, [[1]]),
    () => solveMatrix([[1, 1], [1, 1 + Number.EPSILON]], [[1], [1]]),
  ])('rejects incompatible, singular or unstable matrix operations', operation => expect(operation).toThrow())
})


describe('exact algebraic complex integer powers', () => {
  it.each([
    ['i^2', { re: -1, im: 0 }, '-1'],
    ['i^3', { re: 0, im: -1 }, '-i'],
    ['i^-1', { re: 0, im: -1 }, '-i'],
    ['i^-2', { re: -1, im: 0 }, '-1'],
    ['i^0', { re: 1, im: 0 }, '1'],
    ['(1+i)^2', { re: 0, im: 2 }, '2i'],
    ['(-i)^3', { re: 0, im: 1 }, 'i'],
    ['i^9007199254740991', { re: 0, im: -1 }, '-i'],
  ])('%s produces an exact simple value', (expression, expected, formatted) => {
    const result = calculateComplex(expression)
    expect(result).toEqual(expected)
    expect(formatComplex(result)).toBe(formatted)
  })
  it('retains genuine tiny complex powers instead of applying a blanket epsilon', () => {
    expect(calculateComplex('(1e-100i)^2')).toEqual({ re: -1e-200, im: 0 })
    expect(calculateComplex('1+1e-100i')).toEqual({ re: 1, im: 1e-100 })
    expect(calculateComplex('(1+1e-100i)^2')).toEqual({ re: 1, im: 2e-100 })
  })
})
