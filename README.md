# DotTranslator

即时翻译桌面工具 — .NET 8 + Avalonia UI

多引擎并行翻译，结果对比一目了然。支持百度、有道、DeepL 三大翻译引擎，本地存储历史记录，隐私安全优先。

## 功能

- **多引擎并行翻译** — 同时调用多个翻译引擎，结果并排对比
- **智能路由** — 根据错误率、延迟、可用性自动选择最优引擎
- **翻译记忆 (TM)** — 已翻译内容自动缓存，相同文本秒出结果
- **历史记录** — SQLite 本地存储，支持搜索、收藏、导出
- **剪贴板监听** — 自动检测剪贴板变化并翻译（可开关）
- **本地 HTTP API** — 开放 `localhost` API 供第三方工具调用
- **隐私保护** — 自动过滤身份证号、银行卡号等敏感内容
- **深色/浅色主题** — 支持深色、浅色、跟随系统三种模式
- **全局热键** — `Alt+Space` 快速唤起/隐藏窗口
- **自动更新** — 基于 GitHub Releases 的自动检查与下载

## 翻译引擎

| 引擎 | 免费 | 需要 API Key | 特点 |
|------|------|-------------|------|
| 百度翻译 | 有限免费 | App ID + 密钥 | 中文优化，支持 200+ 语言 |
| 有道翻译 | 有限免费 | App ID + Secret | 网易有道智云 |
| DeepL | 有限免费 | API Key | 欧洲语言质量高 |
| Fallback | ✅ | 不需要 | 未配置引擎时的兜底方案 |

## 项目架构

```
DotTranslator/
├── DotTranslator.sln
│
├── DotTranslator.Shared/          # 共享层 — 模型、常量、枚举
│   ├── Constants/AppConstants.cs
│   └── Models/
│       ├── AppModels.cs           # ProviderInfo, AppState, PersistedCircuit
│       ├── HistoryModels.cs       # HistoryEntry, TMEntry, LocalStatsRecord
│       └── TranslationModels.cs   # TranslateParams, TranslateResult, CompareResult
│
├── DotTranslator.Core/            # 核心层 — 业务逻辑
│   ├── Translation/
│   │   ├── ITranslationProvider.cs    # 翻译引擎接口
│   │   ├── TranslationRouter.cs       # 路由器 + Polly 弹性策略
│   │   ├── ErrorClassifier.cs         # 错误分类（限流/认证/网络/超时）
│   │   └── Providers/
│   │       ├── BaiduProvider.cs       # 百度翻译 API
│   │       ├── DeepLProvider.cs       # DeepL API（支持 free/pro）
│   │       ├── YoudaoProvider.cs      # 有道智云 API
│   │       └── FallbackProvider.cs    # 兜底方案
│   ├── History/
│   │   └── HistoryService.cs          # 历史记录 + 翻译记忆管理
│   ├── Security/
│   │   ├── ApiKeyVault.cs             # Windows DPAPI 加密存储
│   │   └── SensitiveContentFilter.cs  # 敏感信息检测（银行卡/身份证/手机号）
│   └── Telemetry/
│       └── TelemetryReporter.cs       # 可选匿名使用统计
│
├── DotTranslator.Infrastructure/  # 基础设施层 — 数据、网络、更新
│   ├── Data/
│   │   ├── AppDbContext.cs            # EF Core SQLite 上下文
│   │   ├── SqliteRepository.cs        # IHistoryRepository + ITranslationMemory 实现
│   │   └── Entities/Entities.cs       # 数据库实体类
│   ├── Http/
│   │   └── LocalApiServer.cs          # 本地 HTTP API（localhost only + Token 认证）
│   └── Update/
│       └── AutoUpdater.cs             # GitHub Releases 自动更新
│
└── DotTranslator.App/             # UI 层 — Avalonia 桌面应用
    ├── Program.cs                     # 入口点
    ├── App.axaml / App.axaml.cs       # 应用初始化 + DI 容器 + 主题
    ├── ViewModels/
    │   ├── MainWindowViewModel.cs     # 主窗口逻辑（翻译、切换Tab）
    │   ├── TranslationViewModel.cs    # 翻译 Tab
    │   ├── HistoryViewModel.cs        # 历史记录 Tab
    │   └── SettingsViewModel.cs       # 设置 Tab
    ├── Views/
    │   ├── MainWindow.axaml           # 无边框窗口 + Acrylic 背景
    │   ├── HistoryView.axaml          # 历史记录列表
    │   └── SettingsView.axaml         # API Key 配置、主题、数据管理
    ├── Controls/
    │   └── TitleBar.axaml             # 自定义标题栏（拖拽移动 + 窗口控制）
    └── Platform/Windows/
        ├── WindowEffects.cs           # DWM 圆角 + Acrylic/Mica
        ├── HotKeyManager.cs           # 全局热键注册
        └── GlobalClipboard.cs         # 剪贴板轮询监听
```

