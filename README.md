# DotTranslator + DotStats

即时翻译桌面工具 + 配套数据中台

## 📌 项目概览

**DotTranslator** 是一款基于 Electron 的即时翻译桌面工具，支持多引擎对比翻译、剪贴板监听、悬浮球、PiP 窗口、翻译记忆（TM）等功能。

**DotStats** 是配套的数据分析中台，包含 Analytics Server（数据采集 + 聚合）和 Desktop Dashboard（可视化看板）两个子系统。

## 🏗️ 项目结构

```
DotTranslator/
├── electron/                          # Electron 主进程
│   ├── main.ts                       # 窗口管理/系统托盘/全局快捷键/IPC/本地API
│   └── preload.ts                    # 安全 IPC 桥接 (contextBridge)
├── src/
│   ├── main/
│   │   └── database.ts              # SQLite 数据库 (WAL 模式)
│   ├── renderer/
│   │   ├── components/              # React UI 组件
│   │   │   ├── TitleBar/           # 自定义标题栏
│   │   │   ├── InputArea/          # 输入区域
│   │   │   ├── TranslationPanel/   # 翻译结果 (对比/朗读/复制/PiP)
│   │   │   ├── HistoryList/        # 翻译历史 (搜索/收藏)
│   │   │   ├── SettingsPanel/      # 设置面板 (主题/API密钥/引擎)
│   │   │   ├── StatsPage/          # 本地统计内嵌组件
│   │   │   └── AnnouncementBar/    # 公告栏 (本地文件+远程双源)
│   │   ├── stores/                  # Zustand + Immer 状态管理
│   │   └── styles/                  # CSS (亮色/暗色双主题 + Glassmorphism)
│   ├── shared/                       # 共享类型定义 + 常量
│   ├── telemetry/                    # 匿名遥测模块 (可关闭, 隐私过滤)
│   └── workers/
│       └── translation/             # 翻译引擎 (可插拔架构)
│           ├── router.ts            # 智能路由 + 并行对比
│           └── providers/
│               ├── deepl.ts        # DeepL API
│               ├── youdao.ts       # 有道智云 API v3
│               └── baidu.ts        # 百度翻译 API
└── DotStats/                          # 数据看板子项目 (pnpm workspace)
    ├── electron/                      # DotStats Electron 主进程
    ├── src/                           # React UI (ECharts 仪表盘)
    │   ├── components/
    │   │   ├── Overview/            # 📊 总览
    │   │   ├── TrendsPage/          # 📈 趋势
    │   │   ├── FeaturesPage/        # 🎯 功能分析
    │   │   ├── VersionsPage/        # 📦 版本
    │   │   ├── RetentionPage/       # 🔄 留存
    │   │   ├── GeoPage/             # 🌍 地区
    │   │   ├── ProvidersPage/       # 🔌 引擎
    │   │   ├── LiveFeedPage/        # 📋 实时事件
    │   │   ├── AlertsPage/          # 🚨 告警
    │   │   ├── SettingsPage/        # ⚙️ 设置
    │   │   └── WebSocket/           # WS 连接管理
    │   ├── stores/                    # Zustand 状态
    │   └── styles/                    # Dashboard CSS
    └── server/                        # Analytics Server (Fastify 5)
        ├── src/
        │   ├── routes/               # RESTful API 路由
        │   │   ├── events.ts        # 事件接收 (批量写入)
        │   │   ├── stats.ts         # 统计查询 (趋势/功能/留存/地区/版本/引擎)
        │   │   ├── admin.ts         # 管理接口 (实例删除/数据导出)
        │   │   └── health.ts        # 健康检查
        │   ├── services/
        │   │   ├── redis.ts         # Redis 实时计数 (在线/DAU/WAU/Feature)
        │   │   └── websocket.ts     # WebSocket 实时广播
        │   ├── db/
        │   │   └── pool.ts          # PostgreSQL 连接池 + Schema 自动初始化
        │   ├── tasks/
        │   │   ├── cron.ts          # 定时任务 (日聚合/留存/归档/清理)
        │   │   └── alerts.ts        # 告警规则引擎
        │   └── middleware/
        │       └── auth.ts          # Admin API Key 认证
        ├── docker-compose.yml        # 一键部署 (API + PostgreSQL + Redis + Nginx)
        ├── Dockerfile
        ├── nginx/nginx.conf
        └── db/init.sql               # PostgreSQL 初始化 Schema
```

## ✨ DotTranslator 功能清单

### 核心翻译

