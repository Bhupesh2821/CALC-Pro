import { useState, type KeyboardEvent } from 'react'
import { apply, not, parseWord, show, toggleBit, wordRange, wrap, type Base, type Bits, type Op } from './engine/programmer'
import { copy, useStored } from './useStored'

const OPS: Op[] = ['AND', 'OR', 'XOR', 'NAND', 'NOR', 'MOD', '<<', '>>', '+', '-', '×', '÷']
const NAME: Record<number, string> = { 16: 'HEX', 10: 'DEC', 8: 'OCT', 2: 'BIN' }
const KEYMAP: Record<string, Op> = { '+': '+', '-': '-', '*': '×', '/': '÷', '&': 'AND', '|': 'OR', '^': 'XOR', '%': 'MOD', '<': '<<', '>': '>>' }
type Prefs = { bits: Bits; base: Base; signed: boolean }
type Entry = { id: string; time: number; expression: string; decimal: string; hex: string; bits: Bits; signed: boolean; favorite: boolean }
const validEntry = (entry: unknown): entry is Entry => {
  if (!entry || typeof entry !== 'object') return false
  const e = entry as Entry
  return typeof e.id === 'string' && e.id.length > 0 && e.id.length <= 128 && Number.isFinite(e.time) && e.time >= 0 && e.time <= 8640000000000000 && typeof e.expression === 'string' && e.expression.length <= 512 && typeof e.decimal === 'string' && /^-?\d{1,21}$/.test(e.decimal) && typeof e.hex === 'string' && /^[0-9A-F]{1,16}$/.test(e.hex) && [8, 16, 32, 64].includes(e.bits) && typeof e.signed === 'boolean' && typeof e.favorite === 'boolean'
}

