import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
const result = spawnSync(process.execPath, [resolve('node_modules/playwright/cli.js'), 'install', 'chromium', 'firefox', 'webkit', '--only-shell'], { stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT: '180000', PLAYWRIGHT_BROWSERS_PATH: resolve('.playwright-browsers') } })
process.exit(result.status ?? 1)
