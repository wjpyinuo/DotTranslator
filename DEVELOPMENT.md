# DotTranslator 开发日志

> 本文档记录开发流程、进度和决策，每次提交更新。

---

## 开发规范（必须严格遵守）

1. **复杂任务拆小块**：每个任务拆到 ≤ 0.5 天可验证的程度，每块验证完再继续
2. **写完主动跑测试**：代码完成后立即运行测试，不等人工发现 Bug
3. **需求不确定先问**：任何模糊点必须先确认，不猜测不乱写
4. **修改前读上下文**：修改已有代码前，必须完整读取相关文件的当前内容
5. **不自作主张**：严格按照设计方案和用户确认的需求执行

## 验收标准

每一块完成后必须满足：
- `dotnet build` 编译通过（零警告零错误）
- 相关测试全部通过
- 代码与设计方案（`DotTranslator-设计方案.md`）一致
- UI 与原型预览（`DotTranslator-UI-Preview.html`）一致（阴影、色板、圆角、状态变体）

---

## 进度跟踪

| 周次 | 任务块 | 状态 | 完成日期 | 备注 |
|------|--------|------|---------|------|
| **准备阶段** | | | | |
| — | 方案设计 v1.2 | ✅ 完成 | 2026-04-19 | 含 6 处修正 |
| — | Implementation Ready 补齐 | ✅ 完成 | 2026-04-19 | 项目脚手架+色彩Token+Button/TextBox主题+ViewModel+languages.json |
| — | 编译运行修复 | ✅ 完成 | 2026-04-19 | 修复 avares:// 程序集名 + StringConverters，仓库可 dotnet run |
| **Week 1** | | | | |
| W1-D1 | 创建解决方案 + CI 验证 + 测试桩（36 用例） | ✅ 完成 | 2026-04-20 | format/build/test 全过 |
| W1-D2 | CI 流水线验证 | ✅ 完成 | 2026-04-20 | dotnet format 零错误 |
| W1-D3 | MVVM 骨架 + DI + 语言列表加载 | ✅ 完成 | 2026-04-20 | languages.json → Initialize() |
| W1-D4 | Neumorphism Button + TextBox 完善 | ✅ 完成 | 2026-04-20 | 已有，阴影数值对齐 UI 预览 |
| W1-D5 | Neumorphism Border 卡片 + Badge + 深色主题切换 | ✅ 完成 | 2026-04-20 | NeuCard/NeuBadge/ApplyTheme |
| **Week 2** | | | | |
| W2-D1 | ITranslationProvider 接口 + 数据模型 | ⬜ 待开始 | | |
| W2-D2 | HuoshanProvider + 单元测试 | ⬜ 待开始 | | |
| W2-D3 | BaiduProvider + TranslationRouter + 测试 | ⬜ 待开始 | | |
| W2-D4 | Neumorphism ComboBox/ToggleSwitch/Tab | ⬜ 待开始 | | |
| W2-D5 | Neumorphism ProgressBar/RadioButton/ScrollBar + TranslationCache | ⬜ 待开始 | | |
| **Week 3** | | | | |
| W3-D1 | IClipboardMonitor + WindowsClipboardMonitor | ⬜ 待开始 | | |
| W3-D2 | 迷你浮窗 + TranslationManager | ⬜ 待开始 | | |
| W3-D3 | 系统托盘 + 全局热键 | ⬜ 待开始 | | |
| W3-D4 | Neumorphism Slider/Expander/ToolTip/ContextMenu | ⬜ 待开始 | | |
| W3-D5 | 联调 + 单元测试 + Alpha 预检 | ⬜ 待开始 | | |
| **Week 4** | | | | **🎯 Alpha 里程碑** |
| W4-D1 | TencentProvider | ⬜ 待开始 | | |
| W4-D2 | CaiyunProvider + NiutransProvider | ⬜ 待开始 | | |
| W4-D3 | 额度切换 + CircuitBreaker | ⬜ 待开始 | | |
| W4-D4 | 5 引擎联调 + 测试 | ⬜ 待开始 | | |
| W4-D5 | 引擎管理 UI + **Alpha 验收** | ⬜ 待开始 | | |
| **Week 5** | | | | |
| W5-D1 | DeepSeekProvider | ⬜ 待开始 | | |
| W5-D2 | QwenProvider + KimiProvider | ⬜ 待开始 | | |
| W5-D3 | AI Prompt 构建 | ⬜ 待开始 | | |
| W5-D4 | AI 模式 UI + 成本预估 | ⬜ 待开始 | | |
| W5-D5 | 8 引擎联调 + 集成测试 | ⬜ 待开始 | | |
| **Week 6** | | | | |
| W6-D1 | XunfeiTtsProvider | ⬜ 待开始 | | |
| W6-D2 | EdgeTtsProvider + TTS 切换 | ⬜ 待开始 | | |
| W6-D3 | SQLite + HistoryRepository | ⬜ 待开始 | | |
| W6-D4 | 历史/收藏页签 | ⬜ 待开始 | | |
| W6-D5 | 历史集成 + 导出 TXT/CSV + 测试 | ⬜ 待开始 | | |
| **Week 7** | | | | **🎯 Beta 里程碑** |
| W7-D1 | ComparisonEngine + 渐进渲染 | ⬜ 待开始 | | |
| W7-D2 | 相似度矩阵 + 差异对比 | ⬜ 待开始 | | |
| W7-D3 | 智能推荐评分 | ⬜ 待开始 | | |
| W7-D4 | AI 对比 + 导出对比报告 | ⬜ 待开始 | | |
| W7-D5 | 多引擎联调 + **Beta 验收** | ⬜ 待开始 | | |
| **Week 8** | | | | |
| W8-D1 | 术语表 CRUD + 数据库 | ⬜ 待开始 | | |
| W8-D2 | GlossaryPostProcessor | ⬜ 待开始 | | |
| W8-D3 | AI Prompt 术语注入 + 导入导出 | ⬜ 待开始 | | |
| W8-D4 | TxtExtractor + 文档翻译管道 | ⬜ 待开始 | | |
| W8-D5 | TXT 翻译联调 + 成本预估 | ⬜ 待开始 | | |
| **Week 9** | | | | |
| W9-D1 | 设置页：基础+剪贴板+引擎管理 | ⬜ 待开始 | | |
| W9-D2 | 设置页：TTS+快捷键+诊断 | ⬜ 待开始 | | |
| W9-D3 | 导出格式补全 | ⬜ 待开始 | | |
| W9-D4 | 公告栏 + 打赏 | ⬜ 待开始 | | |
| W9-D5 | 引导流程 + 自动更新 | ⬜ 待开始 | | |
| **Week 10** | | | | |
| W10-D1 | 弹性策略完善 | ⬜ 待开始 | | |
| W10-D2 | 缓存 + 限流 | ⬜ 待开始 | | |
| W10-D3 | 前后处理管道 | ⬜ 待开始 | | |
| W10-D4 | 安全加固 | ⬜ 待开始 | | |
| W10-D5 | 动画打磨 | ⬜ 待开始 | | |
| **Week 11-12** | | | | **🎯 RC 里程碑** |
| — | 集成测试 + 回归 + 无障碍 + 压力 | ⬜ 待开始 | | |
| **Week 13** | | | | |
| — | 修 Bug + 最终回归 | ⬜ 待开始 | | |
| **Week 14-15** | | | | **🎯 Release 里程碑** |
| — | 打包 + 文档 + 发布 | ⬜ 待开始 | | |

