import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { calculate, fmt, type Angle } from './engine/calc'
import { copy, useStored } from './useStored'
import { notify } from './storage'
import { Icon } from './Icon'

type Item = { id: string | number; expr: string; res: string; value?: string; time?: number; fav: boolean }
const validHistory = (v: unknown): v is Item[] => Array.isArray(v) && v.length <= 500 && v.every(h => h && typeof h === 'object' && ['string','number'].includes(typeof h.id) && typeof h.expr === 'string' && h.expr.length <= 2048 && typeof h.res === 'string' && h.res.length <= 128 && typeof h.fav === 'boolean' && (h.value === undefined || typeof h.value === 'string' && h.value.length <= 128 && Number.isFinite(Number(h.value))) && (h.time === undefined || Number.isFinite(h.time) && h.time >= 0 && h.time <= 8640000000000000))
const SCI: [string, string, string][] = [
  ['sin','sin(','Sine'], ['cos','cos(','Cosine'], ['tan','tan(','Tangent'], ['sin⁻¹','asin(','Inverse sine'], ['cos⁻¹','acos(','Inverse cosine'], ['tan⁻¹','atan(','Inverse tangent'],
  ['sinh','sinh(','Hyperbolic sine'], ['cosh','cosh(','Hyperbolic cosine'], ['tanh','tanh(','Hyperbolic tangent'], ['ln','ln(','Natural logarithm'], ['log','log(','Base 10 logarithm'], ['logᵦ','logbase(','Arbitrary base logarithm'],
  ['x²','^2','Square'], ['x³','^3','Cube'], ['xʸ','^','Power'], ['√','sqrt(','Square root'], ['∛','cbrt(','Cube root'], ['ⁿ√','nthRoot(','Nth root'],
  ['eˣ','exp(','Exponential'], ['n!','!','Factorial'], ['|x|','abs(','Absolute value'], ['1/x','reciprocal(','Reciprocal'], ['mod',' mod ','Modulus'], ['rem',' rem ','Remainder'],
]
const MAIN = ['AC','CE','⌫','÷','7','8','9','×','4','5','6','−','1','2','3','+','±','0','.','=']
const NAMES: Record<string,string> = { AC:'All clear', CE:'Clear entry', '⌫':'Backspace', '÷':'Divide', '×':'Multiply', '−':'Subtract', '+':'Add', '±':'Change sign', '.':'Decimal point', '=':'Equals', '(':'Open parenthesis', ')':'Close parenthesis', '%':'Percent', 'π':'Pi', 'e':'Euler constant', 'Ans':'Answer recall', ',':'Argument separator' }
const TOKEN_BACKSPACE = /(nthRoot|logbase|reciprocal|sinh|cosh|tanh|asin|acos|atan|sqrt|cbrt|exp|sin|cos|tan|log|ln|abs)\($|Ans$| mod $| rem $|.$/
export function clearEntry(expr: string): string {
  const text = expr.trimEnd()
  if (text.endsWith(')')) {
    let balance = 1, i = text.length - 2
    while (i >= 0 && balance) { if (text[i] === ')') balance++; if (text[i] === '(') balance--; i-- }
    while (i >= 0 && /[a-zA-Z]/.test(text[i])) i--
    return text.slice(0, i+1)
  }
  return text.replace(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$|Ans$|M$|π$|e$|.$/, '')
}
export function Calculator() {
  const [expr, setExpr] = useStored('cp.draft', '', (v): v is string => typeof v === 'string' && v.length <= 2048)
  const [angle, setAngle] = useStored<Angle>('cp.angle', 'DEG', (v): v is Angle => v === 'DEG' || v === 'RAD')
  const [sci, setSci] = useStored('cp.sci', true)
  const [ans, setAns] = useStored('cp.ans', 0)
  const [mem, setMem] = useStored('cp.mem', 0)
  const [history, setHistory] = useStored<Item[]>('cp.hist', [], validHistory)
  const [last, setLast] = useState<number | null>(null)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState(false)
  const [undoCount, setUndoCount] = useState(0)
  const undos = useRef<string[]>([])
  const input = useRef<HTMLInputElement>(null)
  const pendingCaret = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (pendingCaret.current !== null) {
      const position = pendingCaret.current
      pendingCaret.current = null
      input.current?.setSelectionRange(position, position)
    }
  }, [expr])
  const preview = useMemo(() => { if (!expr || done) return ''; try { return fmt(calculate(expr, angle, ans, mem)) } catch { return '' } }, [expr, angle, ans, mem, done])
  const change = (next: string, caret?: number) => {
    if (next.length > 2048) { setError('Expression is too long (maximum 2048 characters)'); return }
    pendingCaret.current = next === expr ? null : caret ?? null
    undos.current = [...undos.current.slice(-79), expr]; setUndoCount(undos.current.length)
    setExpr(next); setDone(false); setError('')
  }
  const undo = () => { const previous = undos.current.pop(); if (previous !== undefined) { setExpr(previous); setDone(false); setError(''); setUndoCount(undos.current.length) } }
  const run = () => {
    try {
      const n = calculate(expr, angle, ans, mem)
      setLast(n); setAns(n); setDone(true); setError('')
      setHistory(h => [{ id: crypto.randomUUID(), time: Date.now(), expr, res: fmt(n), value: String(n), fav: false }, ...h].slice(0,500))
    } catch (e) { setError((e as Error).message) }
  }
  const insert = (text: string) => {
    const current = input.current
    const start = current?.selectionStart ?? expr.length, end = current?.selectionEnd ?? expr.length
    const operator = ['+','−','-','×','*','÷','/','^','!','%',' mod ',' rem '].includes(text)
    const pos = done ? (operator ? String(last ?? ans).length : 0) + text.length : start + text.length
    if (done) change(operator ? String(last ?? ans) + text : text, pos)
    else change(expr.slice(0,start) + text + expr.slice(end), pos)
  }
  const press = (key: string) => {
    if (key === 'AC') { change(''); setLast(null) }
    else if (key === 'CE') change(clearEntry(expr))
    else if (key === '⌫') {
      const start = input.current?.selectionStart ?? expr.length, end = input.current?.selectionEnd ?? expr.length
      if (start !== end) change(expr.slice(0,start) + expr.slice(end), start)
      else { const prefix = expr.slice(0,start), next = prefix.replace(TOKEN_BACKSPACE,''); change(next + expr.slice(end), next.length) }
    } else if (key === '=') run()
    else if (key === '±') change(expr.startsWith('-(') && expr.endsWith(')') ? expr.slice(2,-1) : `-(${done ? String(last ?? ans) : expr || '0'})`)
    else insert(key)
  }
  const memory = (operation: string) => {
    if (operation === 'MC') { setMem(0); return }
    if (operation === 'MR') { insert('M'); return }
    try {
      const value = done && last !== null ? last : expr ? calculate(expr, angle, ans, mem) : ans
      const next = operation === 'M+' ? mem + value : mem - value
      if (!Number.isFinite(next)) throw new Error('Overflow: memory exceeds the supported range')
      setMem(next); setError('')
    } catch (e) { setError((e as Error).message) }
  }
  const paste = async () => { try { const text = await navigator.clipboard.readText(); change(text.trim()); input.current?.focus() } catch { notify('Paste permission is unavailable. Focus the expression and use Ctrl/⌘ V.') } }
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return
      const target = event.target as HTMLElement
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && (target === input.current || !['INPUT','TEXTAREA','SELECT'].includes(target.tagName))) { event.preventDefault(); undo(); return }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (['INPUT','TEXTAREA','SELECT'].includes(target.tagName)) return
      if (target.tagName === 'BUTTON' && ['Enter',' '].includes(event.key)) return
      if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); run() }
      else if (event.key === 'Escape') { event.preventDefault(); press('AC') }
      else if (event.key === 'Backspace' || event.key === 'Delete') { event.preventDefault(); press('⌫') }
      else if (/^[0-9a-zA-Z.+\-*/^%!(),]$/.test(event.key)) { event.preventDefault(); insert(event.key) }
    }
    window.addEventListener('keydown', keyboard)
    return () => window.removeEventListener('keydown', keyboard)
  })
  const shown = history.filter(h => (!favorites || h.fav) && `${h.expr} ${h.res}`.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="calc">
      <section className="panel calculator-panel" aria-label="Scientific calculator">
        <div className="calc-toolbar"><div className="segment"><button aria-pressed={!sci} onClick={() => setSci(false)}>Standard</button><button aria-pressed={sci} onClick={() => setSci(true)}>Scientific keys</button></div><button className="angle-button" aria-label="Angle unit" onClick={() => setAngle(angle === 'DEG' ? 'RAD' : 'DEG')}>{angle}<span>⌄</span></button></div>
        <div className="display-card"><div className="display-meta"><span>EXPRESSION</span><span className="memory-status" aria-label="Memory status">{mem !== 0 ? `M = ${fmt(mem)}` : 'M empty'}</span></div>
          <input ref={input} className="disp" aria-label="Expression" value={expr} placeholder="0" maxLength={2048} autoComplete="off" spellCheck={false} onChange={e => change(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); run() } else if (e.key === 'Escape') { e.preventDefault(); press('AC') } }} />
          <div className={`answer ${error ? 'has-error' : ''}`} role="status" aria-live="polite" aria-label="Calculation result">{error ? <span className="err">{error}</span> : <><span className="equals-mark">=</span><output>{done && last !== null ? fmt(last) : preview || '0'}</output></>}</div>
          <div className="display-actions"><span>{done ? 'Calculated' : preview ? 'Live preview' : 'Ready when you are'}</span><div><button aria-label="Copy expression" onClick={() => void copy(expr)} disabled={!expr}>Copy expression</button><button aria-label="Paste expression" onClick={() => void paste()}>Paste</button><button aria-label="Copy result" disabled={!preview && !(done && last !== null)} onClick={() => void copy(done && last !== null ? fmt(last) : preview)}>⧉ Result</button></div></div>
        </div>
        <div className="memory-toolbar"><div className="memrow">{['MC','MR','M+','M−'].map(key => <button key={key} onClick={() => memory(key)} aria-label={{MC:'Memory clear',MR:'Memory recall','M+':'Memory add','M−':'Memory subtract'}[key]}>{key}</button>)}</div><button className="undo-button" onClick={undo} disabled={!undoCount} aria-label="Undo">↶ <span>Undo</span></button></div>
        <div className="pad constants">{['(',')','%','π','e','Ans',','].map(key => <button key={key} aria-label={NAMES[key]} onClick={() => press(key)}>{key}</button>)}</div>
        {sci && <div className="pad scientific-pad">{SCI.map(([label,token,name]) => <button key={name} aria-label={name} onClick={() => press(token)}>{label}</button>)}</div>}
        <div className="pad c4 main-pad">{MAIN.map(key => <button key={key} className={key === '=' ? 'eq' : '÷×−+'.includes(key) ? 'op' : ['AC','CE','⌫'].includes(key) ? 'utility' : 'number'} aria-label={NAMES[key]} onClick={() => press(key)}>{key}</button>)}</div>
        <div className="keypad-hint"><span className="keycap">↵</span> to calculate <span>·</span><span className="keycap">esc</span> to clear<span className="precision-label">12-digit display</span></div>
      </section>
      <aside className="panel hist" aria-label="Calculation history"><div className="section-heading"><h2><Icon name="history" />History</h2><span className="badge">{history.length}</span></div><p className="mu">Good thinking deserves a second look.</p>
        <input type="search" aria-label="Search history" placeholder="Search calculations…" value={query} onChange={e => setQuery(e.target.value)} />
        <div className="history-filters"><button aria-pressed={!favorites} onClick={() => setFavorites(false)}>All calculations</button><button aria-pressed={favorites} onClick={() => setFavorites(true)}>★ Favorites</button><button className="clear-history" disabled={!history.length} onClick={() => setHistory([])} aria-label="Clear all history">Clear all</button></div>
        {!shown.length && <div className="history-empty"><span>↶</span><h3>{history.length ? 'No matches this time.' : 'Your next idea starts here.'}</h3><p>{history.length ? 'Try another search or view all calculations.' : 'Calculations you make are saved here, ready to revisit.'}</p></div>}
        <ul>{shown.map(h => <li key={h.id} className="history-entry"><div className="history-entry-top"><time>{new Date(h.time ?? (typeof h.id === 'number' ? Math.floor(h.id) : 0)).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</time><button aria-label="Favorite calculation" aria-pressed={h.fav} onClick={() => setHistory(history.map(x => x.id === h.id ? {...x,fav:!x.fav} : x))}>{h.fav ? '★' : '☆'}</button></div><button className="hbtn" aria-label={`Reuse expression ${h.expr}`} onClick={() => change(h.expr)}><span>{h.expr}</span><b>= {h.res}</b></button><div className="history-entry-actions"><button aria-label={`Reuse result ${h.res}`} onClick={() => change(h.value || h.res)}>Use result <Icon name="arrow" size={13}/></button><button aria-label="Copy history result" onClick={() => void copy(h.res)}>Copy</button><button aria-label="Delete calculation" onClick={() => setHistory(history.filter(x => x.id !== h.id))}>Delete</button></div></li>)}</ul>
        <div className="history-footnote"><span className="status-dot"/>Saved on this device · Up to 500 entries</div>
      </aside>
    </div>
  )
}
