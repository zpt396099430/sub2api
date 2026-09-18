// Review-only tests are injected through -overlay; production sources are untouched.
const { spawn } = require('node:child_process')
const { writeFileSync } = require('node:fs')
const { resolve } = require('node:path')
const root = resolve(__dirname, '../..')
const child = spawn(process.execPath, [resolve(root, 'verification/account-protection-review/run-go-check.cjs'), resolve(root, '../.tools/go/bin/go.exe'), 'test', '-json', '-tags=unit', '-overlay', resolve(__dirname, 'overlay.json'), './internal/service', './internal/repository', '-run', '^TestLatestReview', '-count=1', '-timeout=90s'], { cwd: resolve(root, 'backend'), stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
child.stdout.on('data', chunk => { output += chunk.toString() })
child.stderr.on('data', chunk => process.stderr.write(chunk))
child.on('close', code => {
  writeFileSync(resolve(__dirname, 'backend-reproductions.json'), output)
  const result = JSON.parse(output)
  process.stdout.write(JSON.stringify({ ...result.tests, failures: result.failures.map(f => f.test) }, null, 2) + '\n')
  process.exitCode = code
})
