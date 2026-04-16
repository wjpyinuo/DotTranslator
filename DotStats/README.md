# DotStats — 数据分析中台

DotTranslator 的配套数据分析平台，包含 **Analytics Server**（数据采集 + 聚合）和 **Desktop Dashboard**（可视化看板）两个子系统。

## 架构

```
┌──────────────────────────────────────────────────────────────┐
│  DotStats Desktop (Electron + React + ECharts)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Overview  │  │ Trends   │  │ Retention│  │ LiveFeed │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Features │  │ Versions │  │ Geo      │  │ Alerts   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
│                        │ WebSocket + REST                    │
└────────────────────────┼─────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│  Analytics Server (Fastify 5)                                │
│                                                              │
│  Routes          Services           Tasks                    │
│  ──────          ────────           ─────                    │
│  /events         Redis (实时计数)    每 10min 在线清理        │
│  /stats/*        WebSocket (广播)   每天 02:00 日聚合        │
│  /admin/*                           每周一 03:00 留存计算    │
│  /health                            每天 04:00 不活跃标记    │
│                                     每月 1 日归档+清理       │
│                                     每 5min 告警检查         │
│                                                              │
│  DB: PostgreSQL 16    Cache: Redis 7    Deploy: Docker       │
└──────────────────────────────────────────────────────────────┘
```

## 快速开始

### 前置要求

- Node.js 22+
- Docker & Docker Compose（生产部署）
- PostgreSQL 16 + Redis 7（本地开发可选）

### 1. 启动 Analytics Server

```bash
cd server

# 配置环境变量
cp .env.example .env
# 编辑 .env 填入 DB_PASSWORD / ADMIN_API_KEY 等

# Docker 一键部署（推荐）
docker compose up -d

# 查看日志
docker compose logs -f api

# 或本地开发
npm install
npm run dev
```

### 2. 启动 Dashboard

```bash
cd DotStats

# 安装依赖
npm install

# 开发模式
npm run dev

# Electron 打包
npm run electron:build
```

## API 端点

| 端点 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/v1/events` | POST | 遥测事件接收（批量） | `INGEST_API_KEY` |
| `/api/v1/stats/realtime` | GET | 实时统计 | 无 |
| `/api/v1/stats/trend` | GET | 时序趋势 | 无 |
| `/api/v1/stats/features` | GET | 功能分析 | 无 |
| `/api/v1/stats/retention` | GET | 周留存快照 | 无 |
| `/api/v1/stats/geo` | GET | 地区分布 | 无 |
| `/api/v1/stats/versions` | GET | 版本分布 | 无 |
| `/api/v1/stats/providers` | GET | 引擎调用分布 | 无 |
| `/api/v1/stats/providers/metrics` | GET | 引擎性能 | 无 |
| `/api/v1/stats/privacy` | GET | 隐私模式统计 | 无 |
| `/api/v1/health` | GET | 健康检查 | 无 |
| `/api/v1/instances/:id` | DELETE | GDPR 实例删除 | `ADMIN_API_KEY` |
| `/api/v1/admin/export` | GET | 数据导出 | `ADMIN_API_KEY` |
| `/api/v1/admin/alerts` | CRUD | 告警规则管理 | `ADMIN_API_KEY` |
| `/ws` | WebSocket | 实时事件流 | `WS_TOKEN` |

完整 API 文档：启动服务后访问 `/api/v1/health` 验证连接。

## Dashboard 页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 📊 总览 | `/overview` | 指标卡片 + 分布图 + 事件流 |
| 📈 趋势 | `/trends` | DAU/新实例/心跳/调用量时序图 |
| 🎯 功能分析 | `/features` | 功能调用量 + 独立用户排行 |
| 📦 版本 | `/versions` | 版本分布饼图 + 明细表 |
| 🔄 留存 | `/retention` | W1-W12 周留存热力表 |
| 🌍 地区 | `/geo` | 地区分布柱状图 |
| 🔌 引擎 | `/providers` | 翻译引擎调用和性能 |
| 📋 实时事件 | `/livefeed` | WebSocket 实时事件流 |
| 🚨 告警 | `/alerts` | 告警规则 CRUD |
| ⚙️ 设置 | `/settings` | 健康检查/认证/导出/GDPR |

## 定时任务

| 任务 | 频率 | 说明 |
|------|------|------|
| 在线状态清理 | 每 10 分钟 | 清除过期在线实例 |
| 日聚合 | 每天 02:00 | 聚合 DAU/调用量/版本/OS/Feature 分布 |
| 留存计算 | 每周一 03:00 | 计算 W1/W2/W4/W8/W12 周留存 |
| 不活跃标记 | 每天 04:00 | 30 天未活跃实例标记为非活跃 |
| 数据归档 | 每月 1 日 05:00 | 删除 6 个月以上的原始事件 + 清理旧留存 |
| 告警检查 | 每 5 分钟 | 检查告警规则并触发通知 |

## 告警通知配置

告警支持 Webhook 通知。配置示例：

### 钉钉机器人

```json
{
  "name": "DAU 下降告警",
  "metric": "dau_drop_pct",
  "operator": ">",
  "threshold": 20,
  "window_hours": 24,
  "notify_channel": "webhook",
  "notify_target": "https://oapi.dingtalk.com/robot/send?access_token=YOUR_TOKEN",
  "is_enabled": true,
  "cooldown_minutes": 60
}
```

### 企业微信机器人

```json
{
  "name": "在线人数异常",
  "metric": "online_now",
  "operator": "<",
  "threshold": 1,
  "window_hours": 1,
  "notify_channel": "webhook",
  "notify_target": "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY",
  "is_enabled": true,
  "cooldown_minutes": 120
}
```

### Slack Incoming Webhook

```json
{
  "name": "错误率告警",
  "metric": "error_rate",
  "operator": ">",
  "threshold": 5,
  "window_hours": 1,
  "notify_channel": "webhook",
  "notify_target": "https://hooks.slack.com/services/T00/B00/xxxx",
  "is_enabled": true,
  "cooldown_minutes": 30
}
```

Webhook POST Body 格式：

```json
{
  "alert": "DAU 下降告警",
  "metric": "dau_drop_pct",
  "value": 25.3,
  "operator": ">",
  "threshold": 20,
  "triggeredAt": "2026-04-16T10:00:00.000Z"
}
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务端口 |
| `HOST` | `0.0.0.0` | 监听地址 |
| `LOG_LEVEL` | `info` | 日志级别 |
| `DB_PASSWORD` | — | PostgreSQL 密码（必填） |
| `DATABASE_URL` | — | PostgreSQL 连接串 |
| `REDIS_URL` | `redis://localhost:6379` | Redis 连接串 |
| `ADMIN_API_KEY` | — | 管理接口认证密钥（必填） |
| `INGEST_API_KEY` | — | 事件接收认证密钥（必填） |
| `WS_TOKEN` | — | WebSocket 连接 Token |
| `CORS_ORIGIN` | 空（拒绝跨域） | 允许的跨域来源（逗号分隔） |
| `RATE_LIMIT_MAX` | `100` | 每窗口最大请求数 |
| `RATE_LIMIT_WINDOW` | `1 minute` | 限流窗口 |
| `LITE_MODE` | — | 设为 `1` 使用 SQLite 轻量模式 |

## 许可

MIT
