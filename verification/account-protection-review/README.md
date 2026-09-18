# 账号保护专项复现

> 后续修复已完成本地验证，当前状态见项目根目录 `LOCAL_REPAIR_RESULTS_2026-09-14.md`。本目录的旧失败日志保留作为历史证据，最终通过结果为 `final-*.json`。

日期：2026-09-14。本目录保留本地审查证据。审查后已按用户要求修改本地默认策略及相关恢复逻辑，见项目根目录 `LOCAL_PROTECTION_STATUS_2026-09-14.md`；未部署服务器。

两个 `.go.txt` 文件通过 Go `-overlay` 作为临时测试文件编译进对应包；真实的 `backend/internal/**/protection_review_external_test.go` 文件不存在。它们不会进入正常构建或普通测试。移动项目后需要调整 `overlay.json` 中的绝对路径。

在 backend 目录执行：

```powershell
& '..\..\.tools\go\bin\go.exe' test -overlay '../verification/account-protection-review/overlay.json' ./internal/service ./internal/repository -run '^TestProtectionReview' -count=1 -v -timeout=60s
```

测试用期望的不变量做断言；当前代码下出现失败是缺陷复现结果，不是修复后的通过报告。

- service：9 个配置子测试，8 个失败、1 个模式一还原对照通过；3 个实际本地 WSS 子测试均复现身份未一致应用。原始输出在 `service-reproduction.log`。
- repository：`no_marker_before_first_enable` 失败；`explicit_false_marker_control` 通过。前者传入无任何保护字段的旧快照，保护合并函数跳过了数据库中已开启的策略，后者则会读取并合并。使用 SQL mock 验证最终合并边界，没有声称完成真实 PostgreSQL 并发测试。
- 总计 14 个叶子用例：12 个期望未满足、2 个对照通过。TLS 预览用例表达的是需要展示有效传输和全局开关屏蔽原因的可观测性要求；全局开关关闭 TLS 本身是预期行为。
- WSS 使用本地 `httptest.NewTLSServer`，验证实际上游握手头及回显请求体。日志里的 `chatgpt.com` 是被测代码计算的逻辑目标，注入的拨号器实际连接本机回环服务器，未发送真实上游请求。
- 配置用例通过真实 `adminServiceImpl`/保护服务和内存测试仓库运行。策略切换失败通过在第二次更新注入错误复现；它验证服务调用顺序和错误后的状态，不是数据库故障注入。

同期既有测试：service/repository 的保护、模式一与身份相关定向回归通过；admin handler 包该正则没有匹配的测试，不计为 handler 行为验收。前端保护组件/API 3 文件、20 项通过。

## 默认策略调整后的复验

`after-legacy-default.log` 是后续本地修改后的实际输出：14 个叶子用例中 6 个通过、8 个仍失败。原本失败的标准策略 TLS 开关还原、legacy 自定义模板还原、generic 转 mode1、未知模式拒绝这 4 项已经通过。原始 `service-reproduction.log` 不覆盖，保留修改前证据。

模式一还原对照用例已改为显式选择 `mode1`，以保持原有测试目标，不让默认改为 legacy 后改变该对照的含义。其余专项断言继续暴露尚未修复的问题，不纳入默认发布测试。

## 后续修复后的最终复验

原 14 个叶子场景已全部通过。切换测试现在同时断言“写入失败保留旧状态”和“成功切换只有一次持久更新”；TLS 预览测试分别断言目标模板、有效计划和未观测状态。WSS 测试扩展到首帧及后续帧。普通发布测试中已加入 `account_protection_regression_test.go`，不再依赖手工 overlay 才能发现回归。

`final-backend-unit.json`、`final-postgres.json`、`final-ws-focused.json` 与 `final-original-reproductions.json` 分别记录全量单元、真实数据库、后续定向回归及原始复现场景结果。