export function Programmer() {
  const [storedPrefs, setPrefs] = useStored<Prefs>('cp.prog.prefs', { bits: 32, base: 10, signed: true })
  const prefs: Prefs = { bits: [8, 16, 32, 64].includes(storedPrefs?.bits) ? storedPrefs.bits : 32, base: [2, 8, 10, 16].includes(storedPrefs?.base) ? storedPrefs.base : 10, signed: typeof storedPrefs?.signed === 'boolean' ? storedPrefs.signed : true }
  const { bits, base, signed } = prefs
  const [raw, setRaw] = useState('0')
  const [acc, setAcc] = useState<bigint | null>(null)
  const [op, setOp] = useState<Op | null>(null)
  const [fresh, setFresh] = useState(true)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState('')
  const [storedHistory, setHistory] = useStored<Entry[]>('cp.prog.history', [])
  const history = Array.isArray(storedHistory) ? storedHistory.filter(validEntry).slice(0, 500) : []
  const [query, setQuery] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  let value: bigint | null = null, inputError = ''
  try { value = parseWord(raw, base, bits, signed) } catch (error) { inputError = (error as Error).message }
  const range = wordRange(bits, signed)

  const current = () => parseWord(raw, base, bits, signed)
  const guard = (action: () => void) => { try { setErr(''); setNotice(''); action() } catch (error) { setErr((error as Error).message) } }
  const display = (next: bigint) => { setRaw(show(next, bits, base, signed)); setFresh(true) }
  const record = (expression: string, result: bigint) => {
    const entry: Entry = { id: crypto.randomUUID(), time: Date.now(), expression, decimal: show(result, bits, 10, signed), hex: show(result, bits, 16, signed), bits, signed, favorite: false }
    setHistory([entry, ...history].slice(0, 500))
  }
  const digit = (digitValue: number) => {
    if (digitValue >= base) return
    setErr(''); setNotice('')
    const digitText = digitValue.toString(base).toUpperCase()
    setRaw(text => (fresh || text === '0' ? digitText : text.length < 256 ? text + digitText : text))
    setFresh(false)
  }
  const eq = () => guard(() => {
    const v = current()
    const result = op && acc !== null ? apply(op, acc, v, bits, signed) : v
    const expression = op && acc !== null ? `${show(acc, bits, base, signed)} ${op} ${show(v, bits, base, signed)} [${NAME[base]}]` : `${raw} [${NAME[base]}]`
    record(expression, result)
    display(result); setOp(null); setAcc(null)
  })
  const pick = (nextOp: Op) => guard(() => {
    const v = current()
    const next = op && acc !== null && !fresh ? apply(op, acc, v, bits, signed) : v
    if (op && acc !== null && !fresh) record(`${show(acc, bits, base, signed)} ${op} ${show(v, bits, base, signed)} [${NAME[base]}]`, next)
    display(next); setAcc(next); setOp(nextOp)
  })
  const clear = () => { setRaw('0'); setAcc(null); setOp(null); setFresh(true); setErr(''); setNotice('') }
  const erase = () => { setRaw(text => text.length > 1 ? text.slice(0, -1) : '0'); setFresh(false); setErr('') }
  const unary = (label: string, operation: (v: bigint) => bigint) => guard(() => { const v = current(), next = operation(v); record(`${label} ${show(v, bits, base, signed)} [${NAME[base]}]`, next); display(next) })
  const changePrefs = (next: Prefs) => guard(() => {
    const v = current()
    setPrefs(next)
    setRaw(show(v, next.bits, next.base, next.signed))
    setAcc(acc === null ? null : wrap(acc, next.bits, next.signed))
    setFresh(true)
  })
  const copyValue = async (text: string) => { const ok = await copy(text); setNotice(ok === false ? 'Clipboard unavailable. Select and copy the value.' : 'Value copied') }
  const key = (event: KeyboardEvent) => {
    if (event.target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName)) {
      if (event.target instanceof HTMLInputElement && event.target.getAttribute('aria-label') === 'Programmer input' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); eq() }
        else if (event.key === 'Escape') { event.preventDefault(); clear() }
        else if (event.key === '~') { event.preventDefault(); unary('NOT', v => not(v, bits, signed)) }
        else if (KEYMAP[event.key]) {
          if (event.key === '-' && (fresh && raw === '0' || event.target.selectionStart === 0 && event.target.selectionEnd === raw.length)) { event.preventDefault(); setRaw('-'); setFresh(false) }
          else { event.preventDefault(); pick(KEYMAP[event.key]) }
        } else if (/^[0-9A-F]$/i.test(event.key) && fresh) { event.preventDefault(); digit(parseInt(event.key, 16)) }
      }
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.target instanceof HTMLButtonElement && ['Enter', ' '].includes(event.key)) return
    const k = event.key.toUpperCase(), d = /^[0-9A-F]$/.test(k) ? parseInt(k, 16) : NaN
    if (!Number.isNaN(d)) { if (d >= base) { setErr(`Digit ${k} is not valid in ${NAME[base]}`); return } digit(d) }
    else if (k === 'ENTER' || k === '=') eq()
    else if (k === 'BACKSPACE' || k === 'DELETE') erase()
    else if (k === 'ESCAPE') clear()
    else if (KEYMAP[event.key]) pick(KEYMAP[event.key])
    else if (event.key === '~') unary('NOT', v => not(v, bits, signed))
    else return
    event.preventDefault()
  }
  const shownHistory = history.filter(item => (!favoritesOnly || item.favorite) && `${item.expression} ${item.decimal} ${item.hex}`.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="calc programmer-layout" onKeyDown={key}>
      <section className="panel" tabIndex={0} aria-label="Programmer calculator">
        <div className="section-head"><div><p className="eyebrow">INTEGER WORKSPACE</p><h2>Every bit, accounted for.</h2></div><span className="badge">BigInt · exact</span></div>
        <div className="bar" role="group" aria-label="Word size">
          {([8, 16, 32, 64] as Bits[]).map(b => <button key={b} aria-pressed={bits === b} onClick={() => changePrefs({ ...prefs, bits: b })}>{b}-bit</button>)}
        </div>
        <div className="bar" role="group" aria-label="Integer interpretation">
          <button aria-pressed={signed} onClick={() => changePrefs({ ...prefs, signed: true })}>Signed</button>
          <button aria-pressed={!signed} onClick={() => changePrefs({ ...prefs, signed: false })}>Unsigned</button>
          <span className="mu">{signed ? 'Two’s complement' : 'Modulo 2ⁿ'}</span>
        </div>
        <label>Integer input · {NAME[base]}
          <input className="disp" aria-label="Programmer input" value={raw} maxLength={256} spellCheck={false} autoComplete="off" aria-invalid={!!inputError} onChange={e => { setRaw(e.target.value); setFresh(false); setErr(''); setNotice('') }} />
        </label>
        <div className="pending mu" aria-label="Pending operation">{op && acc !== null ? `${show(acc, bits, base, signed)} ${op}` : `${bits}-bit ${signed ? 'signed' : 'unsigned'} integer`}</div>
        {[16, 10, 8, 2].map(b => (
          <div key={b} className={'row' + (b === base ? ' on' : '')}>
            <button aria-pressed={b === base} onClick={() => changePrefs({ ...prefs, base: b as Base })}>{NAME[b]}</button>
            <code aria-label={`${NAME[b]} value`}>{value === null ? '—' : show(value, bits, b, signed)}</code>
            <button disabled={value === null} aria-label={`Copy ${NAME[b]}`} onClick={() => void copyValue(value === null ? '' : show(value, bits, b, signed))}>⧉</button>
          </div>
        ))}
        <div className="out" role="status" aria-live="polite">{err || inputError ? <span className="err">{err || inputError}</span> : notice ? <span>{notice}</span> : <span className="mu">Overflow wraps modulo 2^{bits}.</span>}</div>
        <div className="pad c6">{OPS.map(operation => <button key={operation} className="op" aria-label={operation === '<<' ? 'Shift left' : operation === '>>' ? 'Shift right' : undefined} onClick={() => pick(operation)}>{operation}</button>)}</div>
        <div className="pad c4">{'FEDCBA9876543210'.split('').map(character => <button key={character} disabled={parseInt(character, 16) >= base} onClick={() => digit(parseInt(character, 16))}>{character}</button>)}</div>
        <div className="pad c4">
          <button onClick={clear} aria-label="All clear">AC</button>
          <button onClick={erase} aria-label="Backspace">⌫</button>
          <button onClick={() => unary('NOT', v => not(v, bits, signed))}>NOT</button>
          <button onClick={() => unary('Negate', v => wrap(-v, bits, signed))} aria-label="Negate">±</button>
          <button className="eq wide" onClick={eq} aria-label="Equals">=</button>
        </div>
        <details className="bit-details" open><summary>Bit inspector · toggle a bit</summary>
          <div className="bit-grid" role="group" aria-label="Interactive bits">{Array.from({ length: bits }, (_, index) => bits - 1 - index).map(bit => {
            const on = value !== null && (BigInt.asUintN(bits, value) & (1n << BigInt(bit))) !== 0n
            return <button key={bit} disabled={value === null} aria-label={`Bit ${bit}`} aria-pressed={on} onClick={() => unary(`Toggle bit ${bit} of`, v => toggleBit(v, bit, bits, signed))}><small>{bit}</small><strong>{on ? '1' : '0'}</strong></button>
          })}</div>
        </details>
        <p className="mu">Range {range.min.toString()} to {range.max.toString()}. Division truncates toward zero. Right shift is {signed ? 'arithmetic (preserves sign)' : 'logical (fills with zero)'}. Shift counts: 0–{bits - 1}.</p>
        <p className="mu">Keyboard: 0–9, A–F, + − * / &amp; | ^ % ~, &lt; / &gt; shift, Enter, Backspace and Esc. Paste an integer into the input.</p>
      </section>
      <aside className="panel hist" aria-label="Programmer history">
        <div className="section-head"><h2>Programmer history</h2><span className="badge">{history.length} entries</span></div>
        <input type="search" aria-label="Search programmer history" placeholder="Search decimal, hex or expression…" value={query} onChange={event => setQuery(event.target.value)} />
        <div className="bar"><button aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}>★ Favorites</button><button disabled={!history.length} onClick={() => setHistory([])}>Clear programmer history</button></div>
        {!shownHistory.length && <p className="mu">{history.length ? 'No matching calculations.' : 'Your exact integer calculations appear here in DEC and HEX.'}</p>}
        <ul>{shownHistory.map(item => <li key={item.id} className="history-entry">
          <div className="history-content"><time dateTime={new Date(item.time).toISOString()}>{new Date(item.time).toLocaleString()}</time><span className="mu">{item.bits}-bit · {item.signed ? 'signed' : 'unsigned'}</span><p>{item.expression}</p><button className="hbtn" aria-label={`Reuse programmer result ${item.decimal}`} onClick={() => { setPrefs({ bits: item.bits, base: 10, signed: item.signed }); setRaw(item.decimal); setAcc(null); setOp(null); setFresh(true); setErr('') }}><b>DEC {item.decimal}</b><code>HEX {item.hex}</code></button></div>
          <div className="history-actions"><button aria-label="Favorite programmer calculation" aria-pressed={!!item.favorite} onClick={() => setHistory(history.map(entry => entry.id === item.id ? { ...entry, favorite: !entry.favorite } : entry))}>{item.favorite ? '★' : '☆'}</button><button aria-label="Copy programmer result" onClick={() => void copyValue(`DEC ${item.decimal} · HEX ${item.hex}`)}>⧉</button><button aria-label="Delete programmer calculation" onClick={() => setHistory(history.filter(entry => entry.id !== item.id))}>×</button></div>
        </li>)}</ul>
      </aside>
    </div>
  )
}
