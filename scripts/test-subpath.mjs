import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright-browsers')
const { chromium, expect } = await import('@playwright/test')
const root=resolve('dist')
const server=createServer(async(req,res)=>{
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
  if(!pathname.startsWith('/calc/')){res.writeHead(404);res.end();return}
  const path=resolve(root,pathname.slice(6)||'index.html')
  if(!path.startsWith(root+sep)){res.writeHead(403);res.end();return}
  const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'}
  const body=await readFile(path)
  res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body)
 }catch{res.writeHead(404);res.end()}
})
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const browser=await chromium.launch()
try{
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(`http://127.0.0.1:${server.address().port}/calc/`)
 await page.evaluate(async()=>{await navigator.serviceWorker.ready});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller)
 const scope=await page.evaluate(async()=>(await navigator.serviceWorker.getRegistration()).scope);expect(new URL(scope).pathname).toBe('/calc/')
 await context.setOffline(true);await page.reload();await page.getByLabel('Expression',{exact:true}).fill('2^3^2');await page.getByLabel('Expression',{exact:true}).press('Enter');await expect(page.getByRole('status',{name:'Calculation result'}).locator('output')).toHaveText('512');expect(errors).toEqual([])
 await writeFile('evidence/subpath-tests.json',JSON.stringify({status:'passed',scope:new URL(scope).pathname,checks:['relative asset loading','service worker scoped to /calc/','offline reload','real scientific calculation'],errors},null,2)+'\n')
 console.log('Subdirectory deployment and offline scope: 4 checks passed')
}finally{await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
