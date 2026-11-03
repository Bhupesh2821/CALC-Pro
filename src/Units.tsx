import { useState } from 'react'
import { UNITS, UNIT_NAMES, convertText, parseConversionInput } from './engine/units'
import { copy, useStored } from './useStored'

type Selection = { category: string; from: string; to: string; precision: number }
const DEFAULT: Selection = { category: 'Length', from: 'm', to: 'ft', precision: 12 }
export function Units() {
  const [storedSelection, setSelection] = useStored<Selection>('cp.units.selection', DEFAULT)
  const category = storedSelection && typeof storedSelection.category === 'string' && Object.hasOwn(UNITS, storedSelection.category) ? storedSelection.category : DEFAULT.category
  const units = UNITS[category]
  const from = units.includes(storedSelection?.from) ? storedSelection.from : units[0]
  const to = units.includes(storedSelection?.to) ? storedSelection.to : units[1]
  const precision = [6, 9, 12, 15].includes(storedSelection?.precision) ? storedSelection.precision : 12
  const selection = { category, from, to, precision }
  const [value, setValue] = useState('1')
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  let output = '', error = ''
  try { output = convertText(category, parseConversionInput(value), from, to, precision) } catch (cause) { error = (cause as Error).message }
  const bad = !!error
  const matches = (unit: string) => {
    const text = `${unit} ${UNIT_NAMES[unit] || ''}`.toLowerCase()
    const query = search.trim().toLowerCase()
    return text.includes(query) || text.replace(/metre/g, 'meter').replace(/litre/g, 'liter').includes(query)
  }
  const matchingUnits = units.filter(matches)
  const optionLabel = (unit: string) => UNIT_NAMES[unit] ? `${unit} · ${UNIT_NAMES[unit]}` : unit
  const options = (selected: string) => Array.from(new Set([selected, ...matchingUnits]))
  const pickCategory = (next: string) => { setSelection({ ...selection, category: next, from: UNITS[next][0], to: UNITS[next][1] }); setSearch(''); setNotice('') }
  const copyResult = async () => { const ok = await copy(output); setNotice(ok === false ? 'Clipboard unavailable. Select and copy the result.' : 'Result copied') }
  return (
    <section className="panel units-panel" aria-label="Unit converter">
      <div className="section-head"><div><p className="eyebrow">UNIT CONVERSION</p><h2>A different measure. The same value.</h2></div><span className="badge">13 categories</span></div>
      <div className="grid2">
        <label>Category<select aria-label="Conversion category" value={category} onChange={e => pickCategory(e.target.value)}>{Object.keys(UNITS).map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Precision<select aria-label="Conversion precision" value={precision} onChange={e => setSelection({ ...selection, precision: Number(e.target.value) })}>{[6, 9, 12, 15].map(digits => <option key={digits} value={digits}>{digits} significant digits</option>)}</select></label>
      </div>
      <label>Value<input className="disp" inputMode="decimal" aria-label="Conversion value" value={value} maxLength={128} spellCheck={false} aria-invalid={bad || !!error} onChange={e => { setValue(e.target.value); setNotice('') }} /></label>
      <label>Find a unit<input type="search" aria-label="Search units" value={search} placeholder="Search unit names or symbols…" onChange={e => setSearch(e.target.value)} /></label>
      {search && <p className="mu" role="status">{matchingUnits.length ? `${matchingUnits.length} matching units. Current selections remain available.` : 'No matching units. Current selections remain available.'}</p>}
      <div className="grid2">
        <label>From<select aria-label="From unit" value={from} onChange={e => { setSelection({ ...selection, from: e.target.value }); setNotice('') }}>{options(from).map(unit => <option value={unit} key={unit}>{optionLabel(unit)}</option>)}</select></label>
        <label>To<select aria-label="To unit" value={to} onChange={e => { setSelection({ ...selection, to: e.target.value }); setNotice('') }}>{options(to).map(unit => <option value={unit} key={unit}>{optionLabel(unit)}</option>)}</select></label>
      </div>
      <div className="bar"><button onClick={() => { setSelection({ ...selection, from: to, to: from }); setNotice('') }} aria-label="Swap units">⇄ Swap units</button><button disabled={!output} onClick={() => void copyResult()} aria-label="Copy conversion result">⧉ Copy result</button></div>
      <div className="conversion-result" role="status" aria-live="polite">{error ? <span className="err">{error}</span> : <><p className="mu">{value} {from} equals</p><output aria-label="Converted value">{output}</output><span className="unit-symbol">{to}</span></>}</div>
      {notice && <p className="mu" role="status">{notice}</p>}
      <p className="mu">Conversions use local constants and up to 15 significant digits. KB/MB are decimal; KiB/MiB are binary. US and UK volumes are labeled explicitly. Temperatures below absolute zero are rejected.</p>
    </section>
  )
}
