import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
const nav = (page: Page, name: string) => page.getByRole('navigation', { name:'Calculator modes' }).getByRole('button',{name,exact:true})
const result = (page: Page) => page.getByRole('status',{name:'Calculation result'})
async function evaluate(page: Page, expression: string, expected: string) {
  await page.getByLabel('Expression',{exact:true}).fill(expression)
  await page.getByLabel('Expression',{exact:true}).press('Enter')
  await expect(result(page).locator('output')).toHaveText(expected)
}
const browserErrors = new WeakMap<Page,string[]>()
test.beforeEach(async ({page}) => { const errors:string[]=[];browserErrors.set(page,errors);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});await page.goto('/') })
test.afterEach(async({page})=>{expect(browserErrors.get(page)||[]).toEqual([])})
test('scientific calculation, keyboard editing and numerical regressions', async ({page}) => {
  for(const [expression,expected] of [['2^3^2','512'],['-2^2','-4'],['(-2)^3','-8'],['0.1+0.2','0.3'],['1e-20','1e-20'],['1e300','1e+300'],['200+10%','220'],['nthRoot(-8,3)','-2'],['logbase(81,3)','4'],['(2+(3*4','14']]) await evaluate(page,expression,expected)
  for(const [expression,message] of [['1/(2-2)','Cannot divide by zero'],['0/0','Cannot divide by zero'],['10^400','Overflow'],['sqrt(-1)','Domain error'],['1.5!','factorial'],['sin.constructor(1)','Syntax error']]) {
    await page.getByLabel('Expression',{exact:true}).fill(expression); await page.getByLabel('Expression',{exact:true}).press('Enter');await expect(result(page)).toContainText(message)
  }
  await page.getByLabel('Expression',{exact:true}).fill('sin(30)');await page.getByRole('button',{name:'Angle unit',exact:true}).click();await evaluate(page,'sin(pi/2)','1')
  await page.getByRole('button',{name:'Angle unit',exact:true}).click();await evaluate(page,'sin(30)','0.5')
  await page.getByLabel('Expression',{exact:true}).press('Escape');await expect(page.getByLabel('Expression',{exact:true})).toHaveValue('')
  await page.locator('h1').click();await page.keyboard.type('7*8');await page.keyboard.press('Enter');await expect(result(page).locator('output')).toHaveText('56')
})
test('every scientific function button and keypad control is wired to real math', async ({page}) => {
  const cases = [
    ['Sine','30)','0.5'],['Cosine','60)','0.5'],['Tangent','45)','1'],['Inverse sine','0.5)','30'],['Inverse cosine','0)','90'],['Inverse tangent','1)','45'],
    ['Hyperbolic sine','0)','0'],['Hyperbolic cosine','0)','1'],['Hyperbolic tangent','0)','0'],['Natural logarithm','e)','1'],['Base 10 logarithm','100)','2'],['Arbitrary base logarithm','8,2)','3'],
    ['Square root','81)','9'],['Cube root','27)','3'],['Nth root','16,4)','2'],['Exponential','0)','1'],['Absolute value','-4)','4'],['Reciprocal','4)','0.25'],
  ]
  for(const [name,suffix,expected] of cases){await page.getByRole('button',{name:'All clear',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();await page.getByLabel('Expression',{exact:true}).focus();await page.getByLabel('Expression',{exact:true}).pressSequentially(suffix);await page.getByRole('button',{name:'Equals',exact:true}).click();await expect(result(page).locator('output')).toHaveText(expected)}
  for(const [start,name,suffix,expected] of [['3','Square','','9'],['3','Cube','','27'],['2','Power','3','8'],['5','Factorial','','120'],['7','Modulus','3','1'],['-7','Remainder','3','-1'],['50','Percent','','0.5']]) {
    await page.getByLabel('Expression',{exact:true}).fill(start);await page.getByRole('button',{name,exact:true}).click();if(suffix)await page.keyboard.type(suffix);await page.getByRole('button',{name:'Equals',exact:true}).click();await expect(result(page).locator('output')).toHaveText(expected)
  }
  await page.getByRole('button',{name:'All clear',exact:true}).click()
  for(const name of ['Open parenthesis','7','Add','8','Close parenthesis','Multiply','2','Equals']) await page.getByRole('button',{name,exact:true}).click()
  await expect(result(page).locator('output')).toHaveText('30')
  await page.getByRole('button',{name:'Change sign',exact:true}).click();await page.getByRole('button',{name:'Equals',exact:true}).click();await expect(result(page).locator('output')).toHaveText('-30')
  await page.getByLabel('Expression',{exact:true}).fill('12+34');await page.getByRole('button',{name:'Clear entry',exact:true}).click();await expect(page.getByLabel('Expression',{exact:true})).toHaveValue('12+')
  await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.getByLabel('Expression',{exact:true})).toHaveValue('12+34')
  await page.getByRole('button',{name:'Backspace',exact:true}).click();await expect(page.getByLabel('Expression',{exact:true})).toHaveValue('12+3')
  await page.getByLabel('Expression',{exact:true}).press('ControlOrMeta+z');await expect(page.getByLabel('Expression',{exact:true})).toHaveValue('12+34')
  await page.getByRole('button',{name:'Standard',exact:true}).click();await expect(page.getByRole('button',{name:'Sine',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'Scientific keys',exact:true}).click();await expect(page.getByRole('button',{name:'Sine',exact:true})).toBeVisible()
})
test('history, favorites, result reuse, memory and preferences survive reload', async ({page}) => {
  await evaluate(page,'6*7','42');await page.getByRole('button',{name:'Memory add',exact:true}).click();await expect(page.getByLabel('Memory status')).toHaveText('M = 42')
  await page.getByRole('button',{name:'Memory subtract',exact:true}).click();await expect(page.getByLabel('Memory status')).toHaveText('M empty')
  await page.getByRole('button',{name:'Memory add',exact:true}).click();await page.getByRole('button',{name:'All clear',exact:true}).click();await page.getByRole('button',{name:'Memory recall',exact:true}).click();await page.getByRole('button',{name:'Equals',exact:true}).click();await expect(result(page).locator('output')).toHaveText('42')
  const history=page.getByRole('complementary',{name:'Calculation history'});await history.getByRole('button',{name:'Favorite calculation',exact:true}).first().click()
  await page.reload();await expect(page.getByLabel('Memory status')).toHaveText('M = 42');await expect(history.getByRole('listitem')).toHaveCount(2)
  await history.getByRole('button',{name:'★ Favorites',exact:true}).click();await expect(history.getByRole('listitem')).toHaveCount(1);await history.getByRole('button',{name:'All calculations',exact:true}).click()
  await history.getByRole('searchbox').fill('6*7');await expect(history.getByRole('listitem')).toHaveCount(1);await history.getByRole('button',{name:'Reuse expression 6*7',exact:true}).click();await expect(page.getByLabel('Expression',{exact:true})).toHaveValue('6*7')
  await history.getByRole('button',{name:'Reuse result 42',exact:true}).click();await expect(page.getByLabel('Expression',{exact:true})).toHaveValue('42')
  await history.getByRole('button',{name:'Delete calculation',exact:true}).click();await history.getByRole('searchbox').fill('');await history.getByRole('button',{name:'Clear all history',exact:true}).click();await expect(history.getByRole('listitem')).toHaveCount(0)
  await page.getByRole('button',{name:'Memory clear',exact:true}).click();await expect(page.getByLabel('Memory status')).toHaveText('M empty')
  await page.getByRole('button',{name:'Appearance',exact:true}).click();await page.getByLabel('Theme',{exact:true}).selectOption('light');await page.getByRole('button',{name:'violet',exact:true}).click();await page.getByRole('button',{name:'Close dialog',exact:true}).click();await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','light');await expect(page.locator('html')).toHaveAttribute('data-accent','violet')
})
test('all modes have responsive layouts and no runtime or console errors', async ({page}) => {
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())})
  const widths=[320,390,768,1440]
  for(const width of widths){await page.setViewportSize({width,height:900});for(const name of ['Scientific','Graphing','Programmer','Converter','Engineering']){await nav(page,name).click();await expect(page.locator('h1')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const bad=await page.locator('main button:visible').evaluateAll(nodes=>nodes.filter(n=>{const r=n.getBoundingClientRect();return r.width<22||r.height<28}).map(n=>n.textContent));expect(bad).toEqual([])}}
  expect(errors).toEqual([])
})
test('stored corrupt data and blocked storage do not crash calculator modes', async ({page}) => {
  await page.evaluate(()=>{localStorage.setItem('cp.hist','[null]');localStorage.setItem('cp.prog.prefs','{"bits":{},"base":"x","signed":null}');localStorage.setItem('cp.graph.view','{"cx":1e300,"cy":0,"s":1e300}');localStorage.setItem('cp.units.selection','null');localStorage.setItem('cp.ans','{}')});await page.reload()
  await evaluate(page,'2+2','4');for(const name of ['Programmer','Converter','Engineering','Graphing']){await nav(page,name).click();await expect(page.locator('main')).not.toContainText('could not be displayed')}
  await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('blocked','QuotaExceededError')}});await page.reload();await nav(page,'Scientific').click();await evaluate(page,'5+5','10');await expect(page.getByRole('status').filter({hasText:'Storage is unavailable'})).toBeVisible()
})
test('accessible names, focus indicators and theme contrast pass automated checks', async ({page}) => {
  for(const name of ['Scientific','Programmer','Converter','Engineering','Graphing']){await nav(page,name).click();const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([])}
  await page.getByRole('button',{name:'Appearance',exact:true}).click();await page.getByLabel('Theme',{exact:true}).selectOption('light');await page.getByRole('button',{name:'Close dialog',exact:true}).click();for(const name of ['Scientific','Programmer','Converter','Engineering','Graphing']){await nav(page,name).click();const scan=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();expect(scan.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}))).toEqual([])}
  await page.keyboard.press('Tab');expect(await page.locator(':focus-visible').count()).toBeGreaterThan(0)
})
test('production manifest, icons, cached reload and all core modes work offline', async ({page,context,browserName}) => {
  test.skip(browserName!=='chromium','Service-worker offline verification runs in Chromium; other engines are covered by online interaction tests.')
  const manifestURL=await page.locator('link[rel=manifest]').getAttribute('href');expect(manifestURL).toBeTruthy();const response=await page.request.get(new URL(manifestURL!,page.url()).href);const manifest=await response.json();expect(manifest.display).toBe('standalone');expect(manifest.icons.map((i:{sizes:string})=>i.sizes)).toEqual(expect.arrayContaining(['192x192','512x512']))
  for(const icon of manifest.icons){const response=await page.request.get(new URL(icon.src,page.url()).href);expect(response.ok()).toBe(true);expect(response.headers()['content-type']).toContain('image/png')}
  await page.evaluate(async()=>{await navigator.serviceWorker.ready});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
  await evaluate(page,'7*8','56');await context.setOffline(true);await page.reload();await expect(page.locator('.topbar-status')).toContainText('Working offline');await evaluate(page,'sqrt(144)','12');await nav(page,'Programmer').click();await page.getByLabel('Programmer input',{exact:true}).fill('255');await expect(page.getByLabel('HEX value',{exact:true})).toHaveText('FF');await nav(page,'Converter').click();await expect(page.getByLabel('Converted value')).toContainText('3.280');await nav(page,'Engineering').click();await page.getByLabel('Complex expression',{exact:true}).fill('i^2');await page.getByRole('button',{name:'Calculate complex',exact:true}).click();await expect(page.getByLabel('Engineering result',{exact:true})).toHaveText('-1');await nav(page,'Graphing').click();await page.getByLabel('Function expression 1',{exact:true}).fill('x^2');await page.getByLabel('Evaluate at x',{exact:true}).fill('3');await expect(page.getByLabel('Function 1 evaluated value')).toHaveText('9');await context.setOffline(false)
})
test('clipboard copy and native paste have working fallbacks', async ({page,browserName,context}) => {
  test.skip(browserName!=='chromium','Clipboard permissions differ by engine; actual read/write covered in Chromium.')
  await context.grantPermissions(['clipboard-read','clipboard-write']);await evaluate(page,'8*8','64');await page.getByRole('button',{name:'Copy result',exact:true}).click();await expect.poll(()=>page.evaluate(()=>navigator.clipboard.readText())).toBe('64');await page.evaluate(()=>navigator.clipboard.writeText('3^4'));await page.getByRole('button',{name:'Paste expression',exact:true}).click();await expect(page.getByLabel('Expression',{exact:true})).toHaveValue('3^4');await page.getByLabel('Expression',{exact:true}).press('Enter');await expect(result(page).locator('output')).toHaveText('81')
})