---

## 决策记录

| 日期 | 决策 | 原因 |
|------|------|------|
| 2026-04-19 | 方案从 v1.1 修正为 v1.2 | 排期/测试/UI/配置 6 处修正 |
| 2026-04-19 | 文档翻译降级为 v1.1 | v1.0 仅支持 TXT，释放 Week 8 压力 |
| 2026-04-19 | 排期 11 周 → 16 周 | 增加里程碑检查点 + 测试缓冲 |
| 2026-04-19 | Implementation Ready 3 天补齐 | 确保 Week 1 Day 1 可直接 dotnet build |
| 2026-04-19 | 修复 avares:// 程序集名 | App.axaml 中 3 处 `avares://TranslatorApp/` 改为 `avares://DotTranslator/`，AssemblyName 是 DotTranslator |
| 2026-04-19 | 修复 StringConverters 引用 | TextBox.axaml 中补全为 `Avalonia.Data.Converters.StringConverters.IsNullOrEmpty` |
| 2026-04-19 | 确认 InverseBoolConverter 已注册 | App.axaml Resources 中已有注册，确认无误 |

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-04-19 | 初始设计方案 |
| v1.1 | 2026-04-19 | AI 翻译 Prompt、多引擎对比、文档翻译等补充 |
| v1.2 | 2026-04-19 | 排期修正、测试增强、UI 控件清单、配置简化、CI 强化 |
| v1.2.1 | 2026-04-19 | 修复 avares:// 程序集名 + StringConverters 引用，使仓库可编译运行 |
