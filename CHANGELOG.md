# Changelog

## v0.3.4 (2026-04-17)

### 🐛 修复
- **provider_metrics 成功率统计** — 遥测事件现区分成功/失败调用，服务端聚合时分别计数，avg_latency 仅基于成功调用计算（修复前所有调用均被计为成功）
- **events 端点独立限流** — `/api/v1/events` 添加 route-level rate limit (30 req/min)，比全局 100 req/min 更严格，防止异常客户端刷写数据库
- **macOS 窗口关闭行为** — `window-all-closed` 不再无条件退出应用，macOS 上保留 dock 图标；新增 `activate` 事件，点击 dock 图标可恢复/创建窗口

### 🔐 安全
- **CSP 加固** — 生产模式 CSP 改为分指令显式声明：
  - 新增 `script-src 'self'`（不再依赖 default-src 兜底）
  - 移除 `style-src 'unsafe-inline'`（如有内联样式报错需排查改为 CSS 类）
  - 新增 `connect-src 'self'`（限制 fetch/XHR 目标）
  - 新增 `frame-ancestors 'none'`（禁止被 iframe 嵌入）

### 📦 版本
- DotTranslator: 0.3.3 → **0.3.4**
- DotStats Server: 0.2.1 → **0.2.2**

---

## v0.3.3 (2026-04-17)

### 🔐 安全
- **Webhook URL 校验** — 告警通知目标 URL 强制 HTTPS + 拒绝 localhost/127.* 内网地址，防止 SSRF
- **Stats 端点警告** — 未配置 `STATS_VIEW_KEY` 时启动日志打印安全警告，提醒生产环境开启认证

### 🐛 修复
- **主题持久化** — 修复 `currentTheme` 硬编码为 'light' 的 bug，现从 SQLite 加载上次选择的主题，IPC 变更时自动持久化
- **health.ts 类型错误** — 修复 Redis `ping()` 方法的 TypeScript 联合类型报错（TS2339）
- **SettingsPage 测试** — 修正测试断言文本与实际组件不匹配（3 个失败用例）

### ⚡ 性能
- **留存 SQL 优化** — 周留存计算从 LEFT JOIN 全表扫描改为 CTE + 按窗口范围子查询，利用 `received_at` 索引

### 🏗️ 工程
- **SQLite 迁移系统** — 新增 `_migrations` 跟踪表，迁移可追溯、幂等执行，替代 ad-hoc try/catch
- **公告白名单常量化** — `ANNOUNCEMENT_ALLOWED_HOSTS` 从函数局部变量提取为模块级常量
- **IPC 导入统一** — `ipc-handlers.ts` 中 `.then()` 链全部改为 `async/await` 风格
- **移除未使用 import** — 清理 `main.ts` 中 `ipcMain` 的 eslint-disable 注释

### 🧪 测试
- **新增 4 个测试文件**（676 行）：
  - `ipc-validator.test.ts` — 30+ 用例覆盖全部验证函数
  - `fallback.test.ts` — 免费翻译引擎 API 集成 + 错误处理
  - `baidu.test.ts` — 百度翻译凭据检查 + 错误码 + 成功流程
  - `secure-storage.test.ts` — JSON 序列化往返 + Key 删除
- DotStats 前端测试从 13/16 提升至 **16/16 全通过**
- DotStats Server 测试 **17/17 全通过**
- DotTranslator 测试 **48/48 全通过**
- **总计 81 测试全部通过**

### 📦 版本
- DotTranslator: 0.3.2 → **0.3.3**
- DotStats: 0.2.1 → **0.2.2**
- DotStats Server: 0.2.0 → **0.2.1**

---

## v0.3.1 (2026-04-16)

### 🔐 安全修复
- **时序攻击防护** — 管理员认证从 `!==` 改为 `crypto.timingSafeEqual`，防止时序侧信道攻击
- **SSRF 防护** — 公告栏远程 URL 请求限制为 HTTPS + 白名单域名（GitHub、jsDelivr、unpkg）
- **告警冷却机制** — 新增 `cooldown_minutes` 字段（默认 60 分钟），防止告警规则重复触发刷屏

