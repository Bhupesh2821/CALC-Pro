/** Bounded, deterministic expression parser. No dynamic code generation or property access. */
export type Angle = 'DEG' | 'RAD'
export class CalcError extends Error { constructor(message: string) { super(message); this.name = 'CalcError' } }
export const LIMITS = { characters: 2048, tokens: 512, depth: 48, factorial: 170 } as const
export type ExprNode =
  | { kind: 'number'; value: number }
  | { kind: 'symbol'; name: string }
  | { kind: 'unary'; op: '+' | '-'; value: ExprNode }
  | { kind: 'postfix'; op: '%' | '!'; value: ExprNode }
  | { kind: 'binary'; op: string; left: ExprNode; right: ExprNode }
  | { kind: 'call'; name: string; args: ExprNode[] }
type Token = { text: string; type: 'number' | 'name' | 'operator' | 'end' }
const REAL_FUNCTIONS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'sqrt', 'cbrt', 'nthroot', 'root', 'abs', 'ln', 'log', 'log10', 'logbase', 'exp', 'reciprocal', 'mod', 'rem', 'remainder', 'floor', 'ceil', 'round', 'trunc', 'min', 'max'])
const COMPLEX_EXTRA = new Set(['re', 'im', 'arg', 'conj'])
const SYMBOLS = new Set(['pi', 'e', 'ans', 'm', 'x', 'i'])

/** Display symbols are normalized. Missing trailing parentheses are closed for keypad use. */
export function prepare(raw: string): string {
  if (raw.length > LIMITS.characters) throw new CalcError(`Expression is too long (maximum ${LIMITS.characters} characters)`)
  const expression = raw.trim().replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/π/g, 'pi').replace(/√\s*\(/g, 'sqrt(').replace(/∛\s*\(/g, 'cbrt(')
  let balance = 0
  for (const c of expression) {
    if (c === '(' && ++balance > LIMITS.depth) throw new CalcError('Expression is too deeply nested')
    if (c === ')' && --balance < 0) throw new CalcError('Unbalanced parentheses')
  }
  return expression + ')'.repeat(balance)
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = []
  let at = 0
  while (at < expression.length) {
    if (/\s/.test(expression[at])) { at++; continue }
    const rest = expression.slice(at)
    const numeric = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest)
    if (numeric) { tokens.push({ type: 'number', text: numeric[0] }); at += numeric[0].length }
    else {
      const name = /^[a-zA-Z][a-zA-Z0-9]*/.exec(rest)
      if (name) { tokens.push({ type: 'name', text: name[0].toLowerCase() }); at += name[0].length }
      else if ('+-*/^%!(),'.includes(expression[at])) { tokens.push({ type: 'operator', text: expression[at++] }) }
      else throw new CalcError(`Syntax error: unexpected character “${expression[at]}”`)
    }
    if (tokens.length > LIMITS.tokens) throw new CalcError(`Expression is too complex (maximum ${LIMITS.tokens} tokens)`)
  }
  return [...tokens, { type: 'end', text: '' }]
}

