// Bounded JSON test reporting: avoid flooding review logs with successful test output.
const { spawn } = require('node:child_process')
const [binary, ...args] = process.argv.slice(2)
if (!binary) throw new Error('go executable is required')
const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] })
let pending = ''
const summary = { packages: { passed: [], failed: [] }, tests: { passed: 0, failed: 0, skipped: 0 }, failures: [] }
const output = new Map()
function line(raw) {
  let event
  try { event = JSON.parse(raw) } catch { if (raw.trim()) process.stderr.write(raw + '\n'); return }
  const key = `${event.Package}/${event.Test || ''}`
  if (event.Output && event.Test) output.set(key, ((output.get(key) || '') + event.Output).slice(-5000))
  if (['pass', 'fail', 'skip'].includes(event.Action)) {
    if (event.Test) {
      summary.tests[{pass:'passed', fail:'failed', skip:'skipped'}[event.Action]]++
      if (event.Action === 'fail') summary.failures.push({ test: key, output: output.get(key) || '' })
      output.delete(key)
    } else if (event.Action === 'pass') summary.packages.passed.push(event.Package)
    else if (event.Action === 'fail') summary.packages.failed.push(event.Package)
  }
}
child.stdout.on('data', data => {
  pending += data.toString()
  let index
  while ((index = pending.indexOf('\n')) >= 0) { line(pending.slice(0, index)); pending = pending.slice(index + 1) }
})
child.stderr.on('data', data => process.stderr.write(data))
child.on('error', error => { process.stderr.write(error.message); process.exitCode = 1 })
child.on('close', code => {
  if (pending) line(pending)
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n')
  process.exitCode = code || 0
})