### 依赖关系

```
DotTranslator.App
  ├── DotTranslator.Core
  │   └── DotTranslator.Shared
  ├── DotTranslator.Infrastructure
  │   ├── DotTranslator.Core
  │   └── DotTranslator.Shared
  └── DotTranslator.Shared
```

## 技术栈

- **.NET 8** — 跨平台运行时
- **Avalonia UI 11** — 跨平台桌面 UI 框架（类 WPF/XAML）
- **CommunityToolkit.Mvvm** — MVVM 模式（ObservableObject、RelayCommand）
- **Entity Framework Core + SQLite** — 本地数据持久化（WAL 模式）
- **Polly 8** — 弹性策略（重试、熔断、超时）
- **Microsoft.Extensions.DependencyInjection** — 依赖注入

### 翻译弹性策略

每个翻译引擎都通过 Polly 管道处理：

1. **超时** — 10 秒无响应自动中断
2. **熔断** — 连续 5 次失败后熔断 30 秒
3. **重试** — 网络错误自动重试 1 次

错误分类逻辑（`ErrorClassifier`）：
- 限流 (429)、配额耗尽、认证失败 → **不触发熔断**（可能是临时问题）
- 网络错误、未知错误 → **触发熔断**

### 本地 HTTP API

启动后自动绑定 `http://127.0.0.1:18000~18100`（取第一个可用端口）：

```bash
# 健康检查
curl -H "Authorization: Bearer <token>" http://127.0.0.1:18000/api/health

# 获取可用引擎
curl -H "Authorization: Bearer <token>" http://127.0.0.1:18000/api/providers

# 翻译
curl -X POST http://127.0.0.1:18000/api/translate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello","sourceLang":"en","targetLang":"zh"}'
```

Token 在每次应用启动时随机生成，仅绑定 localhost。

### 数据库存储

SQLite 数据库位于 `%APPDATA%/DotTranslator/dottranslator.db`：

| 表 | 用途 |
|----|------|
| `history` | 翻译历史记录 |
| `tm_entries` | 翻译记忆（源语言+目标语言+原文 → 译文） |
| `settings` | 应用设置键值对 |
| `local_stats` | 本地使用统计 |
| `provider_metrics` | 引擎调用指标（按日聚合） |

启用 WAL 模式提升并发读写性能。

## 构建

```bash
# 还原依赖
dotnet restore DotTranslator.sln

# Debug 构建
dotnet build DotTranslator.sln

# 运行
dotnet run --project DotTranslator.App

# 发布（Windows x64）
dotnet publish DotTranslator.App -c Release -r win-x64 --self-contained -o publish
```

### 环境要求

- .NET 8 SDK
- Windows 10/11（主开发目标平台，Linux/macOS 理论支持）

## 配置 API Key

首次使用需在 **设置** 页配置至少一个翻译引擎的 API Key：

| 引擎 | 获取地址 |
|------|---------|
| 百度翻译 | [fanyi-api.baidu.com](https://fanyi-api.baidu.com) |
| 有道智云 | [ai.youdao.com](https://ai.youdao.com) |
| DeepL | [deepl.com/pro-api](https://www.deepl.com/pro-api) |

API Key 使用 Windows DPAPI 加密存储，不以明文保存。

## 许可证

MIT
