import { CalcError, factorial, finite, fmt, parseExpression, realFunction, trigScope, type ExprNode } from './calc'

export type Complex = { re: number; im: number }
export type Matrix = number[][]
const z = (re: number, im = 0): Complex => ({ re: finite(re), im: finite(im) })
export const complexAdd = (a: Complex, b: Complex) => z(a.re + b.re, a.im + b.im)
export const complexSubtract = (a: Complex, b: Complex) => z(a.re - b.re, a.im - b.im)
function scaledProduct(a: number, b: number, c: number): number {
  if (a === 0 || b === 0 || c === 0) return 0
  const options = [[a * b, c], [a * c, b], [b * c, a]]
    .filter(([pair, rest]) => Number.isFinite(pair) && pair !== 0 && Number.isFinite(pair * rest) && pair * rest !== 0)
    .sort((left, right) => Math.abs(Math.log2(Math.abs(left[0]))) - Math.abs(Math.log2(Math.abs(right[0]))))
  if (options.length) return finite(options[0][0] * options[0][1])
  // All pairings can underflow/overflow at the boundaries; combine decimal exponents once.
  let mantissa = 1, exponent = 0
  for (const value of [a, b, c]) {
    const [digits, power] = value.toExponential().split('e')
    mantissa *= Number(digits); exponent += Number(power)
  }
  const result = finite(Number(`${mantissa}e${exponent}`))
  if (result === 0) throw new CalcError('Underflow: result is smaller than the supported range')
  return result
}
export function complexMultiply(a: Complex, b: Complex): Complex {
  const re = a.re * b.re - a.im * b.im, im = a.re * b.im + a.im * b.re
  const leftScale = Math.max(Math.abs(a.re), Math.abs(a.im)), rightScale = Math.max(Math.abs(b.re), Math.abs(b.im))
  if (leftScale === 0 || rightScale === 0) return z(0)
  if (Number.isFinite(re) && Number.isFinite(im) && (re !== 0 || im !== 0)) return z(re, im)
  const ar = a.re / leftScale, ai = a.im / leftScale, br = b.re / rightScale, bi = b.im / rightScale
  return z(scaledProduct(ar * br - ai * bi, leftScale, rightScale), scaledProduct(ar * bi + ai * br, leftScale, rightScale))
}
export function complexDivide(a: Complex, b: Complex): Complex {
  if (b.re === 0 && b.im === 0) throw new CalcError('Cannot divide by zero')
  // Divide by the larger denominator component; reduce before summing to avoid overflow.
  const ratio = (numerator: number, denominator: number, scale: number) => {
    const quotient = numerator / denominator
    return Number.isFinite(quotient) ? quotient / scale : (numerator / scale) / denominator
  }
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const r = b.im / b.re, d = 1 + r * r
    const real = ratio(a.re, b.re, d), imaginary = ratio(a.im, b.re, d)
    return z(real + imaginary * r, imaginary - real * r)
  }
  const r = b.re / b.im, d = 1 + r * r
  const real = ratio(a.re, b.im, d), imaginary = ratio(a.im, b.im, d)
  return z(real * r + imaginary, imaginary * r - real)
}
const magnitude = (a: Complex) => finite(Math.hypot(a.re, a.im))
const neg = (a: Complex) => z(-a.re, -a.im)
function logarithm(a: Complex): Complex {
  if (a.re === 0 && a.im === 0) throw new CalcError('Domain error: complex logarithm of zero is undefined')
  const larger = Math.max(Math.abs(a.re), Math.abs(a.im)), smaller = Math.min(Math.abs(a.re), Math.abs(a.im))
  // log(hypot) remains representable even when the magnitude itself would overflow.
  return z(Math.log(larger) + 0.5 * Math.log1p((smaller / larger) ** 2), Math.atan2(a.im, a.re))
}
function exponential(a: Complex): Complex {
  const r = finite(Math.exp(a.re))
  if (r === 0) throw new CalcError('Underflow: result is smaller than the supported range')
  return z(r * Math.cos(a.im), r * Math.sin(a.im))
}
function squareRoot(a: Complex): Complex {
  if (a.im === 0) return a.re >= 0 ? z(Math.sqrt(a.re)) : z(0, Math.sqrt(-a.re))
  const scale = Math.max(Math.abs(a.re), Math.abs(a.im))
  const scaledReal = a.re / scale, scaledImaginary = a.im / scale
  const t = Math.sqrt(scale) * Math.sqrt((Math.hypot(scaledReal, scaledImaginary) + Math.abs(scaledReal)) / 2)
  return a.re >= 0 ? z(t, a.im / (2 * t)) : z(Math.abs(a.im) / (2 * t), Math.sign(a.im) * t)
}
function power(a: Complex, b: Complex): Complex {
  if (a.im === 0 && b.im === 0 && (a.re >= 0 || Number.isInteger(b.re))) {
    if (a.re === 0 && b.re < 0) throw new CalcError('Cannot divide by zero')
    const result = finite(a.re ** b.re)
    if (a.re !== 0 && result === 0) throw new CalcError('Underflow: result is smaller than the supported range')
    return z(result)
  }
  if (a.re === 0 && a.im === 0) {
    if (b.im === 0 && b.re > 0) return z(0)
    throw new CalcError('Domain error: zero raised to this power is undefined')
  }
  if (b.im === 0 && Number.isSafeInteger(b.re)) {
    // Integer powers are algebraic: logarithms introduce false residuals such as i² ≈ −1 + εi.
    // Repeated squaring uses at most 53 iterations, including for negative exponents.
    let exponent = Math.abs(b.re)
    let factor = b.re < 0 ? complexDivide(z(1), a) : a
    let result = z(1)
    while (exponent > 0) {
      if (exponent % 2 === 1) result = complexMultiply(result, factor)
      exponent = Math.floor(exponent / 2)
      if (exponent > 0) factor = complexMultiply(factor, factor)
    }
    return result
  }
  return exponential(complexMultiply(b, logarithm(a)))
}
function complexFunction(name: string, args: Complex[]): Complex {
  const [a, b] = args
  if (['log', 'logbase', 'nthroot', 'root', 'mod', 'rem', 'remainder'].includes(name)) {
    if (['logbase', 'nthroot', 'root', 'mod', 'rem', 'remainder'].includes(name) && args.length !== 2 || name === 'log' && ![1, 2].includes(args.length)) throw new CalcError(`Syntax error: wrong number of arguments for ${name}`)
  } else if (!['min', 'max'].includes(name) && args.length !== 1) throw new CalcError(`Syntax error: wrong number of arguments for ${name}`)
  const i = z(0, 1), one = z(1)
  switch (name) {
    case 're': return z(a.re)
    case 'im': return z(a.im)
    case 'conj': return z(a.re, -a.im)
    case 'arg': return z(Math.atan2(a.im, a.re))
    case 'abs': return z(magnitude(a))
    case 'sqrt': return squareRoot(a)
    case 'cbrt': return power(a, z(1 / 3))
    case 'nthroot': case 'root': return power(a, complexDivide(one, b))
    case 'exp': return exponential(a)
    case 'ln': return logarithm(a)
    case 'log10': return complexDivide(logarithm(a), z(Math.LN10))
    case 'log': case 'logbase': return complexDivide(logarithm(a), logarithm(b ?? z(10)))
    case 'reciprocal': return complexDivide(one, a)
    case 'sin': if (a.im === 0) return z(trigScope('RAD').sin(a.re)); return z(Math.sin(a.re) * Math.cosh(a.im), Math.cos(a.re) * Math.sinh(a.im))
    case 'cos': if (a.im === 0) return z(trigScope('RAD').cos(a.re)); return z(Math.cos(a.re) * Math.cosh(a.im), -Math.sin(a.re) * Math.sinh(a.im))
    case 'tan': if (a.im === 0) return z(trigScope('RAD').tan(a.re)); return complexDivide(complexFunction('sin', [a]), complexFunction('cos', [a]))
    case 'sinh': return z(Math.sinh(a.re) * Math.cos(a.im), Math.cosh(a.re) * Math.sin(a.im))
    case 'cosh': return z(Math.cosh(a.re) * Math.cos(a.im), Math.sinh(a.re) * Math.sin(a.im))
    case 'tanh': return complexDivide(complexFunction('sinh', [a]), complexFunction('cosh', [a]))
    case 'asin': return neg(complexMultiply(i, logarithm(complexAdd(complexMultiply(i, a), squareRoot(complexSubtract(one, complexMultiply(a, a)))))))
    case 'acos': return complexSubtract(z(Math.PI / 2), complexFunction('asin', [a]))
    case 'atan': return complexMultiply(z(0, 0.5), complexSubtract(logarithm(complexSubtract(one, complexMultiply(i, a))), logarithm(complexAdd(one, complexMultiply(i, a)))))
    case 'asinh': return logarithm(complexAdd(a, squareRoot(complexAdd(complexMultiply(a, a), one))))
    case 'acosh': return logarithm(complexAdd(a, complexMultiply(squareRoot(complexAdd(a, one)), squareRoot(complexSubtract(a, one)))))
    case 'atanh': return complexMultiply(z(0.5), complexSubtract(logarithm(complexAdd(one, a)), logarithm(complexSubtract(one, a))))
    default:
      if (args.some(arg => arg.im !== 0)) throw new CalcError(`Domain error: ${name} requires real arguments`)
      return z(realFunction(name, args.map(arg => arg.re), 'RAD'))
  }
}

