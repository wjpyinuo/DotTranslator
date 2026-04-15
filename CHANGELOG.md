# Changelog

## v0.3.0 (2026-04-16)

### 🎉 新功能
- **免费翻译引擎** — 新增 MyMemory API 兜底引擎，无需 API Key 即可使用翻译功能
- **OCR 截图识别** — Ctrl+Shift+X 截图后自动 OCR 识别文字并填入翻译框（基于 Tesseract.js，支持中英文）
- **历史记录管理** — 支持导出 JSON、单条删除、批量选择删除、清空全部
- **窗口自动调整** — 主窗口跟随内容变化自动调整尺寸
- **DotStats 轻量模式** — `LITE_MODE=1` 环境变量启用 SQLite + 内存存储，无需 PostgreSQL / Redis / Docker

### 🐛 修复
- 修复悬浮球非真圆形（setShape 逻辑重写为逐行圆形 hit region）
- 修复悬浮球主题不随主窗口同步
- 修复 PiP 窗口关闭按钮无效（改用 `_internal.send('pip:close')`）
- 修复 PiP 窗口主题不跟随主窗口
- 修复公告栏不显示（远程 URL 修正 + 添加本地 announcement.txt 测试文件）
- 修复最大化/还原按钮图标不切换（添加窗口状态跟踪）

### 🎨 改进
- 应用图标更换为翻译主题设计（"A文" + 双向翻译箭头）
- 设置界面各区块添加虚线分隔
- 翻译 API 申请链接确认可用（DeepL / 有道智云 / 百度翻译）

### 🧪 测试
- 新增 Vitest 单元测试（TranslationRouter 8 项 + Constants 8 项）
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
