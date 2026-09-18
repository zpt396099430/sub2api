// Emit a reviewable patch; all mutations are applied by apply_patch.
const fs = require('node:fs')
const { createRequire } = require('node:module')
const { resolve } = require('node:path')
const root = resolve(__dirname, '../..')
const requireFrontend = createRequire(resolve(root, 'frontend/package.json'))
const { parse } = requireFrontend('vue/compiler-sfc')
const path = resolve(root, 'frontend/src/components/account/EditAccountModal.vue')
const source = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
const form = parse(source).descriptor.template.ast.children.find(x => x.tag === 'BaseDialog').children.find(x => x.tag === 'form')
const children = form.children.filter(x => x.type === 1)
const find = text => { const n = children.find(x => x.loc.source.includes(text)); if (!n) throw Error(text); return n.loc.source }
const summary = find('data-testid="account-info-summary"')
const proxy = find('<ProxySelector v-model="form.proxy_id"')
const header = children.find(x => x.tag === 'UpstreamRequestIdHeaderField').loc.source
const groups = children.find(x => x.tag === 'GroupSelector').loc.source
const status = find('v-model="form.status"')
const expiry = find("t('admin.accounts.expiresAt')")
const grid = children.find(x => x.loc.source.includes('v-model.number="form.concurrency"'))
const concurrency = grid.children.find(x => x.type === 1).loc.source
const hunks = []
function replace(old, next) {
  const position = source.indexOf(old)
  if (position < 0) throw Error('missing fragment')
  const start = source.lastIndexOf('\n', position - 1) + 1
  let end = source.indexOf('\n', position + old.length)
  if (end < 0) end = source.length
  const before = source.slice(start, end)
  const after = source.slice(start, position) + next + source.slice(position + old.length, end)
  hunks.push({ start, end, text: '@@\n'+before.split('\n').map(x=>'-'+x).join('\n')+'\n'+after.split('\n').map(x=>'+'+x).join('\n') })
}
replace('    <form\n', '    '+summary+'\n    <nav v-if="account" class="sticky top-0 z-10 my-4 flex flex-wrap gap-2 border-b border-gray-200 bg-white pb-3 dark:border-dark-700 dark:bg-dark-800" aria-label="账号设置分区">\n      <button v-for="section in editSections" :key="section.id" type="button" :data-testid="`account-section-${section.id}`" :aria-pressed="activeSection === section.id" :class="[\'btn btn-sm\', activeSection === section.id ? \'btn-primary\' : \'btn-secondary\']" @click="activeSection = section.id">{{ section.label }}</button>\n    </nav>\n    <form\n')
replace('      <div>\n        <label class="input-label">{{ t(\'common.name\') }}</label>', '      <section v-show="activeSection === \'basic\'" data-edit-section="basic" class="space-y-5">\n      <div>\n        <label class="input-label">{{ t(\'common.name\') }}</label>')
replace(summary, groups+'\n'+status+'\n'+expiry+'\n      </section>\n      <section v-show="activeSection === \'protection\'" data-edit-section="protection" class="space-y-5">')
const trafficLine = source.split('\n').find(line => line.includes('<AccountTrafficControls '))
replace(trafficLine, '      <div class="max-w-md">'+concurrency+'</div>\n'+trafficLine)
replace('      <!-- API Key fields (only for apikey type) -->', '      </section>\n      <section v-show="activeSection === \'connection\'" data-edit-section="connection" class="space-y-5">\n      '+proxy+'\n'+header+'\n      <!-- API Key fields (only for apikey type) -->')
const advancedStart = children.find(x => x.loc.source.includes('account.platform === \'antigravity\'') && x.loc.source.includes('border-t') && x.loc.start.line > 1433)
if (!advancedStart) throw Error('advanced boundary missing')
const opening = advancedStart.loc.source.split('\n')[0]
replace(opening, '</section>\n      <section v-show="activeSection === \'advanced\'" data-edit-section="advanced" class="space-y-5">\n'+opening)
for (const chunk of [proxy, header, groups, status, expiry, concurrency]) replace(chunk, '')
replace('    </form>', '      </section>\n    </form>\n    <ConfirmDialog :show="discardConfirm" title="放弃未保存的修改？" message="当前表单有未保存的修改。已单独应用的保护策略仍然生效。" confirm-text="放弃修改" cancel-text="继续编辑" @confirm="closeEditor" @cancel="discardConfirm = false" />')
hunks.sort((a,b)=>a.start-b.start)
for(let i=1;i<hunks.length;i++) if(hunks[i].start<hunks[i-1].end) throw Error('overlapping layout edits')
process.stdout.write('*** Begin Patch\n*** Update File: '+path.replaceAll('\\','/')+'\n'+hunks.map(h=>h.text).join('\n')+'\n*** End Patch')
