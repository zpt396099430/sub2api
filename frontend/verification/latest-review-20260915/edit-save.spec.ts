import { defineComponent } from 'vue'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Account } from '@/types'
const mocks = vi.hoisted(() => ({ update: vi.fn(), apply: vi.fn(), preview: vi.fn(), trafficGet: vi.fn(), trafficSave: vi.fn() }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ showError: vi.fn(), showSuccess: vi.fn(), showInfo: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ isSimpleMode: true }) }))
vi.mock('@/api/admin', () => ({ adminAPI: { accounts: { update: mocks.update, applyAntiDegrade: mocks.apply, previewAntiDegrade: mocks.preview, checkMixedChannelRisk: vi.fn().mockResolvedValue({ has_risk: false }) }, settings: { getWebSearchEmulationConfig: vi.fn().mockResolvedValue({ enabled: false, providers: [] }), getSettings: vi.fn().mockResolvedValue({}) }, tlsFingerprintProfiles: { list: vi.fn().mockResolvedValue([]) } } }))
vi.mock('@/api/admin/accounts', () => ({ getAntigravityDefaultModelMapping: vi.fn() }))
vi.mock('@/api/admin/accountTraffic', async () => ({ ...await vi.importActual('@/api/admin/accountTraffic'), accountTrafficAPI: { get: mocks.trafficGet, save: mocks.trafficSave } }))
vi.mock('vue-i18n', async () => ({ ...await vi.importActual('vue-i18n'), useI18n: () => ({ t: (key: string) => key }) }))
import EditAccountModal from '../../src/components/account/EditAccountModal.vue'
import AccountTrafficControls from '../../src/components/account/AccountTrafficControls.vue'
import { defaultTrafficPolicy } from '../../src/api/admin/accountTraffic'
const dialog = defineComponent({ props: ['show'], template: '<div v-if="show"><slot/><slot name="footer"/></div>' })
const account = (extra: Record<string, unknown> = {}) => ({ id: 42, name: 'Review fixture', platform: 'openai', type: 'oauth', credentials: {}, extra, proxy_id: null, concurrency: 128, priority: 1, rate_multiplier: 1, status: 'active', group_ids: [], expires_at: null, auto_pause_on_expired: false, created_at: '2026-09-15T00:00:00Z', updated_at: '2026-09-15T01:00:00Z' } as Account)
function modal(value = account()) { return shallowMount(EditAccountModal, { props: { show: true, account: value, groups: [], proxies: [] }, global: { stubs: { BaseDialog: dialog, AccountTrafficControls: false } } }) }
async function openTraffic(w: ReturnType<typeof modal>) { const d = w.get('details[data-testid=account-traffic-controls]'); (d.element as HTMLDetailsElement).open = true; await d.trigger('toggle'); await flushPromises() }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.update.mockImplementation(async (_id, payload) => ({ ...account(payload.extra), ...payload }))
  mocks.trafficGet.mockResolvedValue({ policy: defaultTrafficPolicy(), state_available: true, hard_limit: 128, state: null })
  mocks.trafficSave.mockImplementation(async (_id, policy) => ({ policy, hard_limit: 128, state_available: true }))
  mocks.preview.mockResolvedValue({ account_id: 42, eligible: true, enabled: false, changes: [] })
  mocks.apply.mockResolvedValue(account())
})
describe('account save review: expected invariants', () => {
  it('fresh same-account props must replace older independently saved traffic settings on reopen', async () => {
    const old = { ...defaultTrafficPolicy(), strict_rpm_enabled: true }
    const fresh = { ...defaultTrafficPolicy(), strict_rpm_enabled: false }
    const w = modal(account({ account_traffic_control: old }))
    w.findComponent(AccountTrafficControls).vm.$emit('saved', old)
    await w.setProps({ show: false })
    await w.setProps({ account: { ...account({ account_traffic_control: fresh }), updated_at: '2026-09-15T02:00:00Z' }, show: true })
    await w.get('#edit-account-form').trigger('submit'); await flushPromises()
    const sent = mocks.update.mock.calls.at(-1)![1]
    w.unmount(); expect(sent.extra.account_traffic_control.strict_rpm_enabled).toBe(false)
  })
  it('ordinary save must not close and discard an unsaved traffic draft', async () => {
    const w = modal(); await openTraffic(w)
    await w.get('[data-testid=strict-rpm-toggle]').setValue(true)
    await w.get('#edit-account-form').trigger('submit'); await flushPromises()
    const saved = mocks.trafficSave.mock.calls.length > 0 || mocks.update.mock.calls.some(([, payload]) => payload.extra?.account_traffic_control?.strict_rpm_enabled)
    const discarded = !saved && (w.emitted('close')?.length ?? 0) > 0
    w.unmount(); expect(discarded).toBe(false)
  })
  it('ordinary save must wait for an in-flight independent traffic save', async () => {
    let resolve!: (value: unknown) => void
    mocks.trafficSave.mockReturnValue(new Promise(r => { resolve = r }))
    const w = modal(); await openTraffic(w)
    await w.get('[data-testid=strict-rpm-toggle]').setValue(true)
    await w.findAll('button').find(b => b.text() === '保存流量控制')!.trigger('click')
    await w.get('#edit-account-form').trigger('submit'); await flushPromises()
    const concurrent = mocks.update.mock.calls.length > 0
    resolve({ policy: { ...defaultTrafficPolicy(), strict_rpm_enabled: true }, state_available: true, hard_limit: 128 }); await flushPromises()
    w.unmount(); expect(concurrent).toBe(false)
  })
  it('switching identity should not reset an unsaved concurrency edit', async () => {
    const w = modal()
    const input = w.findAll('input[type=number]').find(i => (i.element as HTMLInputElement).value === '128')!
    await input.setValue(256)
    await w.get('[data-testid=anti-degrade-mode-1]').trigger('click'); await flushPromises()
    await w.get('[data-testid=anti-degrade-confirm]').trigger('click'); await flushPromises()
    const number = (input.element as HTMLInputElement).value
    w.unmount(); expect(number).toBe('256')
  })
})
