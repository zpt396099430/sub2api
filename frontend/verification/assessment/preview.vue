<template>
  <main class="mx-auto max-w-5xl space-y-5 p-6">
    <h1 class="text-xl font-semibold">B 方案 · 图片与答案展示验证</h1>
    <p class="text-sm text-gray-500">本地合成答复，仅验证真实组件显示；未调用上游账号。</p>
    <AccountTrafficControls :account-id="42" />
    <button type="button" class="btn btn-secondary" @click="statisticsGroupId = 1">查看分组完整统计（合成数据）</button>
    <GroupStatisticsDialog :group-id="statisticsGroupId" @close="statisticsGroupId = null" />
    <div class="grid gap-5 sm:grid-cols-2">
      <TestResultCard v-for="summary in account.tests" :key="summary.test_type" :account="account" :summary="summary" :now="Date.now()" @detail="detailId = $event" />
    </div>
    <button class="btn btn-secondary" @click="dark = !dark">切换明暗</button>
    <TestSettingsPanel :settings="settings" />
    <TestDetailDialog :record-id="detailId" @close="detailId = null" />
  </main>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import TestResultCard from '../../src/components/admin/intelligent-tests/TestResultCard.vue'
import TestDetailDialog from '../../src/components/admin/intelligent-tests/TestDetailDialog.vue'
import TestSettingsPanel from '../../src/components/admin/intelligent-tests/TestSettingsPanel.vue'
import AccountTrafficControls from '../../src/components/account/AccountTrafficControls.vue'
import GroupStatisticsDialog from '../../src/components/admin/groups/GroupStatisticsDialog.vue'
import { accountTrafficAPI, defaultTrafficPolicy } from '../../src/api/admin/accountTraffic'
import { intelligentTestsAPI, type TestAccount, type TestRecord, type TestSetting } from '../../src/api/intelligentTests'
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420"><rect width="600" height="420" fill="#f0f9ff"/><circle cx="490" cy="70" r="35" fill="#fde68a"/><path d="M30 354 Q280 340 570 354" fill="none" stroke="#b9d4d9" stroke-width="5"/><g fill="none" stroke="#284657" stroke-width="9"><circle cx="170" cy="290" r="65"/><circle cx="425" cy="290" r="65"/><path d="M170 290L242 183L302 290Z M242 183L383 183L302 290 M425 290L383 157L410 146 M222 176L268 176"/></g><path d="M212 165Q187 110 235 101Q280 94 306 124Q321 93 314 59Q332 42 353 64Q369 88 355 120Q347 159 307 181Q265 211 212 165Z" fill="#fffdf8" stroke="#284657" stroke-width="5"/><path d="M230 133Q270 177 305 143Q283 201 230 133Z" fill="#d4e5e7" stroke="#284657" stroke-width="3"/><path d="M352 78L475 107L350 105Z" fill="#f6b544" stroke="#284657" stroke-width="4"/><path d="M350 105Q390 150 475 107" fill="#f9cc70" stroke="#284657" stroke-width="3"/><circle cx="342" cy="72" r="4" fill="#172c36"/><path d="M285 183L314 219L300 275 M274 190L251 222L274 251" fill="none" stroke="#e29732" stroke-width="9" stroke-linecap="round"/><path d="M283 278L321 278" fill="none" stroke="#284657" stroke-width="6"/></svg>`
const base: TestRecord = { id:101, account_id:42, test_type:'pelican',status:'completed',score:null,result:svg,result_image:svg,duration_ms:8420,model:'fixture-text-model',anti_degradation:true,started_at:'2026-09-14T08:00:00Z',finished_at:'2026-09-14T08:00:08Z',created_at:'2026-09-14T08:00:00Z',evaluation:{evaluator_version:2,answer_verdict:'not_evaluated',format_verdict:'compliant',capability_verdict:'insufficient_evidence',reason:'SVG 结构可显示，图像内容尚未评估'},config_snapshot:{execution:{strategy:'legacy',identity_mode:'session',effective_tls:'nodejs24',concurrency:4}},input:'画一只骑自行车的鹈鹕'}
const candy: TestRecord = {...base,id:102,test_type:'candy',score:100,result:'**ANSWER: 12颗**\n最后盒子里有12颗糖。',result_image:'',evaluation:{evaluator_version:2,answer_verdict:'correct',format_verdict:'non_compliant',capability_verdict:'insufficient_evidence',reason:'最终答案与标准答案一致；完整推导未单独验证',format_reason:'格式有差异，答案正确性单独判断',expected_answer:'12',actual_answer:'12颗'}}
const account:TestAccount = {account_id:42,name:'本地演示账号',platform:'openai',account_type:'oauth',account_status:'active',group_ids:[],anti_degradation:true,tests:[{test_type:'pelican',latest:base,latest_completed:base,history_count:1,consecutive_anomalies:0,risk:''},{test_type:'candy',latest:candy,latest_completed:candy,history_count:1,consecutive_anomalies:0,risk:''}]}
intelligentTestsAPI.detail = async id => id === 101 ? base : candy
base.evaluation!.evaluator_version = 3
candy.evaluation!.evaluator_version = 3
;(base.config_snapshot as {execution:Record<string,unknown>}).execution.integrity_mode = 'observe'
account.tests[1].latest = { ...candy, id:103, status:'queued', queue_reason:'所选模型限流冷却尚未结束，任务延后执行', available_at:new Date(Date.now()+90000).toISOString() }
const settings:TestSetting[] = [{test_type:'candy',name:'糖果测试',enabled:true,user_visible:false,config:{prompt:'盒子里有24颗糖。小明取走总数的四分之一，小红取走剩余一半，放回3颗。',model:'',evaluator:'exact_answer',expected_answer:'12',answer_type:'number',answer_unit:'颗',answer_unit_mode:'configured',answer_format:'answer_line',timeout_seconds:120}}]
intelligentTestsAPI.saveSetting = async setting => setting // fixture only, no API write
const detailId = ref<number|null>(null), dark = ref(false)
const statisticsGroupId = ref<number | null>(null)
let fixturePolicy = defaultTrafficPolicy()
accountTrafficAPI.get = async () => ({ policy: { ...fixturePolicy }, state_available: true, hard_limit: 128, state: { effective_concurrency: 128, recommended_concurrency: 128, in_flight: 0, requests_last_minute: 0, accepted: 0, rejected_rpm: 0, rejected_concurrency: 0, upstream_429: 0, upstream_5xx: 0, completed: 0, average_duration_ms: 0 } })
accountTrafficAPI.save = async (_id, policy) => { fixturePolicy = { ...policy }; return { policy: { ...policy }, state_available: true, hard_limit: 128 } }
watch(dark, value => document.documentElement.classList.toggle('dark',value))
</script>
