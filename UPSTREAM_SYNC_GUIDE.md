# 官方版本跟随维护流程

当前稳定维护入口：`codex/custom-on-v0.2.5`。

当前提交同时具有两个父提交：二开提交 `15b9dde` 和官方 `v0.2.5` 提交 `86f93c28`。以后每次升级都从当前维护分支合并官方正式发布提交，保留 Git 的共同祖先和冲突上下文。

## 每次升级

在本地仓库执行：

```bash
git fetch upstream --tags --prune
git switch codex/custom-on-v0.2.5
git pull --ff-only origin codex/custom-on-v0.2.5
```

确定官方正式标签的解引用提交，不使用仅修改 `VERSION` 的后续提交：

```bash
git rev-parse vX.Y.Z^{commit}
git show -s --format='%H %ad %s' vX.Y.Z^{commit}
```

为本次升级保留官方指针和回退点：

```bash
git branch upstream-vX.Y.Z vX.Y.Z^{commit}
git branch codex/pre-merge-X-Y-Z HEAD
```

合并官方版本：

```bash
git merge --no-ff upstream-vX.Y.Z \
  -m "merge: integrate upstream vX.Y.Z with custom account protection"
```

解决冲突后，优先检查以下区域：

- `backend/internal/service/openai_ws_pool.go`：官方连接池容量、排队重选、常驻读循环、上游关闭处理；二开 TLS 模板、账号/代理/模板兼容性、模式一保护上限。
- `backend/internal/service/openai_account_scheduler.go`、`openai_gateway_scheduling.go`：官方调度和错误传播；二开有效并发、流量控制和分发策略。
- `backend/internal/service/openai_ws_forwarder_ingress.go`、`openai_ws_forwarder_v2.go`、`openai_gateway_forward.go`：二开身份收敛、请求完整性检查和有损重试保护。
- `backend/internal/service/account.go`、账号保护相关文件：二开策略标记、指纹身份和代理规则。
- `backend/cmd/server/wire_gen.go`：冲突解决后运行 `go generate ./cmd/server`，不要手工维护生成文件。
- `backend/migrations/`：迁移按完整文件名排序执行；不能复用已经发布的迁移文件名，也不要改写已应用 SQL。
- `frontend/src/components/layout/AppSidebar.vue` 和站点计费入口：合并入口开关及二开菜单。

对 WS 连接容量要分清两层：官方系数控制可保留的会话连接数，请求执行并发仍由并发槽限制；二开模式一的保护上限不能被官方系数放大。

## 合并后检查

在 WSL/Linux 或 CI 中执行：

```bash
cd backend
gofmt -w <本次冲突处理过的 Go 文件>
go generate ./cmd/server
go test -tags=unit ./...
go test -tags=integration ./...
CGO_ENABLED=0 go build -trimpath -o bin/server ./cmd/server

cd ../frontend
pnpm install --frozen-lockfile
pnpm exec vue-tsc --noEmit
pnpm exec eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts
pnpm exec vitest run
pnpm exec vite build
```

涉及账号保护、Redis 流控、迁移或用户清理时，再运行隔离数据库专项测试：

```bash
go test -tags=protectionintegration \
  ./internal/repository ./internal/service \
  -run 'Test(AccountProtection|AccountTraffic|GroupDetailStats|ProtectionTransitionDatabase|ProtectedProxy|RateLimitObservation|UserHierarchy|UserResource|UserCleanup|Intelligent)' \
  -count=1 -timeout=10m
```

检查结果后再提交和推送：

```bash
git diff --check
git diff --name-only --diff-filter=U
git status --short
git commit -m "merge: integrate upstream vX.Y.Z with custom account protection"
git push origin codex/custom-on-v0.2.5
```

冲突未清完、生成代码未更新、迁移测试未通过或保护专项无法运行时，不要把合并提交推到维护入口。可用 `codex/pre-merge-X-Y-Z` 回退到合并前状态。

## 分支约定

- `codex/custom-on-v0.2.5`：当前二开长期维护入口。
- `codex/custom-on-v0.2.4`：本次合并过程分支，保留历史，不再作为后续默认入口。
- `codex/pre-merge-025`：本次合并前回退点。
- `codex/custom-site-snapshot`：最初新站快照。
- `main`：用户 fork 的官方分支，本流程不直接修改。

每个正式合并完成后，可以在合并提交上创建对应的 `custom-vX.Y.Z` 标签，作为部署和回退标识。部署前仍需根据环境执行数据库备份、迁移演练和 macOS Apple container 验证。