export function parseExpression(raw: string, mode: 'real' | 'complex' = 'real'): ExprNode {
  const expression = prepare(raw)
  if (!expression) throw new CalcError('Enter an expression')
  const tokens = tokenize(expression)
  let at = 0, depth = 0
  const peek = () => tokens[at]
  const take = () => tokens[at++]
  const accept = (text: string) => peek().text === text ? (at++, true) : false
  const required = (text: string) => { if (!accept(text)) throw new CalcError(`Syntax error: expected “${text}”`) }
  const guarded = (read: () => ExprNode): ExprNode => {
    if (++depth > LIMITS.depth) throw new CalcError('Expression is too deeply nested')
    const node = read(); depth--; return node
  }
  const primary = (): ExprNode => guarded(() => {
    const token = take()
    if (token.type === 'number') {
      const value = Number(token.text)
      if (!Number.isFinite(value)) throw new CalcError('Overflow: number exceeds the supported range')
      if (value === 0 && /[1-9]/.test(token.text.split(/[eE]/)[0])) throw new CalcError('Underflow: number is smaller than the supported range')
      return { kind: 'number', value }
    }
    if (token.text === '(') { const value = additive(); required(')'); return value }
    if (token.type === 'name') {
      if (REAL_FUNCTIONS.has(token.text) || (mode === 'complex' && COMPLEX_EXTRA.has(token.text))) {
        required('(')
        const args = [additive()]
        while (accept(',')) { if (args.length >= 8) throw new CalcError('At most 8 function arguments are supported'); args.push(additive()) }
        required(')')
        return { kind: 'call', name: token.text, args }
      }
      if (SYMBOLS.has(token.text) && (mode === 'complex' || token.text !== 'i')) return { kind: 'symbol', name: token.text }
      throw new CalcError(`Unsupported expression: unknown name “${token.text}”`)
    }
    throw new CalcError('Syntax error: enter a number, constant or function')
  })
  const postfix = (): ExprNode => {
    let value = primary()
    while (peek().text === '%' || peek().text === '!') { value = { kind: 'postfix', op: take().text as '%' | '!', value } }
    return value
  }
  const power = (): ExprNode => { const left = postfix(); return accept('^') ? { kind: 'binary', op: '^', left, right: unary() } : left }
  const unary = (): ExprNode => guarded(() => (peek().text === '+' || peek().text === '-') ? { kind: 'unary', op: take().text as '+' | '-', value: unary() } : power())
  const multiplicative = (): ExprNode => {
    let left = unary()
    while (true) {
      let op = ''
      if (['*', '/', 'mod', 'rem'].includes(peek().text)) op = take().text
      else if (peek().type === 'number' || (peek().type === 'name' && !['mod', 'rem'].includes(peek().text)) || peek().text === '(') {
        // A second numeric literal is usually a mistyped decimal, never implicit multiplication.
        if (peek().type === 'number' && tokens[at - 1].type === 'number') throw new CalcError('Syntax error: separate numbers with an operator')
        op = '*'
      }
      else break
      left = { kind: 'binary', op, left, right: unary() }
    }
    return left
  }
  const additive = (): ExprNode => {
    let left = multiplicative()
    while (peek().text === '+' || peek().text === '-') left = { kind: 'binary', op: take().text, left, right: multiplicative() }
    return left
  }
  const result = additive()
  if (peek().type !== 'end') throw new CalcError('Syntax error: unexpected token')
  // Left-associated chains can be deep even without nested parentheses.
  const validateDepth = (node: ExprNode, level: number) => {
    if (level > LIMITS.depth) throw new CalcError('Expression is too deeply nested')
    if (node.kind === 'binary') { validateDepth(node.left, level + 1); validateDepth(node.right, level + 1) }
    else if (node.kind === 'unary' || node.kind === 'postfix') validateDepth(node.value, level + 1)
    else if (node.kind === 'call') node.args.forEach(arg => validateDepth(arg, level + 1))
  }
  validateDepth(result, 0)
  return result
}

export function finite(value: number): number {
  if (Number.isNaN(value)) throw new CalcError('Domain error: result is outside the real-number domain')
  if (!Number.isFinite(value)) throw new CalcError('Overflow: result exceeds the supported range')
  return Object.is(value, -0) ? 0 : value
}
export function factorial(value: number): number {
  if (!Number.isInteger(value) || value < 0) throw new CalcError('Domain error: factorial requires a nonnegative integer')
  if (value > LIMITS.factorial) throw new CalcError('Overflow: factorial is limited to 170!')
  let result = 1
  for (let n = 2; n <= value; n++) result *= n
  return result
}
export function divide(a: number, b: number): number {
  if (b === 0) throw new CalcError('Cannot divide by zero')
  const result = finite(a / b)
  if (a !== 0 && result === 0) throw new CalcError('Underflow: result is smaller than the supported range')
  return result
}
export function multiply(a: number, b: number): number {
  const result = finite(a * b)
  if (a !== 0 && b !== 0 && result === 0) throw new CalcError('Underflow: result is smaller than the supported range')
  return result
}

