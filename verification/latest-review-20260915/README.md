# 最新版本地复现记录

> 本地修复已完成，当前结果见 `../../LOCAL_UI_BUGFIX_RESULTS_2026-09-15.md`。下面的原失败用例和日志保留作审查历史。新回归用例已进入常规源码测试目录；统一保存已替代原独立保存流程，不能按旧按钮结构判断新界面是否修复。

这些是只供审查的期望断言，当前失败代表待修缺陷。没有改动真实业务源文件。

- `frontend-reproductions.json`：8 条组件边界断言失败。
- `backend-reproductions.json`：5 条服务/缓存边界断言失败。
- `existing-tests.json`：原有相关前端 41 项通过，0 失败。
- 后端两个 `.go.txt` 经 `overlay.json` 临时编译，不在正常业务源码内。
- 前端测试在 `frontend/verification/latest-review-20260915/`，使用单独 Vitest 配置，不进入默认 `src/**` 用例集合。

执行（项目根目录）：

```powershell
node verification/latest-review-20260915/run-backend.cjs
```

前端（frontend 目录）：

```powershell
node node_modules/vitest/vitest.mjs run --config verification/latest-review-20260915/vitest.config.ts --reporter=json --outputFile=../verification/latest-review-20260915/frontend-reproductions.json
```

测试只使用 Vue 组件、模拟 API、内存缓存服务和本地 miniredis，不连接远程服务器、不启动业务数据库。覆盖：旧流量配置回写、双保存并行、草稿丢失、并发回填、状态乱序、隐藏表单校验、Esc 弹窗连关、滚动锁、观察模式旧计划拒绝、失败终止事件分类、调低 RPM 的等待时间。

后端“关闭时的无效参数”用例刻画当前服务拒绝输入的行为。最终修复也可以让前端规范化隐藏参数，并保留后端严格格式校验；不必为通过这一断言而放宽全局配置校验。

校验发布源码包清单时，3,940 个 backend 与 frontend/src 文件均与发布包一致。本轮未对这些文件打补丁。完整清单见根目录 `LATEST_REVIEW_2026-09-15.md`。
