import { resolve } from 'node:path'
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.playwright-browsers')
const { chromium } = await import('playwright')
const browser=await chromium.launch()
try {
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1})
 await page.goto('http://127.0.0.1:4173/')
 for(const expression of ['sqrt(144)+2^5','logbase(1024,2)','sin(30)^2+cos(30)^2']){await page.getByLabel('Expression',{exact:true}).fill(expression);await page.getByLabel('Expression',{exact:true}).press('Enter')}
 await page.screenshot({path:'evidence/website-desktop-dark.png',fullPage:true})
 await page.getByRole('button',{name:'Appearance',exact:true}).click();await page.getByLabel('Theme',{exact:true}).selectOption('light');await page.getByRole('button',{name:'Close dialog',exact:true}).click()
 await page.screenshot({path:'evidence/website-desktop-light.png',fullPage:true})
 await page.getByRole('button',{name:'Appearance',exact:true}).click();await page.getByLabel('Theme',{exact:true}).selectOption('dark');await page.getByRole('button',{name:'Close dialog',exact:true}).click()
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'evidence/website-mobile-dark.png',fullPage:true})
 await page.setViewportSize({width:1440,height:1000});await page.getByRole('navigation',{name:'Calculator modes'}).getByRole('button',{name:'Graphing',exact:true}).click();await page.getByLabel('Evaluate at x',{exact:true}).fill('2');await page.screenshot({path:'evidence/website-graph.png',fullPage:true})
 console.log('Captured four real application views in evidence/.')
} finally {await browser.close()}
