"""Package only reviewed source, production assets, documentation and test evidence."""
from pathlib import Path
import hashlib, json, stat, zipfile
root = Path(__file__).resolve().parents[1]
release = root / 'release'
release.mkdir(exist_ok=True)
version = json.loads((root / 'package.json').read_text())['version']
browser = json.loads((root / 'evidence/browser-results.json').read_text())
unit = json.loads((root / 'evidence/unit-results.json').read_text())
desktop = json.loads((root / 'evidence/desktop-tests.json').read_text())
assert browser['stats']['unexpected'] == 0 and browser['stats']['flaky'] == 0
assert unit['numFailedTests'] == 0 and unit['numPassedTests'] >= 407
assert not desktop.get('failure') and len(desktop['checks']) == 13 and not desktop['errors']
files = []
for folder in ['src', 'public', 'desktop', 'scripts', 'e2e', 'docs', 'dist', 'playwright-report']:
    files.extend(p for p in (root / folder).rglob('*') if p.is_file() and p.name != '.DS_Store')
for name in ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', 'playwright.config.ts', 'eslint.config.js', 'index.html', '.gitignore', 'README.md', 'CHANGELOG.md', 'RELEASE.md']:
    files.append(root / name)
files.extend(p for p in (root / 'evidence').iterdir() if p.is_file() and p.suffix in ['.json', '.png', '.txt'] and p.name != 'release-inventory.json')
files = sorted(set(files))
assert all(p.is_file() for p in files)
inventory = [{'path': str(p.relative_to(root)), 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
(root / 'evidence/release-inventory.json').write_text(json.dumps({'version': version, 'files': inventory}, indent=2) + '\n')
files.append(root / 'evidence/release-inventory.json')
archive = release / f'CALC-Pro-{version}-source-and-web.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as out:
    for p in files: out.write(p, 'CALC-Pro/' + str(p.relative_to(root)))
with zipfile.ZipFile(archive) as check:
    assert check.testzip() is None
    names = set(check.namelist())
    for path in ['README.md', 'docs/ACCEPTANCE.md', 'src/App.tsx', 'src/engine/calc.ts', 'desktop/main.cjs', 'dist/index.html', 'dist/sw.js', 'dist/manifest.webmanifest', 'public/apple-touch-icon.png', 'package-lock.json', 'e2e/app.spec.ts']:
        assert 'CALC-Pro/' + path in names, path
    assert not any('/node_modules/' in p or '/.cache/' in p or '/.playwright-browsers/' in p for p in names)
mac = release / f'CALC-Pro-{version}-macOS-arm64.zip'
with zipfile.ZipFile(mac) as check:
    assert check.testzip() is None
    executable = check.getinfo('CALC Pro.app/Contents/MacOS/CALC Pro')
    assert (executable.external_attr >> 16) & stat.S_IXUSR
    assert 'CALC Pro.app/Contents/Resources/app.asar' in check.namelist()
artifacts = [{'name': p.name, 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'crcVerified': True} for p in [archive, mac]]
(release / 'SHA256SUMS.txt').write_text(''.join(f"{item['sha256']}  {item['name']}\n" for item in artifacts))
(release / 'PACKAGE-AUDIT.json').write_text(json.dumps({'version': version, 'sourceFiles': len(files), 'artifacts': artifacts, 'browser': browser['stats'], 'unitPassed': unit['numPassedTests'], 'desktopChecksPassed': len(desktop['checks'])}, indent=2) + '\n')
print(json.dumps({'files': len(files), 'artifacts': artifacts}, indent=2))
