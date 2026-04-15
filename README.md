# DotTranslator + DotStats

即时翻译桌面工具 + 配套数据中台

## 项目结构

```
DotTranslator/
├── electron/                  # Electron 主进程
│   ├── main.ts               # 窗口管理、系统托盘、全局快捷键
│   └── preload.ts            # 安全 IPC 桥接
├── src/
│   ├── main/                 # 核心业务逻辑
│   │   └── database.ts       # SQLite 数据库 (历史/TM/设置/统计)
│   ├── renderer/             # React UI
│   │   ├── components/       # 组件 (TitleBar/InputArea/TranslationPanel/HistoryList/SettingsPanel/StatsPage)
│   │   ├── stores/           # Zustand 状态管理
│   │   └── styles/           # CSS (拟态 + Glassmorphism 双主题)
│   ├── shared/               # 共享类型和常量
│   ├── telemetry/            # 匿名遥测模块 (可关闭)
│   └── workers/              # 翻译引擎 (DeepL/Google/百度) + 智能路由
└── DotStats/                  # 数据看板子项目
    ├── electron/              # DotStats Electron 主进程
    ├── src/                   # React UI (ECharts 仪表盘)
    └── server/                # Analytics Server
        ├── src/
        │   ├── routes/       # API 路由 (事件接收/统计查询/管理)
        │   ├── services/     # Redis 实时计数 + WebSocket 推送
        │   ├── db/           # PostgreSQL 连接池 + Schema
        │   └── tasks/        # 定时任务 (日聚合/归档)
        ├── docker-compose.yml
        ├── Dockerfile
        └── nginx/
```

## 快速开始

### DotTranslator 客户端
```bash
npm install
npm run dev          # Vite 开发服务器
npm run electron:dev # Electron + Vite 开发模式
```

### Analytics Server
```bash
cd DotStats/server
docker compose up -d    # 启动 PostgreSQL + Redis + API
```

### DotStats 看板
```bash
cd DotStats
npm install
npm run dev
```

## 技术栈

| 组件 | 技术 |
|---|---|
| 客户端框架 | Electron 33 + React 19 + Vite 6 |
| 状态管理 | Zustand 5 + Immer |
| 本地存储 | better-sqlite3 (WAL) |
| 翻译引擎 | DeepL / Google / 百度 (可插拔) |
| 服务端 | Fastify 5 + PostgreSQL 16 + Redis 7 |
| 实时通信 | WebSocket |
| 图表 | ECharts 5 |
| 样式 | CSS Variables + Tailwind CSS |

## License

MIT