/** Only exact quadrantal inputs are snapped; tiny nonzero trig values stay nonzero. */
export const trigScope = (angle: Angle) => {
  const scale = angle === 'DEG' ? Math.PI / 180 : 1
  const quadrant = (x: number): number | null => {
    const q = angle === 'DEG' ? x / 90 : x / (Math.PI / 2)
    return Number.isInteger(q) && Math.abs(q) <= Number.MAX_SAFE_INTEGER ? ((q % 4) + 4) % 4 : null
  }
  const checked = (x: number) => {
    if (Math.abs(x) > (angle === 'DEG' ? 1e15 : 1e13)) throw new CalcError('Domain error: angle is too large for reliable trigonometry')
    return x * scale
  }
  return {
    sin: (x: number) => { const radians = checked(x), q = quadrant(x); return q === null ? Math.sin(radians) : [0, 1, 0, -1][q] },
    cos: (x: number) => { const radians = checked(x), q = quadrant(x); return q === null ? Math.cos(radians) : [1, 0, -1, 0][q] },
    tan: (x: number) => { const radians = checked(x), q = quadrant(x); if (q === 1 || q === 3) throw new CalcError('Domain error: tangent is undefined at this angle'); return q === 0 || q === 2 ? 0 : Math.tan(radians) },
    asin: (x: number) => { if (Math.abs(x) > 1) throw new CalcError('Domain error: inverse sine requires −1 ≤ x ≤ 1'); return Math.asin(x) / scale },
    acos: (x: number) => { if (Math.abs(x) > 1) throw new CalcError('Domain error: inverse cosine requires −1 ≤ x ≤ 1'); return Math.acos(x) / scale },
    atan: (x: number) => Math.atan(x) / scale,
  }
}

export function realFunction(name: string, args: number[], angle: Angle): number {
  const unaryNames = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'sqrt', 'cbrt', 'abs', 'ln', 'log10', 'exp', 'reciprocal', 'floor', 'ceil', 'round', 'trunc']
  if ((unaryNames.includes(name) && args.length !== 1) || (['nthroot', 'root', 'logbase', 'mod', 'rem', 'remainder'].includes(name) && args.length !== 2) || (name === 'log' && ![1, 2].includes(args.length))) throw new CalcError(`Syntax error: wrong number of arguments for ${name}`)
  const [a, b] = args
  const trig = trigScope(angle)
  if (name in trig) return finite(trig[name as keyof typeof trig](a))
  switch (name) {
    case 'sqrt': if (a < 0) throw new CalcError('Domain error: square root requires a nonnegative value'); return Math.sqrt(a)
    case 'cbrt': return Math.cbrt(a)
    case 'nthroot': case 'root': {
      if (b === 0) throw new CalcError('Domain error: root degree cannot be zero')
      if (a < 0 && (!Number.isInteger(b) || Math.abs(b % 2) !== 1)) throw new CalcError('Domain error: negative values require an odd integer root')
      if (a === 0 && b < 0) throw new CalcError('Cannot divide by zero')
      const result = finite(a < 0 ? -((-a) ** (1 / b)) : a ** (1 / b))
      if (a !== 0 && result === 0) throw new CalcError('Underflow: result is smaller than the supported range')
      return result
    }
    case 'ln': if (a <= 0) throw new CalcError('Domain error: logarithms require a positive value'); return Math.log(a)
    case 'log10': if (a <= 0) throw new CalcError('Domain error: logarithms require a positive value'); return Math.log10(a)
    case 'log': case 'logbase': {
      const base = args.length === 1 ? 10 : b
      if (a <= 0 || base <= 0 || base === 1) throw new CalcError('Domain error: log requires x > 0, base > 0 and base ≠ 1')
      return base === 10 ? Math.log10(a) : divide(Math.log(a), Math.log(base))
    }
    case 'reciprocal': return divide(1, a)
    case 'mod': {
      if (b === 0) throw new CalcError('Cannot divide by zero')
      const remainder = a % b
      // Adding the divisor unconditionally destroys tiny remainders through cancellation.
      return finite(remainder !== 0 && Math.sign(remainder) !== Math.sign(b) ? remainder + b : remainder)
    }
    case 'rem': case 'remainder': if (b === 0) throw new CalcError('Cannot divide by zero'); return finite(a % b)
    case 'exp': { const result = finite(Math.exp(a)); if (result === 0) throw new CalcError('Underflow: result is smaller than the supported range'); return result }
    case 'abs': return Math.abs(a)
    case 'sinh': return finite(Math.sinh(a))
    case 'cosh': return finite(Math.cosh(a))
    case 'tanh': return Math.tanh(a)
    case 'asinh': return Math.asinh(a)
    case 'acosh': return finite(Math.acosh(a))
    case 'atanh': if (Math.abs(a) >= 1) throw new CalcError('Domain error: inverse hyperbolic tangent requires −1 < x < 1'); return Math.atanh(a)
    case 'floor': return Math.floor(a)
    case 'ceil': return Math.ceil(a)
    case 'round': return Math.round(a)
    case 'trunc': return Math.trunc(a)
    case 'min': return Math.min(...args)
    case 'max': return Math.max(...args)
    default: throw new CalcError('Unsupported expression')
  }
}

