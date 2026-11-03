import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { createHash } from 'node:crypto'
const require=createRequire(import.meta.url)
const root=resolve('.')
const electronRoot=join(root,'node_modules','electron')
const metadata=JSON.parse(await readFile(join(electronRoot,'package.json'),'utf8'))
const cache=join(root,'.cache','electron')
const dist=join(electronRoot,'dist')
const binary=process.platform==='darwin'?'Electron.app/Contents/MacOS/Electron':process.platform==='win32'?'electron.exe':'electron'
async function installed(){
  try{return (await readFile(join(dist,'version'),'utf8')).trim().replace(/^v/,'')===metadata.version && (await readFile(join(electronRoot,'path.txt'),'utf8')).trim()===binary && await access(join(dist,binary)).then(()=>true)}catch{return false}
}
async function extractVerified(zip,name){
  const checksums=JSON.parse(await readFile(join(electronRoot,'checksums.json'),'utf8'))
  const digest=createHash('sha256').update(await readFile(zip)).digest('hex')
  if(digest!==checksums[name])throw Error('Electron runtime checksum did not match its published package checksum')
  await mkdir(dist,{recursive:true})
  if(process.platform==='darwin'){
    const extracted=spawnSync('/usr/bin/ditto',['-x','-k',zip,dist],{stdio:'inherit'})
    if(extracted.status!==0)throw Error('Electron archive extraction failed')
  }else{const{extract}=require('@electron-internal/extract-zip');await extract(zip,{dir:dist})}
  await writeFile(join(electronRoot,'path.txt'),binary)
  await mkdir(join(root,'evidence'),{recursive:true})
  await writeFile(join(root,'evidence','desktop-runtime.json'),JSON.stringify({version:metadata.version,platform:process.platform,architecture:process.arch,officialArchive:name,sha256:digest,verifiedAgainst:'Pinned electron/checksums.json',verifiedAt:new Date().toISOString()},null,2)+'\n')
  console.log(`Verified official Electron ${metadata.version} archive SHA256 ${digest}`)
}
if(await installed())console.log(`Electron ${metadata.version} runtime already installed`)
else{
  await mkdir(cache,{recursive:true})
  const name=`electron-v${metadata.version}-${process.platform}-${process.arch}.zip`
  const zip=join(cache,name)
  let archivePresent=false
  try{await access(zip);archivePresent=true}catch{}
  if(archivePresent)await extractVerified(zip,name)
  else{
    const normal=spawnSync(process.execPath,[join(electronRoot,'install.js')],{stdio:'inherit',env:{...process.env,electron_config_cache:cache}})
    if(normal.status!==0){
      const result=spawnSync('curl',['--fail','--location','--retry','3','--silent','--show-error',`https://github.com/electron/electron/releases/download/v${metadata.version}/${name}`,'--output',zip],{stdio:'inherit'})
      if(result.status!==0)throw Error('Official Electron runtime download failed')
      await extractVerified(zip,name)
    }
  }
  if(!(await installed()))throw Error('Electron runtime installation did not produce the expected executable')
}