| 功能 | 说明 |
|---|---|
| 多引擎翻译 | DeepL / 有道翻译 / 百度翻译，可插拔架构 |
| 并行对比 | 同时调用多个引擎，结果并排显示 |
| 智能路由 | 基于错误率+成本+可用性自动选择最佳引擎 |
| 语言检测 | 自动检测源语言 |
| TM 精确匹配 | 翻译记忆库，相同文本直接返回缓存 |

### 窗口形态

| 窗口 | 说明 |
|---|---|
| 主窗口 | 420×560 无边框透明窗口，亮/暗双主题 |
| 悬浮球 | 48×48 常驻圆形，可拖拽，单击切换主窗口 |
| PiP 窗口 | 320×160 画中画，支持复制/朗读 |
| 迷你卡片 | 200×80 跟随鼠标，剪贴板翻译即时预览 |

### 交互功能

| 功能 | 说明 |
|---|---|
| 全局快捷键 | `Alt+Space` 唤出/隐藏主窗口 |
| 截图 OCR | `Ctrl+Shift+X` 截图 (PaddleOCR Phase 2) |
| 剪贴板监听 | 自动检测剪贴板变化并翻译 |
| 语音朗读 (TTS) | Web Speech API 多语言朗读 |
| 公告栏 | 本地 .txt 文件 + 远程服务器双源 |
| 系统托盘 | 常驻托盘，关闭按钮最小化到托盘 |

### 安全与隐私

| 功能 | 说明 |
|---|---|
| 无痕模式 | 关闭所有数据记录和遥测 |
| 剪贴板过滤 | Luhn 银行卡校验/手机号/身份证精确过滤 |
| API Key 加密 | 使用 Electron safeStorage 加密存储 |
| CSP | Content Security Policy 分开发/生产环境 |
| 安全 IPC | contextBridge + sandbox + nodeIntegration:false |
| 遥测隐私白名单 | 仅上报脱敏的 feature 统计，绝不上传文本内容 |
| 本地 HTTP API | 仅监听 127.0.0.1，随机 Token 认证 |

### 数据存储

| 数据库 | 用途 |
|---|---|
| SQLite (WAL) | 翻译历史 / TM / 设置 / 本地统计 / 引擎指标 |
| PostgreSQL | 远程分析数据 (实例/事件/日聚合/留存) |
| Redis | 实时计数 (在线/DAU/WAU/Feature) |

## 📊 DotStats 服务端 API

| 端点 | 方法 | 说明 |
|---|---|---|
| `/api/v1/events` | POST | 遥测事件接收 (批量, 事务, UNNEST) |
| `/api/v1/stats/realtime` | GET | 实时统计 (在线/DAU/WAU/功能排行/版本/OS) |
| `/api/v1/stats/trend` | GET | 时序趋势 (DAU/新实例/心跳/调用量) |
| `/api/v1/stats/features` | GET | 功能分析 (调用量+独立用户) |
| `/api/v1/stats/retention` | GET | 周留存快照 (W1/W2/W4/W8/W12) |
| `/api/v1/stats/geo` | GET | 地区分布 (locale 统计) |
| `/api/v1/stats/versions` | GET | 版本分布 |
| `/api/v1/stats/providers` | GET | 引擎调用分布 |
| `/api/v1/stats/providers/metrics` | GET | 引擎性能 (延迟/成功率) |
| `/api/v1/stats/privacy` | GET | 隐私模式统计 |
| `/api/v1/health` | GET | 健康检查 (PostgreSQL + Redis) |
| `/api/v1/instances/:id` | DELETE | GDPR 合规: 实例级联删除 |
| `/api/v1/admin/export` | GET | 数据导出 (JSON/CSV) |
| `/ws` | WebSocket | 实时事件流广播 |

### 定时任务

| 任务 | 频率 | 说明 |
|---|---|---|
| 在线状态清理 | 每 10 分钟 | 清除过期在线实例 |
| 日聚合 | 每天 02:00 | 聚合 DAU/调用量/版本/OS/Feature 分布 |
| 留存计算 | 每周一 03:00 | 计算 W1/W2/W4/W8/W12 周留存 |
| 不活跃标记 | 每天 04:00 | 30 天未活跃实例标记为非活跃 |
| 数据归档 | 每月 1 日 05:00 | 删除 6 个月以上的原始事件 |
| 告警检查 | 每 5 分钟 | 检查告警规则并触发通知 |

## 📊 DotStats 客户端页面

