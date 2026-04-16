# Changelog

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