/** Complex elementary functions use radians and principal branches. */
export function calculateComplex(raw: string): Complex {
  const node = parseExpression(raw, 'complex')
  const run = (value: ExprNode): Complex => {
    switch (value.kind) {
      case 'number': return z(value.value)
      case 'symbol':
        if (value.name === 'i') return z(0, 1)
        if (value.name === 'e') return z(Math.E)
        if (value.name === 'pi') return z(Math.PI)
        throw new CalcError('Unsupported expression: complex mode supports i, pi and e')
      case 'unary': return value.op === '-' ? neg(run(value.value)) : run(value.value)
      case 'postfix': {
        const a = run(value.value)
        if (value.op === '%') return complexDivide(a, z(100))
        if (a.im !== 0) throw new CalcError('Domain error: factorial requires a real nonnegative integer')
        return z(factorial(a.re))
      }
      case 'call': return complexFunction(value.name, value.args.map(run))
      case 'binary': {
        const a = run(value.left), b = run(value.right), percent = value.right.kind === 'postfix' && value.right.op === '%'
        switch (value.op) {
          case '+': return complexAdd(a, percent ? complexMultiply(a, b) : b)
          case '-': return complexSubtract(a, percent ? complexMultiply(a, b) : b)
          case '*': return complexMultiply(a, b)
          case '/': return complexDivide(a, b)
          case '^': return power(a, b)
          case 'mod': case 'rem': return complexFunction(value.op, [a, b])
          default: throw new CalcError('Unsupported expression')
        }
      }
    }
  }
  return run(node)
}
export function formatComplex(a: Complex): string {
  if (a.im === 0) return fmt(a.re)
  const imaginary = Math.abs(a.im) === 1 ? 'i' : `${fmt(Math.abs(a.im))}i`
  if (a.re === 0) return `${a.im < 0 ? '-' : ''}${imaginary}`
  return `${fmt(a.re)} ${a.im < 0 ? '−' : '+'} ${imaginary}`
}

