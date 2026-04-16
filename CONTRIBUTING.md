# Contributing to DotTranslator

感谢你对 DotTranslator 的关注！

## 开发环境

### 前置要求

- Node.js 22+
- pnpm（monorepo 包管理）
- Docker & Docker Compose（DotStats Server 开发）

### 本地启动

```bash
# 克隆仓库
git clone https://github.com/wjpyinuo/DotTranslator.git
cd DotTranslator

# DotTranslator 桌面应用
npm install
npm run electron:dev

# DotStats Dashboard（另一个终端）
cd DotStats
npm install
npm run dev

# DotStats Server（另一个终端）
cd DotStats/server
cp .env.example .env  # 填入配置
docker compose up -d  # 启动 PG + Redis
npm run dev
```

## 项目结构

```
DotTranslator/
├── electron/           # Electron 主进程
├── src/
│   ├── main/           # 后台服务（数据库等）
│   ├── renderer/       # React UI
│   ├── shared/         # 共享类型 + 常量
│   ├── telemetry/      # 遥测模块
│   └── workers/        # 翻译引擎 Worker
├── DotStats/
│   ├── electron/       # Dashboard Electron 主进程
│   ├── src/            # Dashboard React UI
│   └── server/         # Analytics Server (Fastify)
└── .github/workflows/  # CI/CD
```

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/)：

| 前缀 | 用途 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | Bug 修复 |
| `docs:` | 文档变更 |
| `style:` | 代码格式（不影响逻辑） |
| `refactor:` | 重构（非功能变更） |
| `test:` | 添加/修改测试 |
| `chore:` | 构建/工具链变更 |
| `perf:` | 性能优化 |

示例：
```
feat: add LibreTranslate provider
fix: clipboard monitor crash on Wayland
docs: update DotStats API reference
```

## 添加新的翻译引擎

翻译引擎采用插件化架构，只需实现 `TranslationProvider` 接口：

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

1. 在 `src/workers/translation/providers/` 创建新文件
2. 实现接口方法
3. 在 `router.ts` 注册引擎
4. 在 `SettingsPanel` 添加配置项
5. 提交 PR

## 测试

```bash
# DotTranslator 单元测试
npm test

# DotStats Server 测试（需要 PG + Redis）
cd DotStats/server
npm test

# 类型检查
npm run typecheck

# Lint
npm run lint
```

## 安全

- **不要**在 issue 或 PR 中提交 API Key、密码等敏感信息
- 遥测数据遵循隐私白名单原则，绝不上报文本内容
- 安全漏洞请通过私密 issue 报告

## License

提交的代码将按 [MIT License](LICENSE) 发布。