| 页面 | 路由 | 数据源 | 图表类型 | 状态 |
|---|---|---|---|---|
| 📊 总览 | `overview` | `/stats/realtime` + WebSocket | 指标卡片 + 柱状图 + 饼图 × 2 + 事件流 | ✅ 已实现 |
| 📈 趋势 | `trends` | `/stats/trend` | 面积折线图 × 4 (DAU/新实例/心跳/调用量) | ✅ 已实现 |
| 🎯 功能分析 | `features` | `/stats/features` | 水平柱状图 (总调用 + 独立用户) | ✅ 已实现 |
| 📦 版本 | `versions` | `/stats/versions` | 环形饼图 + 版本明细表格 | ✅ 已实现 |
| 🔄 留存 | `retention` | `/stats/retention` | 热力色块留存表格 | ✅ 已实现 |
| 🌍 地区 | `geo` | `/stats/geo` | 彩色柱状图 + 地区明细列表 | ✅ 已实现 |
| 🔌 引擎 | `providers` | `/stats/providers` + `/stats/providers/metrics` | 饼图 + 引擎性能摘要卡片 | ✅ 已实现 |
| 📋 实时事件 | `livefeed` | WebSocket `/ws` | 全屏事件流 (暂停/条数控制) | ✅ 已实现 |
| 🚨 告警 | `alerts` | Admin API | 告警规则 CRUD (创建/编辑/启用/删除) | ✅ 已实现 |
| ⚙️ 设置 | `settings` | `/health` + Admin API | 健康检查/认证配置/数据导出/GDPR 删除 | ✅ 已实现 |

## 🔧 快速开始

### DotTranslator 客户端

```bash
# 安装依赖
npm install

# 开发模式 (Vite HMR)
npm run dev

# Electron 开发模式
npm run electron:dev

# 打包
npm run electron:build
```

### Analytics Server (Docker)

```bash
cd DotStats/server

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 DB_PASSWORD / ADMIN_API_KEY 等

# 启动全套服务 (API + PostgreSQL + Redis + Nginx)
docker compose up -d

# 查看日志
docker compose logs -f api
```

### DotStats 看板

```bash
cd DotStats

# 安装依赖
npm install

# 开发模式
npm run dev

# Electron 打包
npm run electron:build
```

## 🔌 翻译引擎

| 引擎 | API 类型 | 特点 |
|---|---|---|
| DeepL | 官方 REST API | 高质量，需 API Key |
| 有道翻译 | 有道智云 API v3 | 中文优化，需 App ID + Secret |
| 百度翻译 | 百度开放 API | 广泛语言支持，需 App ID + Secret |

引擎采用插件化设计，实现 `TranslationProvider` 接口即可扩展新引擎：

```typescript
interface TranslationProvider {
  readonly id: string;
  readonly name: string;
  readonly requiresApiKey: boolean;
  translate(params: TranslateParams): Promise<TranslateResult>;
  detectLanguage(text: string): Promise<LanguageDetection>;
  isAvailable(): Promise<boolean>;
}
```

## 🛡️ 安全架构

```
┌──────────────────────────────────────────────────┐
│                  Electron App                     │
│  ┌────────────┐  contextBridge  ┌──────────────┐ │
│  │ Main Process│ ──────────────→│ Renderer     │ │
│  │ (Node.js)  │  IPC only      │ (Sandboxed)  │ │
│  │            │                 │ no Node APIs │ │
│  │ • SQLite   │                 │ • React UI   │ │
│  │ • IPC Hub  │                 │ • Zustand    │ │
│  │ • HTTP API │                 │ • ECharts    │ │
│  │ • safeStore│                 └──────────────┘ │
│  └────────────┘                                   │
│  CSP: default-src 'self' (prod)                   │
│  Navigation: 仅允许同源                            │
│  Window.open: 全部拦截                             │
└──────────────────────────────────────────────────┘
```

## 📦 技术栈

| 层级 | 技术 |
|---|---|
| 桌面框架 | Electron 33 |
| 前端 | React 19 + TypeScript 5.6 |
| 构建工具 | Vite 6 + vite-plugin-electron |
| 状态管理 | Zustand 5 + Immer |
| 本地存储 | better-sqlite3 (WAL 模式) |
| 服务端 | Fastify 5 + PostgreSQL 16 + Redis 7 |
| 实时通信 | WebSocket (@fastify/websocket) |
| 图表 | ECharts 5 + echarts-for-react |
| 样式 | CSS Variables + Tailwind CSS 3 |
| API 校验 | Zod |
| 日志 | Pino |
| 部署 | Docker Compose + Nginx |
| 包管理 | pnpm workspace (monorepo) |

## 📄 License

MIT