### 🐛 修复
- **provider_metrics Schema 一致** — `init.sql` 和 `pool.ts` 的 `provider_metrics` 表统一包含 `total_latency` + `avg_latency` 两列
- **WebSocket 广播稳定性** — 新增连续错误计数退避（5 次后静默跳过）+ 客户端 `error` 事件处理
- **留存数据清理** — 月度归档任务新增 16 周以上留存快照清理
- **Schema 同步** — `init.sql` 与 `pool.ts` 所有表结构完全一致

## v0.3.0 (2026-04-16)

### 🎉 新功能
- **免费翻译引擎** — 新增 MyMemory API 兜底引擎，无需 API Key 即可使用翻译功能
- **OCR 截图识别** — Ctrl+Shift+X 截图后自动 OCR 识别文字并填入翻译框（基于 Tesseract.js，支持中英文）
- **历史记录管理** — 支持导出 JSON、单条删除、批量选择删除、清空全部
- **窗口自动调整** — 主窗口跟随内容变化自动调整尺寸
- **DotStats 轻量模式** — `LITE_MODE=1` 环境变量启用 SQLite + 内存存储，无需 PostgreSQL / Redis / Docker

### 🔐 安全
- **事件接收端点认证** — `/api/v1/events` 新增 `INGEST_API_KEY` Bearer Token 认证，与 admin key 分离
- **翻译路由超时保护** — 单引擎调用 10s 超时，防止 API 卡死阻塞整个翻译流程

### 🐛 修复
- 修复悬浮球非真圆形（setShape 逻辑重写为逐行圆形 hit region）
- 修复悬浮球主题不随主窗口同步
- 修复 PiP 窗口关闭按钮无效（改用 `_internal.send('pip:close')`）
- 修复 PiP 窗口主题不跟随主窗口
- 修复公告栏不显示（远程 URL 修正 + 添加本地 announcement.txt 测试文件）
- 修复最大化/还原按钮图标不切换（添加窗口状态跟踪）
- 修复 `provider_metrics` 平均延迟计算偏差（改用 `total_latency` 累积存储）
- 修复错误率统计窗口到期后骤降（改用 EMA 指数移动平均平滑）
- 修复 DotStats health 测试字段名不匹配

### 🎨 改进
- 应用图标更换为翻译主题设计（"A文" + 双向翻译箭头）
- 设置界面各区块添加虚线分隔
- 翻译 API 申请链接确认可用（DeepL / 有道智云 / 百度翻译）

### 🏗️ 架构
- **main.ts 模块化拆分** — 956 行拆分为 5 个职责清晰的模块：
  - `secure-storage.ts` — safeStorage 加密存储（52 行）
  - `clipboard-monitor.ts` — 剪贴板监听 + 敏感内容过滤（147 行）
  - `local-api.ts` — 本地 HTTP API 服务（100 行）
  - `ipc-handlers.ts` — 所有 IPC 注册（491 行）
  - `main.ts` — 编排层（284 行，减少 70%）
- **WebSocket 批量广播** — 事件推送从逐条发送改为单次批量推送
- **LITE_MODE SQL 统一** — 占位符统一为 `$1` 风格，由 normalizeSQL 转换

### 🧪 测试
- 新增 Vitest 单元测试（TranslationRouter 8 项 + Constants 8 项）
- DotStats 测试从 9/16 提升至 17/17 全通过
- `npm test` 运行全部测试

### 🏗️ 基础设施
- DotStats server 支持 `LITE_MODE=1` 轻量部署
- 新增 `npm run dev:lite` / `npm run start:lite` 脚本
- DotStats 健康检查接口新增 mode 字段（lite / production）

---

## v0.2.0 (2026-04-14)

初始版本
- Electron 33 + React 19 + Vite 6 技术栈
- 多引擎翻译（DeepL / 有道 / 百度）
- 亮/暗双主题 + Glassmorphism
- 翻译记忆（TM）精确匹配
- 剪贴板监听 + 安全过滤
- 悬浮球 / PiP 画中画 / 迷你卡片
- DotStats 数据分析中台（PostgreSQL + Redis + WebSocket）
- 遥测 + 隐私保护