export const MATRIX_LIMIT = 4
export function validateMatrix(value: unknown): Matrix {
  if (!Array.isArray(value) || value.length < 1 || value.length > MATRIX_LIMIT || !value.every(row => Array.isArray(row) && row.length >= 1 && row.length <= MATRIX_LIMIT && row.every(cell => typeof cell === 'number' && Number.isFinite(cell)))) throw new CalcError('Enter a rectangular matrix of finite numbers, up to 4 × 4')
  const matrix = value as Matrix
  if (!matrix.every(row => row.length === matrix[0].length)) throw new CalcError('Matrix rows must have the same number of columns')
  return matrix.map(row => [...row])
}
/** Rows may be separated by newlines or semicolons; cells by spaces or commas. */
export function parseMatrix(raw: string): Matrix {
  if (!raw.trim() || raw.length > 2048) throw new CalcError('Enter a matrix, up to 4 × 4')
  const cells = raw.trim().split(/[;\n]/).filter(row => row.trim()).map(row => row.trim().split(/[\s,]+/))
  if (cells.some(row => row.some(cell => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(cell)))) throw new CalcError('Matrix cells must contain decimal or scientific-notation numbers')
  return validateMatrix(cells.map(row => row.map(cell => {
    const value = Number(cell)
    if (value === 0 && /[1-9]/.test(cell.split(/[eE]/)[0])) throw new CalcError('Underflow: a matrix cell is smaller than the supported range')
    return value
  })))
}
export function transpose(matrix: Matrix): Matrix {
  const a = validateMatrix(matrix)
  return a[0].map((_, c) => a.map(row => row[c]))
}
export function addMatrices(left: Matrix, right: Matrix, subtract = false): Matrix {
  const a = validateMatrix(left), b = validateMatrix(right)
  if (a.length !== b.length || a[0].length !== b[0].length) throw new CalcError('Addition and subtraction require equal matrix dimensions')
  return a.map((row, i) => row.map((value, j) => finite(value + (subtract ? -b[i][j] : b[i][j]))))
}
export function multiplyMatrices(left: Matrix, right: Matrix): Matrix {
  const a = validateMatrix(left), b = validateMatrix(right)
  if (a[0].length !== b.length) throw new CalcError('Multiplication requires columns of A to equal rows of B')
  return a.map(row => b[0].map((_, j) => finite(row.reduce((sum, value, k) => finite(sum + finite(value * b[k][j])), 0))))
}
const square = (matrix: Matrix): Matrix => {
  const a = validateMatrix(matrix)
  if (a.length !== a[0].length) throw new CalcError('This operation requires a square matrix')
  return a
}
export function determinant(matrix: Matrix): number {
  const a = square(matrix)
  let mantissa = 1, exponent = 0, sign = 1
  for (let c = 0; c < a.length; c++) {
    let pivot = c
    for (let row = c + 1; row < a.length; row++) if (Math.abs(a[row][c]) > Math.abs(a[pivot][c])) pivot = row
    if (a[pivot][c] === 0) return 0
    if (pivot !== c) { [a[pivot], a[c]] = [a[c], a[pivot]]; sign *= -1 }
    const p = a[c][c]
    const [digits, power] = Math.abs(p).toExponential().split('e')
    mantissa *= Number(digits); exponent += Number(power)
    if (p < 0) sign *= -1
    while (mantissa >= 10) { mantissa /= 10; exponent++ }
    for (let row = c + 1; row < a.length; row++) {
      const factor = a[row][c] / p
      for (let col = c + 1; col < a.length; col++) a[row][col] = finite(a[row][col] - finite(factor * a[c][col]))
    }
  }
  const result = finite(Number(`${sign * mantissa}e${exponent}`))
  if (result === 0) throw new CalcError('Underflow: determinant is smaller than the supported range')
  return result
}
/** Gauss-Jordan elimination with partial pivoting. Rejects numerically singular systems. */
export function solveMatrix(matrix: Matrix, right: Matrix): Matrix {
  const a = square(matrix), b = validateMatrix(right), n = a.length
  if (b.length !== n) throw new CalcError('The right-hand matrix must have the same number of rows as A')
  const augmented = a.map((row, i) => [...row, ...b[i]])
  // Row scaling makes the singularity threshold relative to each row rather than absolute.
  const scales = a.map(row => Math.max(...row.map(Math.abs)))
  if (scales.some(scale => scale === 0)) throw new CalcError('Matrix is singular; no unique solution or inverse exists')
  for (let c = 0; c < n; c++) {
    let pivot = c
    for (let row = c + 1; row < n; row++) if (Math.abs(augmented[row][c]) / scales[row] > Math.abs(augmented[pivot][c]) / scales[pivot]) pivot = row
    if (Math.abs(augmented[pivot][c]) / scales[pivot] <= Number.EPSILON * n * 4) throw new CalcError('Matrix is singular or too ill-conditioned for a reliable solution')
    if (pivot !== c) { [augmented[pivot], augmented[c]] = [augmented[c], augmented[pivot]]; [scales[pivot], scales[c]] = [scales[c], scales[pivot]] }
    const p = augmented[c][c]
    for (let col = 0; col < augmented[c].length; col++) augmented[c][col] = finite(augmented[c][col] / p)
    for (let row = 0; row < n; row++) if (row !== c) {
      const factor = augmented[row][c]
      for (let col = 0; col < augmented[row].length; col++) augmented[row][col] = finite(augmented[row][col] - finite(factor * augmented[c][col]))
    }
  }
  return augmented.map(row => row.slice(n))
}
export function inverseMatrix(matrix: Matrix): Matrix {
  const a = square(matrix)
  return solveMatrix(a, a.map((_, i) => a.map((__, j) => i === j ? 1 : 0)))
}
export function formatMatrix(matrix: Matrix): string { return matrix.map(row => row.map(value => fmt(value)).join('\t')).join('\n') }
