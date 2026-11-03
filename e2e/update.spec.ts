import { test, expect } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'

test('PWA update waits for approval and reload preserves saved calculations', async ({page,browserName}) => {
  test.skip(browserName !== 'chromium', 'Update lifecycle is verified with Chromium service workers.')
  let revision = 1
  const root = resolve('dist')
  const server = createServer(async (request,response) => {
    try {
      const url = new URL(request.url || '/', 'http://localhost')
      const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname))
      if (!path.startsWith(root+sep)) { response.writeHead(403);response.end();return }
      const types: Record<string,string>={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'}
      let data = await readFile(path)
      if(path.endsWith('/sw.js')) data=Buffer.concat([data,Buffer.from(`\n// Verification revision ${revision}\n`)])
      response.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});response.end(data)
    }catch{response.writeHead(404);response.end()}
  })
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve))
  try {
    const address=server.address();if(!address||typeof address==='string')throw Error('Test server unavailable')
    await page.goto(`http://127.0.0.1:${address.port}/`)
    await page.evaluate(async()=>{await navigator.serviceWorker.ready})
    await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
    await page.getByLabel('Expression',{exact:true}).fill('9*9');await page.getByLabel('Expression',{exact:true}).press('Enter')
    await expect(page.getByRole('status',{name:'Calculation result'}).locator('output')).toHaveText('81')
    revision=2
    await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration?.update()})
    await expect(page.getByRole('button',{name:'Update & reload',exact:true})).toBeVisible()
    await expect(page.getByLabel('Expression',{exact:true})).toHaveValue('9*9')
    await page.evaluate(()=>navigator.serviceWorker.addEventListener('controllerchange',()=>localStorage.setItem('verified-controller-change','yes')))
    await page.getByRole('button',{name:'Update & reload',exact:true}).click()
    await expect.poll(()=>page.evaluate(()=>localStorage.getItem('verified-controller-change')).catch(()=>null)).toBe('yes')
    await expect(page.getByRole('complementary',{name:'Calculation history'})).toContainText('81')
    await expect(page.getByLabel('Expression',{exact:true})).toHaveValue('9*9')
  } finally { await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())) }
})
