import { useState } from 'react'
import { fmt } from './engine/calc'
import { addMatrices, calculateComplex, determinant, formatComplex, formatMatrix, inverseMatrix, multiplyMatrices, parseMatrix, solveMatrix, transpose, type Matrix } from './engine/engineering'
import { copy, useStored } from './useStored'

type Operation = 'A + B' | 'A − B' | 'A × B' | 'Transpose A' | 'Determinant A' | 'Inverse A' | 'Solve AX = B'
const OPERATIONS: Operation[] = ['A + B', 'A − B', 'A × B', 'Transpose A', 'Determinant A', 'Inverse A', 'Solve AX = B']

export function Engineering() {
  const [mode, setMode] = useStored<'complex' | 'matrix'>('cp.eng.mode', 'complex', (value): value is 'complex' | 'matrix' => value === 'complex' || value === 'matrix')
  const [expression, setExpression] = useStored('cp.eng.expression', '(3+2i)*(1-i)')
  const [a, setA] = useStored('cp.eng.a', '1 2\n3 4')
  const [b, setB] = useStored('cp.eng.b', '5 6\n7 8')
  const [result, setResult] = useState('')
  const [matrix, setMatrix] = useState<Matrix | null>(null)
  const [error, setError] = useState('')
  const [operation, setOperation] = useState('')
  const [notice, setNotice] = useState('')
  const clearOutput = () => { setResult(''); setMatrix(null); setError(''); setNotice('') }
  const fail = (e: unknown) => { setError(e instanceof Error ? e.message : 'Unable to calculate this expression'); setResult(''); setMatrix(null) }
  const complex = () => {
    try { setResult(formatComplex(calculateComplex(expression))); setMatrix(null); setError(''); setOperation('Complex result') } catch (e) { fail(e) }
  }
  const runMatrix = (op: Operation) => {
    try {
      const left = parseMatrix(a)
      let out: Matrix | number
      switch (op) {
        case 'A + B': out = addMatrices(left, parseMatrix(b)); break
        case 'A − B': out = addMatrices(left, parseMatrix(b), true); break
        case 'A × B': out = multiplyMatrices(left, parseMatrix(b)); break
        case 'Transpose A': out = transpose(left); break
        case 'Determinant A': out = determinant(left); break
        case 'Inverse A': out = inverseMatrix(left); break
        case 'Solve AX = B': out = solveMatrix(left, parseMatrix(b)); break
      }
      setMatrix(typeof out === 'number' ? null : out)
      setResult(typeof out === 'number' ? fmt(out) : formatMatrix(out)); setError(''); setOperation(op); setNotice('')
    } catch (e) { fail(e) }
  }
  const copyResult = async () => { const copied = await copy(result); setNotice(copied ? 'Result copied' : 'Clipboard unavailable. Select the result and copy it manually.') }

  return (
    <section className="panel engineering" aria-label="Engineering calculator">
      <div className="section-heading"><div><p className="eyebrow">ENGINEERING WORKSPACE</p><h2>Complex numbers &amp; matrices</h2></div></div>
      <div className="bar segmented" aria-label="Engineering tools">
        <button aria-pressed={mode === 'complex'} onClick={() => { setMode('complex'); clearOutput() }}>Complex numbers</button>
        <button aria-pressed={mode === 'matrix'} onClick={() => { setMode('matrix'); clearOutput() }}>Matrices</button>
      </div>
      {mode === 'complex' ? <>
        <p className="mu">Use i, π, e, parentheses and scientific functions. Angles use radians; roots and logarithms use principal complex branches.</p>
        <label>Complex expression<input aria-label="Complex expression" maxLength={2048} autoComplete="off" spellCheck={false} value={expression} onChange={e => { setExpression(e.target.value); clearOutput() }} onKeyDown={e => { if (e.key === 'Enter') complex() }} /></label>
        <div className="bar">
          <button className="eq" onClick={complex}>Calculate complex</button>
          <button onClick={() => { setExpression(''); clearOutput() }}>Clear expression</button>
        </div>
        <details><summary>Complex function reference</summary><p className="mu">Arithmetic: + − × ÷ ^. Functions: sqrt, cbrt, nthRoot(x,n), exp, ln, log, logbase(x,b), sin, cos, tan, asin, acos, atan, sinh, cosh, tanh, asinh, acosh, atanh, abs, arg, re, im, conj. Example: sqrt(-1) = i; conj(3+2i) = 3 − 2i. arg returns radians. Factorial requires a real nonnegative integer ≤ 170.</p></details>
      </> : <>
        <p className="mu">Enter up to 4 × 4 real matrices. Separate cells with spaces or commas and rows with newlines or semicolons. For AX = B, put the right-hand vector or matrix in B.</p>
        <div className="grid2 matrix-inputs">
          <label>Matrix A<textarea aria-label="Matrix A" maxLength={2048} rows={5} spellCheck={false} value={a} onChange={e => { setA(e.target.value); clearOutput() }} /></label>
          <label>Matrix B<textarea aria-label="Matrix B" maxLength={2048} rows={5} spellCheck={false} value={b} onChange={e => { setB(e.target.value); clearOutput() }} /></label>
        </div>
        <div className="matrix-operations bar">{OPERATIONS.map(op => <button key={op} onClick={() => runMatrix(op)}>{op}</button>)}</div>
        <p className="mu">Partial pivoting is used for determinants, inverses and solutions. Singular or numerically unstable systems show an error.</p>
      </>}
      {error ? <p className="err" role="alert">{error}</p> : result && <div className="engineering-result" aria-live="polite">
        <p className="eyebrow">{operation}</p>
        {matrix ? <div className="matrix-scroll"><table aria-label="Matrix result"><tbody>{matrix.map((row, i) => <tr key={i}>{row.map((value, j) => <td key={j}>{fmt(value)}</td>)}</tr>)}</tbody></table></div> : <output aria-label="Engineering result">{result}</output>}
        <div className="bar"><button aria-label="Copy engineering result" onClick={copyResult}>Copy result</button>{matrix && <button onClick={() => { setA(formatMatrix(matrix)); clearOutput() }}>Use result as A</button>}</div>
      </div>}
      {notice && <p className="mu" role="status">{notice}</p>}
      <p className="mu">Numerics: IEEE-754 binary64; up to 12 significant display digits. Complex results and matrices are approximate, with no arbitrary-precision claim.</p>
    </section>
  )
}
