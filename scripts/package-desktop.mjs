import { packager } from '@electron/packager'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
const root = resolve('.')
const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
await readFile(join(root, 'dist', 'index.html'))
await mkdir(join(root, 'release', 'desktop'), { recursive: true })
const stage = await mkdtemp(join(root, 'release', '.desktop-stage-'))
try {
  await cp(join(root,'dist'),join(stage,'dist'),{recursive:true})
  await cp(join(root,'desktop'),join(stage,'desktop'),{recursive:true})
  await writeFile(join(stage,'package.json'), JSON.stringify({name:'calc-pro-desktop',productName:'CALC Pro',version:metadata.version,description:'Private offline scientific, graphing, programmer, unit and engineering calculator',main:'desktop/main.cjs',author:'CALC Pro',license:'UNLICENSED'}, null, 2))
  const electronVersion = JSON.parse(await readFile(join(root,'node_modules/electron/package.json'),'utf8')).version
  let localZip = false
  const archiveName = `electron-v${electronVersion}-${process.platform}-${process.arch}.zip`
  try {
    const archive = await readFile(join(root,'.cache','electron',archiveName))
    const checksums = JSON.parse(await readFile(join(root,'node_modules/electron/checksums.json'),'utf8'))
    if (createHash('sha256').update(archive).digest('hex') !== checksums[archiveName]) throw new Error('Local Electron archive checksum mismatch')
    localZip = true
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  const appPaths = await packager({dir:stage,name:'CALC Pro',executableName:'CALC Pro',appBundleId:'local.calcpro.desktop',appVersion:metadata.version,electronVersion,platform:process.platform,arch:process.arch,out:join(root,'release','desktop'),overwrite:true,asar:true,prune:true,icon:process.platform==='linux'?join(root,'public','icons','icon-512.png'):join(root,'desktop',process.platform==='win32'?'icon.ico':'icon.icns'),...(localZip ? {electronZipDir:join(root,'.cache','electron')} : {download:{cacheRoot:join(root,'.cache','electron')}}),osxSign:false,osxNotarize:false})
  if (process.platform==='darwin') {
    const appPath=join(appPaths[0],'CALC Pro.app')
    execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-',appPath],{stdio:'inherit'})
    execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',appPath],{stdio:'inherit'})
    const zip=join(root,'release',`CALC-Pro-${metadata.version}-macOS-${process.arch}.zip`)
    await rm(zip,{force:true})
    execFileSync('/usr/bin/ditto',['-c','-k','--sequesterRsrc','--keepParent',appPath,zip],{stdio:'inherit'})
    await writeFile(join(root,'evidence','desktop-package.json'),JSON.stringify({version:metadata.version,electronVersion,platform:process.platform,architecture:process.arch,app:appPath,zip,signature:'ad-hoc',notarized:false},null,2)+'\n')
    console.log(`Packaged and ad-hoc signature verified: ${appPath}\nZIP: ${zip}`)
  } else console.log(`Packaged app: ${appPaths.join(', ')}`)
} finally { await rm(stage,{recursive:true,force:true}) }
