import { _electron as electron, expect } from '@playwright/test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
const root=resolve('.')
await mkdir(join(root,'evidence'),{recursive:true})
const bundle=join(root,'release','desktop',`CALC Pro-${process.platform}-${process.arch}`)
const executable=process.argv[2]||(process.platform==='darwin'?join(bundle,'CALC Pro.app','Contents','MacOS','CALC Pro'):join(bundle,process.platform==='win32'?'CALC Pro.exe':'CALC Pro'))
const profile=await mkdtemp(join(root,'evidence','.desktop-profile-'))
const checks=[]
const errors=[]
let application
async function launch(){
  const instance=await electron.launch({executablePath:executable,env:{...process.env,CALC_PRO_PROFILE:profile},timeout:45000})
  const page=await instance.firstWindow()
  page.on('pageerror',error=>errors.push(error.message))
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
  await page.waitForURL('calc-pro://app/')
  await expect(page.getByRole('heading',{level:1})).toBeVisible()
  return {instance,page}
}
async function check(name,action){console.log(`Checking: ${name}`);await action();checks.push({name,status:'passed'});console.log(`Passed: ${name}`)}
const navigate=async(page,name)=>page.getByRole('navigation',{name:'Calculator modes'}).getByRole('button',{name,exact:true}).click()
try{
  let launched=await launch();application=launched.instance;let page=launched.page
  await check('packaged application launches from bundled assets without a web server',async()=>{expect(page.url()).toBe('calc-pro://app/');await expect(page.locator('.topbar-status')).toContainText('Desktop · bundled offline')})
  await check('sandboxed renderer has no Node integration or preload bridge',async()=>{
    expect(await page.evaluate(()=>({require:typeof window.require,process:typeof window.process}))).toEqual({require:'undefined',process:'undefined'})
    const prefs=await application.evaluate(({BrowserWindow})=>{const p=BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences();return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration}})
    expect(prefs).toEqual({sandbox:true,contextIsolation:true,nodeIntegration:false})
  })
  await check('native menus are installed',async()=>{const labels=await application.evaluate(({Menu})=>Menu.getApplicationMenu().items.map(item=>item.label));expect(labels).toEqual(expect.arrayContaining(['Edit','View','Window','Help']))})
  await check('scientific keyboard math, tiny values and errors work',async()=>{
    for(const [expression,result]of[['2^3^2','512'],['1e-20','1e-20'],['6*7','42']]){await page.getByLabel('Expression',{exact:true}).fill(expression);await page.getByLabel('Expression',{exact:true}).press('Enter');await expect(page.getByRole('status',{name:'Calculation result'}).locator('output')).toHaveText(result)}
    await page.getByRole('button',{name:'Memory add',exact:true}).click();await expect(page.getByLabel('Memory status')).toHaveText('M = 42')
    await page.getByLabel('Expression',{exact:true}).fill('1/(2-2)');await page.getByLabel('Expression',{exact:true}).press('Enter');await expect(page.getByRole('status',{name:'Calculation result'})).toContainText('Cannot divide by zero')
  })
  await check('system clipboard copy and paste work',async()=>{
    await page.getByLabel('Expression',{exact:true}).fill('8*8');await page.getByLabel('Expression',{exact:true}).press('Enter');await page.getByRole('button',{name:'Copy result',exact:true}).click()
    expect(await application.evaluate(({clipboard})=>clipboard.readText())).toBe('64')
    await application.evaluate(({clipboard})=>clipboard.writeText('3^4'));await page.getByRole('button',{name:'Paste expression',exact:true}).click();await expect(page.getByLabel('Expression',{exact:true})).toHaveValue('3^4')
  })
  await check('graphing uses real functions, interactive viewport and PNG export',async()=>{
    await navigate(page,'Graphing');await page.getByLabel('Function expression 1',{exact:true}).fill('x^2');await page.getByLabel('Evaluate at x',{exact:true}).fill('2.5');await expect(page.getByLabel('Function 1 evaluated value')).toHaveText('6.25')
    await page.getByRole('button',{name:'Zoom in',exact:true}).click();await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('cp.graph.view')).s)).toBe(62.5)
    const output=join(root,'evidence','desktop-graph-export.png')
    await application.evaluate(({session},destination)=>{
      globalThis.calcProDownload = new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('Native PNG download timed out')),30000)
        session.defaultSession.once('will-download',(_event,item)=>{
          item.setSavePath(destination)
          item.once('done',(_event,state)=>{clearTimeout(timer);if(state==='completed')resolve(item.getSavePath());else reject(Error('Native download '+state))})
        })
      })
    },output)
    await page.getByRole('button',{name:'Export PNG',exact:true}).click()
    await application.evaluate(async()=>await globalThis.calcProDownload)
    expect((await readFile(output)).subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a')
  })
  await check('programmer signed HEX and exact 64-bit arithmetic work',async()=>{
    await navigate(page,'Programmer');const section=page.getByRole('region',{name:'Programmer calculator'});await section.getByRole('button',{name:'8-bit',exact:true}).click();await section.getByRole('button',{name:'HEX',exact:true}).click();await page.getByLabel('Programmer input',{exact:true}).fill('FF');await section.getByRole('button',{name:'Equals',exact:true}).click();await expect(page.getByLabel('DEC value',{exact:true})).toHaveText('-1');await expect(page.getByLabel('HEX value',{exact:true})).toHaveText('FF')
    await section.getByRole('button',{name:'64-bit',exact:true}).click();await section.getByRole('button',{name:'DEC',exact:true}).click();await page.getByLabel('Programmer input',{exact:true}).fill('9007199254740993');await section.getByRole('button',{name:'+',exact:true}).click();await page.getByLabel('Programmer input',{exact:true}).fill('1');await section.getByRole('button',{name:'Equals',exact:true}).click();await expect(page.getByLabel('DEC value',{exact:true})).toHaveText('9007199254740994')
  })
  await check('unit conversion works from bundled local constants',async()=>{
    await navigate(page,'Converter');await page.getByLabel('Conversion category',{exact:true}).selectOption('Temperature');await page.getByLabel('From unit',{exact:true}).selectOption('°C');await page.getByLabel('To unit',{exact:true}).selectOption('°F');await page.getByLabel('Conversion value',{exact:true}).fill('100');await expect(page.getByLabel('Converted value')).toHaveText('212')
  })
  await check('complex numbers and matrix operations work in the packaged app',async()=>{
    await navigate(page,'Engineering');await page.getByLabel('Complex expression',{exact:true}).fill('(3+2i)*(1-i)');await page.getByRole('button',{name:'Calculate complex',exact:true}).click();await expect(page.getByLabel('Engineering result',{exact:true})).toHaveText('5 − i')
    await page.getByRole('button',{name:'Matrices',exact:true}).click();await page.getByLabel('Matrix A',{exact:true}).fill('1 2\n3 4');await page.getByRole('button',{name:'Determinant A',exact:true}).click();await expect(page.getByLabel('Engineering result',{exact:true})).toHaveText('-2')
  })
  await check('desktop install control accurately explains installed status',async()=>{await page.getByRole('button',{name:'Desktop app',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('standalone desktop application');await page.getByRole('button',{name:'Close dialog',exact:true}).click()})
  await check('history, memory and preferences persist across a full app relaunch',async()=>{
    await page.getByRole('button',{name:'Appearance',exact:true}).click();await page.getByLabel('Theme',{exact:true}).selectOption('light');await page.getByRole('button',{name:'Close dialog',exact:true}).click();await navigate(page,'Scientific');await application.close();application=null
    launched=await launch();application=launched.instance;page=launched.page;await expect(page.getByLabel('Memory status')).toHaveText('M = 42');await expect(page.getByRole('complementary',{name:'Calculation history'})).toContainText('42');await expect(page.locator('html')).toHaveAttribute('data-theme','light');await navigate(page,'Programmer');await expect(page.getByRole('complementary',{name:'Programmer history'})).toContainText('9007199254740994')
  })
  await check('local protocol rejects bundle traversal',async()=>{const response=await application.evaluate(async({net})=>{const result=await net.fetch('calc-pro://app/%2e%2e%2fpackage.json');return result.status});expect(response).toBe(403)})
  await navigate(page,'Scientific');await page.screenshot({path:join(root,'evidence','desktop-app-light.png'),fullPage:true})
  await check('packaged app produces no unhandled renderer or console errors',async()=>expect(errors).toEqual([]))
  await writeFile(join(root,'evidence','desktop-tests.json'),JSON.stringify({verifiedAt:new Date().toISOString(),executable,platform:process.platform,architecture:process.arch,checks,errors},null,2)+'\n')
  console.log(`Desktop verification passed: ${checks.length} checks`)
}catch(error){
  await writeFile(join(root,'evidence','desktop-tests.json'),JSON.stringify({verifiedAt:new Date().toISOString(),executable,checks,errors,failure:String(error)},null,2)+'\n')
  throw error
}finally{if(application)await application.close();await rm(profile,{recursive:true,force:true})}
