import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { compatible, readStored, writeStored } from './storage'
import { clearEntry } from './Calculator'
beforeEach(() => { const items = new Map<string,string>(); vi.stubGlobal('localStorage', { getItem: (key: string) => items.get(key) ?? null, setItem: (key: string, value: string) => items.set(key,value) }) })
afterEach(() => vi.unstubAllGlobals())
describe('resilient local data', () => {
  it('stores and retrieves values', () => { expect(writeStored('v',42)).toBe(true); expect(readStored('v',0)).toBe(42) })
  it.each(['null','{}','"oops"','[null]','broken'])('rejects malformed numeric data %s', value => { localStorage.setItem('v',value); expect(readStored('v',0)).toBe(0) })
  it('uses a schema validator for saved preferences', () => { localStorage.setItem('v','"invalid"'); expect(readStored('v','dark',(v): v is string => v==='dark' || v==='light')).toBe('dark') })
  it('recovers from blocked storage', () => { vi.stubGlobal('localStorage',{getItem:()=>{throw Error()},setItem:()=>{throw Error()}});expect(readStored('v',12)).toBe(12);expect(writeStored('v',1)).toBe(false) })
  it('caps saved payloads and arrays', () => { localStorage.setItem('v','"'+'x'.repeat(2_000_001)+'"');expect(readStored('v','')).toBe('');expect(compatible(Array(1001),[])).toBe(false) })
})
describe('clear entry editing', () => {
  it.each([['12+34','12+'],['2+1e-30','2+'],['2+sin(30)','2+'],['(2+3)*4','(2+3)*'],['Ans',''],['','']])('%s clears latest entry', (source,expected)=>expect(clearEntry(source)).toBe(expected))
})