export function evaluateReal(node: ExprNode, angle: Angle = 'DEG', scope: { ans?: number; m?: number; x?: number } = {}): number {
  const run = (value: ExprNode): number => {
    switch (value.kind) {
      case 'number': return value.value
      case 'symbol': {
        if (value.name === 'pi') return Math.PI
        if (value.name === 'e') return Math.E
        const result = scope[value.name as keyof typeof scope]
        if (result === undefined) throw new CalcError(`Unsupported expression: ${value.name === 'x' ? 'x is available in graph mode' : 'unknown variable'}`)
        return finite(result)
      }
      case 'unary': return value.op === '-' ? -run(value.value) : run(value.value)
      case 'postfix': { const a = run(value.value); return value.op === '%' ? divide(a, 100) : factorial(a) }
      case 'call': return finite(realFunction(value.name, value.args.map(run), angle))
      case 'binary': {
        const a = run(value.left), b = run(value.right)
        const percent = value.right.kind === 'postfix' && value.right.op === '%'
        switch (value.op) {
          case '+': return finite(a + (percent ? multiply(a, b) : b))
          case '-': return finite(a - (percent ? multiply(a, b) : b))
          case '*': return multiply(a, b)
          case '/': return divide(a, b)
          case 'mod': return realFunction('mod', [a, b], angle)
          case 'rem': return realFunction('rem', [a, b], angle)
          case '^': {
            if (a === 0 && b < 0) throw new CalcError('Cannot divide by zero')
            const result = finite(a ** b)
            if (a !== 0 && result === 0) throw new CalcError('Underflow: result is smaller than the supported range')
            return result
          }
          default: throw new CalcError('Unsupported expression')
        }
      }
    }
  }
  return finite(run(node))
}

export function calculate(raw: string, angle: Angle = 'DEG', ans = 0, mem = 0): number {
  return evaluateReal(parseExpression(raw), angle, { ans, m: mem })
}

/** Display rounds to 12 significant digits; calculations retain IEEE-754 binary64 precision. */
export function fmt(n: number, precision = 12): string {
  if (!Number.isFinite(n)) return 'Undefined'
  if (n === 0) return '0'
  const digits = Number.isFinite(precision) ? Math.min(15, Math.max(1, Math.trunc(precision))) : 12
  const value = Number(n.toPrecision(digits))
  // At the upper range boundary rounding can exceed MAX_VALUE; retain the finite value.
  if (!Number.isFinite(value)) return n.toString()
  if (Math.abs(value) < 1e-9 || Math.abs(value) >= 1e15) return value.toExponential().replace(/e\+/, 'e+')
  return String(value)
}

/** Parses once; graph domain/overflow points return NaN to break curves safely. */
export function compileFn(raw: string, angle: Angle) {
  const node = parseExpression(raw)
  const check = (value: ExprNode) => {
    if (value.kind === 'symbol' && ['ans', 'm'].includes(value.name)) throw new CalcError('Graph functions may use x, pi and e only')
    if (value.kind === 'call') value.args.forEach(check)
    if (value.kind === 'binary') { check(value.left); check(value.right) }
    if (value.kind === 'unary' || value.kind === 'postfix') check(value.value)
  }
  check(node)
  return (x: number): number => { try { return evaluateReal(node, angle, { x }) } catch { return NaN } }
}
