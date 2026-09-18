# 官方 0.2.5 合并记录

日期：2026-09-18。此次合并保留官方历史和二开历史，没有替换整个网关实现。

## 提交边界

- 共同基线：`98d86915becae9fe9491a91ffc6defd5235c8d2b`（官方 VERSION 同步至 0.2.4）。
- 合并前二开：`15b9ddeccd23f238ecae2e2c7e3ac3af3efc2a6e`，回退分支 `codex/pre-merge-025`。
- 合入官方：`86f93c28ee34cc74b629dafb748bd5ac5ca8c5ea`（正式 `v0.2.5` 标签解引用提交）。
- 二开维护分支：`codex/custom-on-v0.2.4`。名称保留基线版本，合并后的代码版本为 0.2.5。
- 不包含官方 0.2.5 发布后的功能提交。标签中的 VERSION 仍是 0.2.4，此次显式同步为 0.2.5。

## 冲突处理

Git 报告 6 个内容冲突文件，以及 `deploy/.env.example` 的删除/修改冲突。双方相对基线共修改了 74 个相同路径，因此同时核查自动合并的网关代码。

| 文件/区域 | 合并结果 |
|---|---|
| `backend/cmd/server/wire_gen.go` | 保留二开的 ControlledHTTPUpstream 和账号流控服务，同时接入官方 Ollama 用量服务依赖；使用 Wire 重新生成，结果一致。 |
| `backend/internal/handler/admin/group_handler.go` | 保留分组安全策略字段；创建、更新及复合路由的平台校验均支持 OpenCode。 |
| `backend/internal/service/account.go` | 保留二开账号保护、代理及媒体资格策略；接入 OpenCode 的协议路由与默认地址。 |
| `backend/internal/service/openai_account_scheduler.go` | 继续使用二开的有效并发上限，保留官方 DisableStickyEscape 错误传播与调度修复。 |
| `backend/internal/service/openai_ws_pool.go` | 同时保留二开的 TLS 模板快照、账号/代理/模板连接兼容性、会话隔离，以及官方队列重选、排队指标、常驻读取保活和关闭连接清理。 |
| `frontend/src/components/layout/AppSidebar.vue` | 保留二开的账单和工单入口；订阅与购买入口接入官方站点计费模式开关。 |
| `deploy/.env.example` | 恢复官方配置模板，以支持部署说明、Apple container 初始化和环境透传检查；未生成真实部署配置。 |

### WS 容量边界

普通账号使用官方动态连接容量计算，包括默认系数 5.0 和全局连接硬上限；请求执行并发仍由并发槽限制。模式一保留二开已有的连接保护上限，不随系数放大。保护账号配置并发非正数时继续使用二开的默认有效并发，而普通非正并发账号在 mode_router_v2 下不可调度。

二开的请求语义完整性检查、保护模式下限制有损重试、流量许可和指纹身份逻辑保留。通过双方现有测试验证这些行为；本次测试不证明上游风控或模型能力效果。

### 数据库与测试兼容

- 官方新增 `238_opencode_go_platform.sql`、`238_purge_unlimited_user_platform_quotas.sql`。
- 迁移按完整文件名排序、记录和校验，二开的 `238_content_moderation_overturned.sql` 不与官方文件重名。
- 未修改二开历史 SQL 迁移或其文件名。
- 更新二开 WS 测试，使其适配官方新增的排队计时参数。
- 更新官方批量订阅路由测试，使其适配二开的 UserService 参数。
- 修正旧 schema 集成断言：二开迁移 244 已允许历史哈希密钥的明文 key 为空；同时验证 key_hash 列。未为通过测试而改变数据库设计。

## 验证结果

| 验证 | 结果 |
|---|---|
| Go 1.27.0 Wire 生成 | 通过 |
| `go test -tags=unit ./...` | 57 个测试包通过，20,156 个测试/子测试通过，28 个按测试条件跳过 |
| `go test -tags=integration ./...` | 51 个测试包通过，12,595 个测试/子测试通过，26 个按测试条件跳过 |
| `protectionintegration` 数据库专项 | 2 个包、132 个测试/子测试通过，无跳过 |
| 后端 Linux 生产编译（CGO_ENABLED=0） | 通过 |
| 前端 TypeScript 类型检查、ESLint | 通过 |
| 前端全量 Vitest | 300 个文件、2,265 个测试通过 |
| 前端 Vite 生产构建 | 通过；存在包体积提示 |
| Docker Compose 安全、网关环境透传、运行资源配置、Caddy 配置测试 | 通过 |
| Apple container 脚本语法检查 | 通过 |

后端不同标签的测试集合存在重叠，不能将以上数字相加作为独立测试数量。集成测试使用隔离的 PostgreSQL 18.1 和 Redis 8.4 容器；保护专项另外使用隔离测试数据库。没有部署到生产环境。

网络重试后完成依赖及镜像下载。WSL 上执行 Apple container 的完整测试遇到 macOS 专用 `stat -f '%Lp'`，未将此项记为通过；需要 macOS CI 验证。未运行 Go race 检查及 golangci-lint。依赖外部 API、插件或额外测试服务的条件测试存在跳过；相关本地日志保存在忽略目录 `output/merge025-*`。

## 下一步

第 4 步完成后由用户确认，再执行第 5 步，整理长期维护分支、官方更新接入方式与升级验证流程。本次不更新 GitHub main，也不部署。
