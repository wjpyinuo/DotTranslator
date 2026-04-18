# 桌面翻译软件 — 完整设计方案 v1.1

> 技术栈：.NET 8 + Avalonia UI | 目标平台：Windows 专属 | 目标用户：中国用户

---

## 目录

- [一、项目定位](#一项目定位)
- [二、翻译引擎](#二翻译引擎)
  - [2.1 普通模式 — 传统翻译 API](#21-普通模式--传统翻译-api)
  - [2.2 AI 模式 — 大语言模型翻译](#22-ai-模式--大语言模型翻译)
  - [2.3 模式切换](#23-模式切换)
  - [2.4 引擎管理](#24-引擎管理)
  - [2.5 引擎对比总表](#25-引擎对比总表)
  - [2.6 额度耗尽自动切换机制](#26-额度耗尽自动切换机制)
  - [2.7 多引擎翻译对比模式（核心功能）](#27-多引擎翻译对比模式核心功能)
  - [2.8 语言支持](#28-语言支持)
- [三、翻译结果处理](#三翻译结果处理)
  - [3.1 结果展示](#31-结果展示)
  - [3.2 结果操作](#32-结果操作)
  - [3.3 历史持久化](#33-历史持久化)
  - [3.4 Avalonia MVVM 实现](#34-avalonia-mvvm-实现)
- [四、TTS（语音朗读）](#四tts语音朗读)
  - [4.1 引擎配置](#41-引擎配置)
  - [4.2 讯飞 TTS](#42-讯飞-tts)
  - [4.3 Edge TTS](#43-edge-tts)
  - [4.4 额度耗尽自动切换](#44-额度耗尽自动切换)
  - [4.5 TTS 设置页](#45-tts-设置页)
  - [4.6 朗读按钮位置](#46-朗读按钮位置)
- [五、输入方式](#五输入方式)
- [六、UI 设计](#六ui-设计)
  - [6.1 设计风格 — 高端拟态](#61-设计风格--高端拟态neumorphism)
  - [6.2 窗口体系](#62-窗口体系)
  - [6.3 翻译页布局](#63-翻译页布局)
  - [6.4 常驻公告栏](#64-常驻公告栏)
  - [6.5 主题切换](#65-主题切换)
  - [6.6 样式](#66-样式)
  - [6.7 首次使用引导流程](#67-首次使用引导流程)
- [七、翻译历史](#七翻译历史)
- [八、术语表与打赏](#八术语表与打赏)
  - [8.1 术语表](#81-术语表)
  - [8.2 打赏（Donate）](#82-打赏donate)
- [九、快捷键方案](#九快捷键方案)
- [十、设置页完整结构](#十设置页完整结构)
- [十一、项目结构](#十一项目结构)
- [十二、NuGet 依赖](#十二nuget-依赖)
- [十三、国际化（i18n）](#十三国际化i18n)
  - [13.1 资源文件方案](#131-资源文件方案)
  - [13.2 资源文件完整 Key 清单](#132-资源文件完整-key-清单)
  - [13.3 格式化规则](#133-格式化规则)
  - [13.4 XAML 中使用](#134-xaml-中使用)
  - [13.5 语言切换机制](#135-语言切换机制)
  - [13.6 未来扩展语言](#136-未来扩展语言)
- [十四、无障碍（Accessibility）](#十四无障碍accessibility)
  - [14.1 键盘导航](#141-键盘导航)
  - [14.2 屏幕阅读器支持](#142-屏幕阅读器支持)
  - [14.3 高对比度模式](#143-高对比度模式)
  - [14.4 字体缩放](#144-字体缩放)
  - [14.5 动画减弱](#145-动画减弱)
  - [14.6 语义化标签检查清单](#146-语义化标签检查清单)
  - [14.7 自动化测试要求](#147-自动化测试要求)
- [十五、工程专业化细节](#十五工程专业化细节)
  - [15.1 翻译请求管道架构](#151-翻译请求管道架构)
  - [15.2 错误分类体系](#152-错误分类体系)
  - [15.3 弹性策略（Polly 风格）](#153-弹性策略polly-风格)
  - [15.4 引擎路由器（Router）](#154-引擎路由器router)
  - [15.5 缓存层](#155-缓存层)
  - [15.6 客户端限流器（Rate Limiter）](#156-客户端限流器rate-limiter)
  - [15.7 请求防抖与合并](#157-请求防抖与合并)
  - [15.8 日志与诊断](#158-日志与诊断)
  - [15.9 翻译前后处理管道](#159-翻译前后处理管道)
  - [15.10 配置管理](#1510-配置管理)
  - [15.11 健康检查与启动自检](#1511-健康检查与启动自检)
  - [15.12 异常恢复与崩溃保护](#1512-异常恢复与崩溃保护)
  - [15.13 性能监控](#1513-性能监控)
  - [15.14 安全加固](#1514-安全加固)
  - [15.15 打包与自动更新](#1515-打包与自动更新)
- [十六、插件与扩展性设计](#十六插件与扩展性设计)
- [十七、用户反馈通道](#十七用户反馈通道)
- [十八、隐私政策](#十八隐私政策)
- [十九、开发排期](#十九开发排期)
- [二十、成本总结](#二十成本总结)

---

## 一、项目定位

| 项目 | 说明 |
|---|---|
| **目标用户** | 中国用户 |
| **运行平台** | Windows 专属 |
| **技术栈** | .NET 8 + Avalonia UI |
| **核心卖点** | 轻量、免费为主、多引擎聚合对比 |
| **收费模式** | 软件免费，用户自备各平台 API Key |

---

## 二、翻译引擎

### 2.1 普通模式 — 传统翻译 API

#### 火山翻译

| 项目 | 详情 |
|---|---|
| **免费额度** | 200 万字符/月 |
| **超出价格** | 49 元/100 万字符 |
| **语种** | 100+ |
| **QPS** | 10 次/秒 |
| **接入方式** | REST API，火山引擎 IAM 认证 |

**优点：**
- 字节大厂，SLA 有保障，宕机概率低
- 支持领域定制（互联网/办公协作/电商），同一句话不同领域翻译结果不同
- 接口文档清晰，网上有现成 C# 调用示例
- 并发能力强（10 QPS），多窗口翻译不卡

**缺点：**
- 免费额度中等（200 万/月），不如腾讯和小牛
- 超出价格中等偏上（49 元/百万）
- 需要注册火山引擎账号，IAM 权限配置稍复杂
- 文学/口语化文本翻译偏生硬

---

#### 腾讯翻译君

| 项目 | 详情 |
|---|---|
| **免费额度** | 500 万字符/月 |
| **超出价格** | 58 元/100 万字符 |
| **语种** | 60+ |
| **QPS** | 5 次/秒 |
| **接入方式** | REST API，腾讯云 SecretId + SecretKey 签名 |

**优点：**
- **免费额度最大**（500 万/月），白嫖之王
- 会对句子做润色，译文通顺自然
- 腾讯云控制台用量统计清晰
- 接入相对简单

**缺点：**
- 润色有时过度，导致偏离原意（过度意译）
- 语种只有 60+，小语种覆盖不如火山和小牛
- QPS 较低（5 次/秒），频繁调用可能限流
- 腾讯云实名认证流程较繁琐

---

#### 百度翻译

| 项目 | 详情 |
|---|---|
| **免费额度** | 标准版 5 万/月，高级版 100 万/月（需个人认证） |
| **超出价格** | 49 元/100 万字符 |
| **语种** | 200+ |
| **QPS** | 1-10 次/秒（按版本） |
| **接入方式** | REST API，AppId + Secret + MD5 签名 |

**优点：**
- 老牌翻译，用户基数最大，翻译引擎成熟稳定
- 语种覆盖最广（200+），小语种首选
- 高级版 100 万免费/月，个人认证即可开通
- 文档和社区教程极多，遇到问题容易找到解决方案

**缺点：**
- 标准版免费额度极低（5 万/月），几乎不够用
- 高级版需要实名认证
- 签名方式用 MD5（较旧），实现比 HMAC 稍麻烦
- 翻译质量中规中矩，不如彩云

---

#### 彩云小译

| 项目 | 详情 |
|---|---|
| **免费额度** | 100 万字符/月 |
| **超出价格** | **20 元/100 万字符（最便宜）** |
| **语种** | **仅中文、英文、日文 3 种** |
| **QPS** | 未公开，实测约 5 次/秒 |
| **接入方式** | REST API，Token 认证，**需发邮件申请** |

**优点：**
- **翻译质量公认最好**，尤其英译中，文学/日常文本自然度极高
- **超出后价格最低**（20 元/百万），用得多也不心疼
- 维基百科翻译技术供应商，质量有背书
- 接口极简，一个 Token 搞定认证

**缺点：**
- **只支持中英日 3 种语言**，严重限制使用场景
- API Token 需要发邮件申请，不能即时获取
- 偶有翻译超时/失败，稳定性不如大厂
- 免费额度中等（100 万/月）

---

#### 小牛翻译

| 项目 | 详情 |
|---|---|
| **免费额度** | 注册送 1000 万字符 + **每天登录送 20-50 万字符** |
| **超出价格** | 较低（具体查官网） |
| **语种** | 300+（最多） |
| **QPS** | 未明确限制 |
| **接入方式** | REST API，AppId + API Key |

**优点：**
- **免费额度最慷慨**，每天白嫖几十万字符，个人用户基本用不完
- 语种覆盖最广（300+）
- 支持自定义术语库和翻译记忆库
- 东北大学 NLP 实验室背景，学术功底扎实

**缺点：**
- 团队规模小，长期稳定性存疑
- 日译中偶尔混淆主语
- 偶有宕机情况
- 界面和文档不如大厂完善

---

### 2.2 AI 模式 — 大语言模型翻译

#### DeepSeek

> ⚠️ **以下价格为方案编写时的参考值，DeepSeek 曾多次调价，接入前务必核实[官网最新定价](https://platform.deepseek.com/api-docs/pricing)。**

| 模型 | 输入价格 | 输出价格 | 上下文 | 特点 |
|---|---|---|---|---|
| **DeepSeek-V3** | ¥2/百万 token | ¥8/百万 token | 128K | 翻译质量最高，日常首选 |
| **DeepSeek-R1** | ¥1/百万 token | ¥4/百万 token | 128K | 推理增强，法律/学术/逻辑严密文本更优 |

两个模型均兼容 OpenAI 格式，接入方式完全相同，仅 `model` 参数不同。

| 项目 | 详情 |
|---|---|
| **免费额度** | 注册赠送 500 万 token 体验额度 |
| **API 兼容性** | ✅ 完全兼容 OpenAI 格式 |

**推荐策略：**
- 默认使用 **V3**（速度 + 质量平衡最好）
- 设置中允许用户切换到 **R1**（推理更严谨，适合法律合同、学术论文、技术文档等对准确性要求极高的场景）

**优点：**
- **翻译质量最高**，中英翻译接近 GPT-4 水平
- V3 + R1 双模型可选，覆盖不同场景
- 价格相对合理（比 Kimi 便宜很多）
- OpenAI 兼容，接入只需改一个 URL，开发成本最低
- 支持 128K 长上下文
- 开源社区活跃，模型持续迭代

**缺点：**
- 用户量暴增后**偶尔排队/限速**，高峰期可能延迟高
- 免费额度有限，基本要花钱
- 输出 token 价格比输入贵 2-4 倍，长译文成本高
- 服务器偶有连接波动

---

#### 通义千问-plus

| 项目 | 详情 |
|---|---|
| **免费额度** | **新用户每个模型 100 万 token 免费** |
| **价格** | 输入 ¥0.8/百万 token，输出 ¥2/百万 token |
| **上下文** | 128K（qwen-plus）/ 1M（qwen-long） |
| **API 兼容性** | ✅ 提供 OpenAI 兼容接口 |

**优点：**
- **稳定性最好**，阿里云 SLA 保障
- **免费额度最多**，新用户每个模型 100 万 token
- 价格最低档（qwen-turbo 输入仅 ¥0.3/百万）
- 中文理解力强
- 支持 OpenAI 兼容接口

**缺点：**
- 翻译质量略逊于 DeepSeek
- 模型选择多（turbo/plus/max），用户可能不知道选哪个
- 阿里云账号体系较重
- 输出 token 价格仍是输入的 2.5 倍

---

#### Kimi（Moonshot）

> ⚠️ **价格可能已调整，接入前核实[官网最新定价](https://platform.moonshot.cn/docs/api)。**

| 项目 | 详情 |
|---|---|
| **免费额度** | 注册赠送体验额度（不定期调整） |
| **价格** | moonshot-v1-8k: ¥12/百万 / 32k: ¥24/百万 / **128k: ¥60/百万** |
| **上下文** | **200K 汉字（最长）** |
| **API 兼容性** | ✅ 完全兼容 OpenAI 格式 |

**优点：**
- **长文本处理能力最强**，20 万汉字上下文，翻译整本书/长文档首选
- OpenAI 兼容，接入极简单
- 中文语感好

**缺点：**
- **价格最贵**（128k 模型 60 元/百万 token，是 DeepSeek 的 7.5 倍）
- 短文本翻译性价比极低
- 免费额度少
- 不适合日常高频使用

**适用场景：** 整篇长文档翻译（>5000 字）、小说/论文批量翻译。日常短句翻译不推荐。

---

#### AI 翻译 Prompt 设计

AI 模式下，三家引擎均兼容 OpenAI 格式，共用一套 Prompt 体系。

##### System Prompt

```
你是一位专业的翻译专家。请将用户提供的文本翻译为目标语言。

要求：
1. 只输出译文，不要添加任何解释、注释或原文
2. 保持原文的段落结构和格式
3. 翻译要自然流畅，符合目标语言的表达习惯
4. 专业术语保持准确，不要意译过度
5. 人名、地名、品牌名不翻译，保留原文
6. 如果原文包含代码或公式，原样保留
```

##### Prompt 模板（含术语注入）

```csharp
public class AiTranslationPromptBuilder
{
    /// <summary>
    /// 构建 AI 翻译请求的 messages
    /// </summary>
    public List<ChatMessage> BuildMessages(
        string text,
        string sourceLang,
        string targetLang,
        Glossary? glossary = null)
    {
        var systemPrompt = BuildSystemPrompt(targetLang, glossary);
        var userPrompt = BuildUserPrompt(text, sourceLang, targetLang);

        return new List<ChatMessage>
        {
            new(ChatRole.System, systemPrompt),
            new(ChatRole.User, userPrompt)
        };
    }

    private string BuildSystemPrompt(string targetLang, Glossary? glossary)
    {
        var sb = new StringBuilder();
        sb.AppendLine("你是一位专业的翻译专家。请将用户提供的文本翻译为目标语言。");
        sb.AppendLine();
        sb.AppendLine("要求：");
        sb.AppendLine("1. 只输出译文，不要添加任何解释、注释或原文");
        sb.AppendLine("2. 保持原文的段落结构和格式");
        sb.AppendLine("3. 翻译要自然流畅，符合目标语言的表达习惯");
        sb.AppendLine("4. 专业术语保持准确，不要意译过度");
        sb.AppendLine("5. 人名、地名、品牌名不翻译，保留原文");
        sb.AppendLine("6. 如果原文包含代码或公式，原样保留");

        // 术语注入
        if (glossary is { Terms.Count: > 0 })
        {
            sb.AppendLine();
            sb.AppendLine("请严格遵守以下术语翻译规则：");
            foreach (var term in glossary.Terms)
            {
                sb.AppendLine($"- \"{term.Source}\" 必须翻译为 \"{term.Target}\"");
            }
        }

        // 目标语言明确化
        sb.AppendLine();
        sb.AppendLine($"目标语言：{GetLanguageName(targetLang)}");

        return sb.ToString();
    }

    private string BuildUserPrompt(string text, string sourceLang, string targetLang)
    {
        // 短文本直接发
        if (text.Length <= 500)
        {
            return text;
        }

        // 长文本加上下文提示
        return $"请翻译以下文本（{GetLanguageName(sourceLang)} → {GetLanguageName(targetLang)}）：\n\n{text}";
    }

    private string GetLanguageName(string code) => code switch
    {
        "zh" => "中文（简体）",
        "en" => "英语",
        "ja" => "日语",
        "ko" => "韩语",
        "fr" => "法语",
        "de" => "德语",
        "ru" => "俄语",
        "es" => "西班牙语",
        _ => code
    };
}
```

##### API 调用参数

| 参数 | 普通短句 | 长文翻译 | 说明 |
|---|---|---|---|
| `model` | 用户选择的模型 | 同左 | DeepSeek-V3 / qwen-plus / moonshot-v1-128k |
| `temperature` | 0.3 | 0.3 | 低温度 = 翻译更稳定一致 |
| `top_p` | 0.9 | 0.9 | — |
| `max_tokens` | 2048 | 动态计算 | 按原文长度 × 2 估算 |
| `stream` | `false` | `true` | 长文启用流式输出，逐字显示 |

```csharp
public class AiTranslationRequest
{
    public string Model { get; set; }
    public List<ChatMessage> Messages { get; set; }
    public double Temperature { get; set; } = 0.3;
    public double TopP { get; set; } = 0.9;
    public int MaxTokens { get; set; } = 2048;
    public bool Stream { get; set; } = false;
}
```

##### 长文本分段策略

当原文超过单次请求的 token 限制时，按语义分段：

```
原文（8000 字符）
  │
  ├─ 1. 按段落分割（\n\n 为分隔符）
  │
  ├─ 2. 如果单段 > 2000 字符 → 按句子分割（。！？.!? 为分隔符）
  │
  ├─ 3. 合并小段，确保每段 200-2000 字符
  │
  ├─ 4. 逐段翻译，每段翻译时携带前一段的译文作为上下文：
  │     system: "以下是上一段的译文，供你保持翻译风格一致：{上一段译文}"
  │
  └─ 5. 拼接所有段落的译文返回
```

##### 翻译风格自适应

根据文本类型自动调整 System Prompt 的风格指令：

| 检测特征 | 推断类型 | 额外指令 |
|---|---|---|
| 包含 `function`/`class`/`import` 等关键词 | 代码/技术文档 | "保留代码格式，术语使用业界通用译法" |
| 包含大量专业术语（医学/法律/金融） | 专业文档 | "使用专业术语的标准翻译，不要口语化" |
| 句子短、口语化、含 emoji | 日常对话/社交媒体 | "翻译要自然口语化，保留 emoji" |
| 段落长、句式复杂 | 文学/学术 | "保持原文的修辞风格和文采" |
| 默认 | 通用 | 无额外指令 |

```csharp
private string DetectStyleHint(string text)
{
    if (Regex.IsMatch(text, @"\b(function|class|import|const|var|def)\b"))
        return "这是一段技术文档，请保留代码格式，专业术语使用业界通用译法。";

    if (Regex.IsMatch(text, @"\b(患者|诊断|预后|资产|负债|利率|条款)\b"))
        return "这是一份专业文档，请使用该领域术语的标准翻译，不要口语化。";

    if (text.Length < 200 && (text.Contains("😂") || text.Contains("👍")))
        return "这是日常对话，请翻译得自然口语化，保留 emoji。";

    return null;
}
```

##### 错误处理

| 情况 | 处理 |
|---|---|
| API 返回空内容 | 重试 1 次，仍为空则报错 |
| 流式输出中断 | 保留已输出的部分，标注「翻译不完整」 |
| Token 超限 | 自动截断原文到安全长度，提示用户 |
| 模型返回解释而非译文 | 后处理：提取第一个换行后的内容作为译文 |

---

### 2.3 模式切换

- 设置页提供「普通模式」/「AI 模式」开关
- 普通模式：快、免费额度大，适合日常短句翻译
- AI 模式：质量高、适合长文/专业/文学翻译
- 用户可自由切换，也可设为默认

### 2.4 引擎管理

- 设置页列出所有引擎，每个可独立启用/禁用
- 每个引擎旁附「申请指南」按钮，跳转官网注册页
- API Key 本地 DPAPI 加密存储（不存明文）
- 引擎优先级可拖拽排序
- 故障转移：当前引擎失败自动切换下一个
- 月用量统计显示（每个引擎已用/剩余）

---

### 2.5 引擎对比总表

#### 普通模式

| 维度 | 火山 | 腾讯 | 百度 | 彩云 | 小牛 |
|---|---|---|---|---|---|
| **免费额度** | 200万/月 | **500万/月** | 5-100万/月 | 100万/月 | **每天20-50万** |
| **超出价格** | 49元 | 58元 | 49元 | **20元** | 较低 |
| **翻译质量** | ★★★★ | ★★★ | ★★★ | **★★★★★** | ★★★ |
| **术语准确性** | ★★★★ | ★★★ | ★★★ | ★★★ | ★★★ |
| **语种数** | 100+ | 60+ | **200+** | 仅3种 | **300+** |
| **稳定性** | **★★★★★** | ★★★★ | ★★★★ | ★★★ | ★★★ |
| **API 易用性** | **★★★★★** | ★★★★ | ★★★ | ★★★★ | ★★★★ |
| **领域定制** | ✅ | ❌ | ❌ | ❌ | ✅ 术语库 |
| **适合场景** | 通用首选 | 白嫖 | 小语种 | 英日高质量 | 每天白嫖 |

#### AI 模式

| 维度 | DeepSeek-V3 | DeepSeek-R1 | 通义千问-plus | Kimi-128k |
|---|---|---|---|---|
| **翻译质量** | **★★★★★** | ★★★★★ | ★★★★ | ★★★★ |
| **推理严谨度** | ★★★★ | **★★★★★** | ★★★★ | ★★★★ |
| **速度** | **★★★★★** | ★★★ | ★★★★ | ★★★★ |
| **价格（输入）** | ¥2/百万 | ¥1/百万 | **¥0.8/百万** | ¥60/百万 |
| **价格（输出）** | ¥8/百万 | ¥4/百万 | **¥2/百万** | ¥60/百万 |
| **免费额度** | 500万 token | 500万 token | **最多** | 少 |
| **稳定性** | ⚠️ 偶有排队 | ⚠️ 偶有排队 | **★★★★★** | ★★★★ |
| **长文本** | 128K | 128K | 128K / 1M | **200K汉字最强** |
| **接入难度** | **极简单** | **极简单** | 简单 | **极简单** |
| **适合场景** | 日常翻译首选 | 法律/学术/严谨文本 | 稳定+省钱 | 整篇长文档翻译 |

---

### 2.6 额度耗尽自动切换机制

#### 额度监控

每个引擎维护一个本地计数器：
- 本月已用字符数 / token 数
- 上次调用时间
- 当前状态（正常 / 额度警告 / 额度耗尽 / 故障）

#### 自动切换逻辑

```
翻译请求进入
  │
  ├─ 1. 按用户设置的优先级，取第一个「可用」引擎
  │
  ├─ 2. 发送翻译请求
  │     │
  │     ├─ 成功 → 返回结果，更新用量计数
  │     │
  │     ├─ 返回 429（限流/额度耗尽）→ 标记该引擎「额度耗尽」
  │     │   → 自动切换到下一个可用引擎
  │     │
  │     ├─ 返回其他错误 → 标记该引擎「故障」
  │     │   → 自动切换到下一个可用引擎
  │     │
  │     └─ 超时（>10秒）→ 标记该引擎「超时」
  │         → 自动切换到下一个可用引擎
  │
  ├─ 3. 如果所有引擎都不可用 → 提示用户「所有引擎暂不可用」
  │
  └─ 4. 每日凌晨重置「故障」和「超时」状态（排除额度耗尽）
      每月 1 号重置所有状态和用量计数
```

#### 额度预警

- 用量达到 **80%** 时，在翻译结果旁显示黄色提示：「XX 翻译本月额度已用 80%」
- 用量达到 **100%** 时，自动标记为不可用，不再参与调度
- 用户可在设置页查看每个引擎的用量进度条

#### 用户通知

- 自动切换引擎时，在翻译结果下方显示一行小字：「已自动切换至 XX 引擎（原因：原引擎额度耗尽）」
- 所有引擎耗尽时，弹出通知提醒用户

---

### 2.7 多引擎翻译对比模式（核心功能）

> **核心卖点：同一段文本，多家引擎同时翻译，结果一目了然，用户选出最优译文。**

#### 产品定位

这是 DotTranslator 区别于所有竞品的核心能力。不是简单的"换一个引擎重新翻译"，而是**同时发起、并行返回、可视化对比、智能推荐**，让用户站在多个翻译引擎的肩膀上挑出最好的那一句。

#### 触发方式

| 方式 | 操作 |
|---|---|
| **按钮** | 翻译结果区域右上角「⚡ 多引擎对比」按钮（主操作，常驻可见） |
| **快捷键** | Ctrl+Shift+M（可自定义） |
| **自动触发** | 设置中开启「每次翻译自动对比」后，普通翻译完自动展开对比 |
| **右键菜单** | 译文区域右键 →「多引擎对比」 |

#### 界面布局 — 默认状态

```
┌────────────────────────────────────────────────────────────────────┐
│ 原文 ──────────────────────────────────────────────────────────    │
│ The quick brown fox jumps over the lazy dog.                       │
│                                                                    │
│ ─── 多引擎对比 ────────────────────────────── [导出] [全部复制] ──  │
│                                                                    │
│  ⏱️ 火山翻译  287ms ⚡   ⏱️ 腾讯翻译  412ms    ⏱️ 百度翻译  523ms   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ 敏捷的棕色狐狸    │  │ 那只敏捷的棕色    │  │ 敏捷的棕色狐狸    │  │
│  │ 跳过了懒惰的狗    │  │ 狐狸跳过了那只    │  │ 跳过了懒狗        │  │
│  │                  │  │ 懒惰的狗          │  │                  │  │
│  │ [📋] [🔊] [⭐]   │  │ [📋] [🔊] [⭐]   │  │ [📋] [ 🔊][⭐]   │  │
│  │  评分: ★★★★☆    │  │  评分: ★★★☆☆    │  │  评分: ★★★★☆    │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                    │
│  ⏱️ 彩云小译  301ms ⚡   ⏱️ 小牛翻译  890ms                        │
│  ┌──────────────────┐  ┌──────────────────┐                       │
│  │ 那只敏捷的棕色    │  │ 敏捷的棕色狐狸    │                       │
│  │ 狐狸跳过了那只    │  │ 跳过了懒惰的狗    │                       │
│  │ 懒惰的狗          │  │                  │                       │
│  │ [📋] [🔊] [⭐]   │  │ [📋] [🔊] [⭐]   │                       │
│  │  评分: ★★★★★ 👑 │  │  评分: ★★★☆☆    │                       │
│  └──────────────────┘  └──────────────────┘                       │
│                                                                    │
│  [⚡AI 对比]  [📊相似度分析]  [📋复制最优]  [📄导出对比报告]          │
└────────────────────────────────────────────────────────────────────┘
```

#### 界面布局 — 加载中状态（渐进式渲染）

```
┌────────────────────────────────────────────────────────────────────┐
│ 原文 ──────────────────────────────────────────────────────────    │
│ The quick brown fox jumps over the lazy dog.                       │
│                                                                    │
│ ─── 多引擎对比 ──────────────────────────────── ⏳ 3/5 已完成 ────  │
│                                                                    │
│  ⏱️ 火山翻译  287ms ✅   ⏱️ 腾讯翻译  加载中...    ⏱️ 百度翻译  ✅  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ 敏捷的棕色狐狸    │  │ ░░░░░░░░░░░░░░░  │  │ 敏捷的棕色狐狸    │  │
│  │ 跳过了懒惰的狗    │  │ ░░░░░░░░░░░░░░░  │  │ 跳过了懒狗        │  │
│  │                  │  │ ░░░░░░░░░░░░░░░  │  │                  │  │
│  │ [📋] [🔊] [⭐]   │  │   skeleton...    │  │ [📋] [🔊] [⭐]   │  │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                    │
│  ⏱️ 彩云小译  301ms ✅   ⏱️ 小牛翻译  超时 ❌                      │
│  ┌──────────────────┐  ┌──────────────────┐                       │
│  │ 那只敏捷的棕色    │  │ ⚠️ 响应超时       │                       │
│  │ 狐狸跳过了那只    │  │ (>10s)           │                       │
│  │ 懒惰的狗          │  │ [重试]            │                       │
│  │ [📋] [🔊] [⭐]   │  └──────────────────┘                       │
│  └──────────────────┘                                              │
└────────────────────────────────────────────────────────────────────┘
```

#### 渐进式渲染策略（性能核心）

**不等全部完成**，先到先显示，用户体验感知延迟最低：

```
请求发出
  │
  ├─ 引擎 A 返回（287ms）→ 立即渲染到卡片，显示耗时 + 结果
  ├─ 引擎 B 返回（412ms）→ 立即渲染
  ├─ 引擎 C 返回（523ms）→ 立即渲染
  ├─ 引擎 D 返回（890ms）→ 立即渲染
  └─ 引擎 E 超时（>10s）→ 卡片显示「超时」+ 重试按钮
```

- 每张卡片独立渲染，互不阻塞
- 用 `Task.WhenAny` 循环代替 `Task.WhenAll`，实现逐个消费
- 头部进度条实时更新：`⏳ 3/5 已完成`
- 最快返回的引擎结果 **1 秒内可见**

```csharp
// 渐进式消费 — 不等全部完成
var pendingTasks = enabledProviders.Select(p => CallProviderAsync(p, request)).ToList();
var completed = new List<ComparisonResult>();

while (pendingTasks.Any())
{
    var finished = await Task.WhenAny(pendingTasks);
    pendingTasks.Remove(finished);

    var result = await finished;
    completed.Add(result);

    // 立即通知 UI 渲染这张卡片
    OnCardReady?.Invoke(result);

    // 更新进度
    ProgressUpdated?.Invoke(completed.Count, enabledProviders.Count);
}
```

#### 卡片交互详解

每张对比卡片是独立的交互单元：

```
┌─────────────────────────────┐
│ 🔥 火山翻译    ⚡287ms  ★★★★ │  ← 头部：引擎名 + 耗时 + 质量星
│─────────────────────────────│
│ 敏捷的棕色狐狸              │  ← 译文区：可选中、可复制
│ 跳过了懒惰的狗              │
│                             │
│─────────────────────────────│
│ [📋复制] [🔊朗读] [⭐收藏]   │  ← 操作栏：三个核心操作
│ [📌设为默认] [📏查差异]      │  ← 次要操作
│                             │
│ 字数: 14 | 与原文比: 0.82x   │  ← 统计信息
└─────────────────────────────┘
```

| 操作 | 说明 |
|---|---|
| **📋 复制** | 一键复制该引擎译文到剪贴板，复制后按钮短暂变绿 ✅ |
| **🔊 朗读** | 调用 TTS 朗读该译文（引擎内独立播放，可同时听多个对比） |
| **⭐ 收藏** | 标记为「推荐译文」，存入翻译历史，用于后续智能推荐 |
| **📌 设为默认** | 将该引擎设为此语言对的默认首选引擎 |
| **📏 查差异** | 高亮显示该译文与其他引擎译文的文字差异（diff 视图） |

#### 差异对比视图（Diff View）

点击「查差异」后，卡片展开为 diff 模式：

```
┌──────────────────────────────────────────────────────┐
│ 🔥 火山翻译 vs 其他引擎                                │
│                                                      │
│  敏捷的棕色狐狸跳过了懒惰的狗                          │
│  [敏捷的] ← 腾讯: 那只敏捷的                           │
│  [懒惰的狗] ← 百度: 懒狗                              │
│  [跳过了] ← 彩云: 跳过了（一致 ✓）                     │
│                                                      │
│  差异词汇: 2 处  一致度: 78%                           │
└──────────────────────────────────────────────────────┘
```

- 每个词/短语旁边标注其他引擎的对应翻译
- 一致的部分标 ✓，差异部分标各引擎的不同译法
- 帮助用户快速发现哪个引擎在哪个词上更准确

#### 相似度分析（📊）

点击「📊相似度分析」，底部展开统计面板：

```
┌────────────────────────────────────────────────────────────┐
│  相似度矩阵                                                  │
│         火山    腾讯    百度    彩云    小牛                   │
│  火山    —      0.82    0.95    0.78    0.91                │
│  腾讯   0.82     —      0.80    0.85    0.79                │
│  百度   0.95    0.80     —      0.76    0.93                │
│  彩云   0.78    0.85    0.76     —      0.77                │
│  小牛   0.91    0.79    0.93    0.77     —                  │
│                                                             │
│  📊 结论：火山 ≈ 百度 ≈ 小牛（高度一致），                   │
│          腾讯和彩云翻译风格更独立                             │
│                                                             │
│  🏆 推荐译文：彩云小译（与多数差异最大，可能是更优的意译）     │
└────────────────────────────────────────────────────────────┘
```

- 用编辑距离（Levenshtein）计算译文间相似度
- 高相似 = 引擎共识高；低差异 = 该引擎可能有独到见解
- 自动推荐「最独特但合理的译文」供用户参考

#### 智能推荐升级（多维度评分）

> 原始方案仅用编辑距离（Levenshtein）计算相似度，对中文不友好，缺少语义层面的评价。
> 升级为 4 维度加权评分体系：

| 维度 | 权重 | 计算方式 | 说明 |
|---|---|---|---|
| **译文流畅度** | 30% | 规则打分（见下） | 译文本身是否通顺自然 |
| **语义一致度** | 30% | 词级 Jaccard 相似度 | 与多数引擎译文的共识程度 |
| **用户偏好** | 25% | 历史收藏率加权 | 用户长期使用中对该引擎的偏好 |
| **响应速度** | 15% | 归一化耗时 | 越快得分越高 |

**译文流畅度打分规则：**
- 连续重复字惩罚（如"的的""了了"）→ -0.15
- 标点符号密度异常（过密 >15% 或过疏 <1%）→ -0.1
- 平均句长异常（>60 字或 <3 字碎片化）→ -0.1
- 中英混杂比例异常（>40%）→ -0.15

**语义一致度（词级对比）：**
- 对中文用 jieba 分词，对英文用空格分词
- 计算该译文与其余所有译文的词级 Jaccard 相似度
- 返回平均相似度

**用户偏好权重：**
```csharp
// 收藏率 = 被收藏次数 / 被使用次数
// 最近使用加权：最近1天=1.0，最近7天=0.8，最近30天=0.5，更久=0.2
preference = favoriteRate * recentWeight;
```

**综合评分公式：**
```
finalScore = fluency × 0.30 + consensus × 0.30 + preference × 0.25 + speed × 0.15
```

**推荐标签展示：**

| 分数区间 | 标签 | 展示 |
|---|---|---|
| ≥ 0.85 | 🏆 推荐 | 金色边框 + "推荐"角标 |
| 0.70 - 0.84 | ✅ 不错 | 默认样式 |
| 0.50 - 0.69 | ⚠️ 一般 | 灰色文字提示 |
| < 0.50 | ❌ 差异大 | 红色边框 + "差异较大"提示 |

#### AI 模式对比（⚡AI 对比）

点击「⚡AI 对比」，切换到 AI 引擎对比视图：

```
┌──────────────────────────────────────────────────────────────┐
│ ─── AI 模式对比 ───────────────────────────── [返回普通对比] ─ │
│                                                              │
│  ⏱️ DeepSeek-V3  1.2s    ⏱️ 通义千问  0.8s    ⏱️ Kimi  2.1s  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ 一只敏捷的棕色    │  │ 那只棕色狐狸      │  │ 敏捷的棕色  │ │
│  │ 狐狸从懒洋洋的    │  │ 很是敏捷，一跃    │  │ 狐狸纵身一  │ │
│  │ 狗身上跳了过去    │  │ 而过那条懒狗      │  │ 跳，越过那  │ │
│  │                  │  │                  │  │ 只懒洋洋的  │ │
│  │ [📋] [🔊] [⭐]   │  │ [📋] [🔊] [⭐]   │  │ 狗          │ │
│  │ 耗时: 1.2s       │  │ 耗时: 0.8s ⚡     │  │ [📋] [🔊]⭐│ │
│  └──────────────────┘  └──────────────────┘  │ 耗时: 2.1s  │ │
│                                              └─────────────┘ │
│                                                              │
│  [🔥 AI 评分排名]  [💬 AI 自评]  [返回普通对比]                │
└──────────────────────────────────────────────────────────────┘
```

- 普通对比和 AI 对比可一键切换，不丢失结果
- AI 模式额外支持「AI 自评」：让 DeepSeek 评价三个引擎的译文质量

#### 导出对比报告（📄）

导出为格式化文档，方便记录和分享：

```
=== DotTranslator 多引擎对比报告 ===
时间：2026-04-19 01:15
原文：The quick brown fox jumps over the lazy dog.

【火山翻译】⏱️ 287ms ★★★★☆
敏捷的棕色狐狸跳过了懒惰的狗

【腾讯翻译君】⏱️ 412ms ★★★☆☆
那只敏捷的棕色狐狸跳过了那只懒惰的狗

【百度翻译】⏱️ 523ms ★★★★☆
敏捷的棕色狐狸跳过了懒狗

【彩云小译】⏱️ 301ms ★★★★★ 👑 推荐
那只敏捷的棕色狐狸跳过了那只懒惰的狗

【小牛翻译】⏱️ 890ms ★★★☆☆
敏捷的棕色狐狸跳过了懒惰的狗

推荐译文：彩云小译
```

导出格式：TXT / Markdown / CSV / XLSX（含耗时和评分）

#### 收藏与智能推荐

| 行为 | 效果 |
|---|---|
| 用户点 ⭐ 收藏某引擎译文 | 该译文标记为「推荐」，存入翻译历史 |
| 长期收藏统计 | 记录每个引擎的被收藏次数，计算偏好度 |
| 偏好度应用 | 自动调整默认引擎优先级（收藏最多的排第一） |
| 对比后手动选中 | 选中的译文自动复制到剪贴板（可选） |

#### 全局操作栏

底部操作栏提供批量操作：

| 按钮 | 功能 |
|---|---|
| **⚡ AI 对比** | 切换到 AI 引擎对比模式 |
| **📊 相似度分析** | 展开/收起相似度矩阵 |
| **📋 复制最优** | 自动复制「评分最高」或「收藏」的译文 |
| **📄 导出报告** | 导出完整对比报告（TXT/MD/CSV） |
| **🔄 重新翻译** | 重新发起所有引擎请求 |
| **📌 全部收藏** | 收藏所有结果到历史 |

#### 卡片布局响应式

| 主窗口宽度 | 布局 |
|---|---|
| > 900px | 每行 3 卡片 |
| 600-900px | 每行 2 卡片 |
| < 600px | 每行 1 卡片（纵向滚动） |

卡片高度自适应译文内容，最小高度 120px，最大高度 300px（超出滚动）。

#### 实现要点

```csharp
public class ComparisonEngine
{
    public event Action<ComparisonResult> OnCardReady;
    public event Action<int, int> ProgressUpdated;

    public async Task<List<ComparisonResult>> RunComparisonAsync(
        IEnumerable<ITranslationProvider> providers,
        TranslationRequest request,
        CancellationToken ct = default)
    {
        var enabled = providers.Where(p => p.IsEnabled).ToList();
        var results = new ConcurrentBag<ComparisonResult>();
        var pendingTasks = enabled.Select(p => TranslateOneAsync(p, request, ct)).ToList();

        while (pendingTasks.Count > 0)
        {
            var finished = await Task.WhenAny(pendingTasks);
            pendingTasks.Remove(finished);

            var result = await finished;
            results.Add(result);

            // 立即通知 UI 渲染这张卡片
            OnCardReady?.Invoke(result);
            ProgressUpdated?.Invoke(results.Count, enabled.Count);
        }

        return results.OrderByDescending(r => r.Score).ToList();
    }

    private async Task<ComparisonResult> TranslateOneAsync(
        ITranslationProvider provider,
        TranslationRequest request,
        CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        try
        {
            var result = await provider.TranslateAsync(request);
            sw.Stop();
            return new ComparisonResult
            {
                ProviderName = provider.Name,
                Text = result.TranslatedText,
                LatencyMs = sw.ElapsedMilliseconds,
                Success = true
            };
        }
        catch (QuotaExceededException)
        {
            provider.MarkQuotaExhausted();
            return ComparisonResult.Failed(provider.Name, "额度耗尽", sw.ElapsedMilliseconds);
        }
        catch (TimeoutException)
        {
            return ComparisonResult.Failed(provider.Name, "超时", sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            return ComparisonResult.Failed(provider.Name, ex.Message, sw.ElapsedMilliseconds);
        }
    }

    /// <summary>
    /// 计算两段译文的相似度（归一化编辑距离）
    /// </summary>
    public static double CalculateSimilarity(string a, string b)
    {
        var distance = LevenshteinDistance(a, b);
        var maxLen = Math.Max(a.Length, b.Length);
        return maxLen == 0 ? 1.0 : 1.0 - (double)distance / maxLen;
    }

    /// <summary>
    /// 生成相似度矩阵
    /// </summary>
    public static double[,] BuildSimilarityMatrix(List<ComparisonResult> results)
    {
        int n = results.Count;
        var matrix = new double[n, n];
        for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
        {
            if (i == j) { matrix[i, j] = 1.0; continue; }
            matrix[i, j] = CalculateSimilarity(results[i].Text, results[j].Text);
        }
        return matrix;
    }
}

public class ComparisonResult
{
    public string ProviderName { get; init; }
    public string Text { get; init; }
    public long LatencyMs { get; init; }
    public bool Success { get; init; }
    public string Error { get; init; }
    public double Score { get; set; }        // 用户评分 / 自动评分
    public bool IsFavorite { get; set; }     // 是否收藏
    public bool IsRecommended { get; set; }  // 是否被系统推荐

    public static ComparisonResult Failed(string name, string error, long latency) => new()
    {
        ProviderName = name, Success = false, Error = error, LatencyMs = latency
    };
}
```

#### 动画与过渡

| 场景 | 动画 |
|---|---|
| 卡片出现 | 从底部滑入 + 淡入（200ms ease-out），按完成顺序依次出现 |
| 卡片内译文 | 逐字淡入（每个字 30ms 延迟），营造「实时翻译」感 |
| 骨架屏 | 脉冲呼吸动画（浅色闪烁，1.5s 循环） |
| 收藏星星 | 点击时放大 1.3x → 回弹 1.0x + 金色闪光（300ms） |
| 复制成功 | 按钮变绿 + 文字「已复制 ✅」→ 2s 后恢复 |
| 进度更新 | 头部进度条平滑填充 |
| 错误卡片 | 红色边框 + 抖动 200ms |

---

### 2.8 语言支持

#### 各引擎语种覆盖

| 引擎 | 语种数 | 说明 |
|---|---|---|
| 火山翻译 | 100+ | 主流语种齐全，支持领域定制 |
| 腾讯翻译君 | 60+ | 主流语种覆盖，小语种较少 |
| 百度翻译 | 200+ | 语种最多，小语种首选 |
| 彩云小译 | **仅 3 种** | 中文、英文、日文 |
| 小牛翻译 | 300+ | 语种最全 |
| DeepSeek/通义千问/Kimi | 理论无限制 | LLM 理解能力决定 |

#### 多引擎对比模式的语种限制

多引擎对比需要**所有启用的引擎都支持该语言对**才能并行对比。核心瓶颈在**彩云小译**（仅支持中英日 3 种语言），因此：

| 翻译方向 | 支持多引擎对比 | 可用引擎数 |
|---|---|---|
| 中 ↔ 英 | ✅ | 5 + 3 AI = 全部 |
| 中 ↔ 日 | ✅ | 彩云+火山+百度+小牛+腾讯 + 3 AI |
| 英 ↔ 日 | ⚠️ 部分 | 火山+百度+小牛+腾讯 + 3 AI（彩云不支持英↔日） |
| 中 ↔ 其他语言 | ⚠️ 部分 | 火山+百度+小牛+腾讯 + 3 AI（彩云不支持） |
| 其他 ↔ 其他 | ⚠️ 部分 | 仅支持该语言对的引擎参与对比 |

> 当某些引擎不支持当前语言对时，对比视图中该引擎卡片显示「不支持该语种」并置灰，不参与对比。

#### 支持的语言列表（共约 38 种高频语言）

软件预置以下高频语言供选择，按使用频率排序。用户也可在设置中展开完整列表（覆盖全部 200+ 语种）。

**第一梯队：核心语言（必选，下拉默认展示）**

| 语言 | 代码 | 引擎覆盖 | 典型场景 |
|---|---|---|---|
| 中文（简体） | zh | 全部 | — |
| 英语 | en | 全部 | 最高频 |
| 日语 | ja | 全部（含彩云） | 动漫/技术文档 |
| 韩语 | ko | 火山+百度+小牛+腾讯+AI | 韩剧/游戏 |
| 法语 | fr | 火山+百度+小牛+腾讯+AI | 文学/商务 |
| 德语 | de | 火山+百度+小牛+腾讯+AI | 工程/学术 |
| 俄语 | ru | 火山+百度+小牛+腾讯+AI | 文学/科技 |
| 西班牙语 | es | 火山+百度+小牛+腾讯+AI | 拉美/商务 |
| 葡萄牙语 | pt | 火山+百度+小牛+腾讯+AI | 巴西/非洲 |
| 阿拉伯语 | ar | 火山+百度+小牛+腾讯+AI | 中东/宗教 |

**第二梯队：常用语言（展开可见）**

| 语言 | 代码 | 语言 | 代码 |
|---|---|---|---|
| 意大利语 | it | 荷兰语 | nl |
| 泰语 | th | 越南语 | vi |
| 印尼语 | id | 马来语 | ms |
| 土耳其语 | tr | 波兰语 | pl |
| 希腊语 | el | 希伯来语 | he |
| 印地语 | hi | 乌尔都语 | ur |
| 孟加拉语 | bn | 菲律宾语 | tl |
| 波斯语 | fa | 乌克兰语 | uk |
| 瑞典语 | sv | 捷克语 | cs |
| 罗马尼亚语 | ro | 匈牙利语 | hu |
| 芬兰语 | fi | 丹麦语 | da |
| 挪威语 | no | 克罗地亚语 | hr |
| 中文（繁体） | zh-TW | — | — |

**第三梯队：小语种（搜索选择，覆盖 200+）**

百度翻译和小牛翻译支持的其余语种，通过搜索框输入语言名称检索选择，不在下拉中默认展示。

#### 语言选择器 UI 设计

```
源语言 [自动检测  ▼]    ⇄    目标语言 [英语  ▼]

展开下拉：
┌──────────────────┐
│ 🔍 搜索语言...    │  ← 顶部搜索框
├──────────────────┤
│ ⭐ 常用语言       │  ← 基于用户历史自动排序
│    英语  ✓        │
│    日语           │
│    韩语           │
├──────────────────┤
│ 🌍 全部语言       │
│    法语           │
│    德语           │
│    俄语           │
│    西班牙语       │
│    ...            │
│    ▶ 更多（200+）  │  ← 点击展开完整列表
└──────────────────┘
```

- 每个语言旁标注支持的引擎数量（灰色小字）
- 「常用语言」区域根据用户翻译历史自动排序，使用越多排越前
- 搜索支持中文名、英文名、语言代码三种输入

---

## 三、翻译结果处理

> 翻译请求返回后，结果如何展示、操作、持久化，是用户体验的核心环节。

### 3.1 结果展示

#### 单引擎模式

翻译完成后，结果卡片展示以下信息：

| 元素 | 说明 |
|---|---|
| **译文** | 主体内容，字号 16px，行高 1.8，颜色 `--accent` 高亮 |
| **引擎标识** | 引擎名 + 图标 + 耗时 badge（如 `🔥 火山翻译 ⚡287ms`） |
| **源语言检测** | 当源语言为「自动检测」时，显示「已检测: 英语」小标签 |
| **字数统计** | 译文字数，如「14 字」 |
| **翻译时间** | 底部灰色小字，如「2026-04-19 01:15」 |

#### 多引擎对比模式

详见 [2.7 多引擎翻译对比模式](#27-多引擎翻译对比模式核心功能)。

#### 空状态

无翻译结果时，译文区域显示占位文案：「译文将在此处显示...」，操作按钮全部 disabled。

#### 加载状态

- 单引擎：译文区显示骨架屏（shimmer 动画），按钮区 disabled
- 多引擎：每张卡片独立 skeleton 渐进渲染，先到先显示

#### 错误状态

| 错误类型 | 展示方式 |
|---|---|
| **超时** | 卡片内显示 `⚠️ 响应超时 (>10s)` + 「🔄 重试」按钮 |
| **额度耗尽** | 卡片内显示 `本月额度已耗尽` + 「已自动切换至下一引擎」 |
| **认证失败** | 红色提示 `API Key 无效，请前往设置检查` + 「打开设置」按钮 |
| **网络异常** | 黄色提示 `网络连接失败，请检查网络` + 「🔄 重试」按钮 |

### 3.2 结果操作

翻译结果支持以下操作，通过结果卡片底部的操作栏触发：

| 操作 | 应用内快捷键 | 系统级快捷键 | 说明 |
|---|---|---|---|
| **📋 复制译文** | `Ctrl+C`（选中时） | `Ctrl+Shift+C` | 一键复制译文到剪贴板，按钮短暂变绿 ✅ |
| **🔊 朗读** | `Ctrl+P` | `Ctrl+Shift+R`（翻译并朗读） | 调用 TTS 引擎朗读译文 |
| **⭐ 收藏** | `Ctrl+D` | — | 收藏到「我的收藏」，用于智能推荐 |
| **⚡ 多引擎对比** | — | `Ctrl+Shift+M` | 展开多引擎并行对比视图 |
| **⇄ 语言交换** | `Ctrl+S` | — | 交换源语言和目标语言，译文变原文 |
| **📏 查差异** | — | — | 多引擎模式下，高亮各引擎译文差异 |

> **应用内快捷键**：窗口获得焦点时可用，如 Ctrl+C 复制。
> **系统级快捷键**：全局注册，窗口不在前台也能触发，详见 §九。两者独立设置，互不冲突。

#### 复制行为细节

- 纯文本复制：去掉格式，只保留译文文字
- 带格式复制（右键菜单）：保留原文 + 译文 + 引擎名 + 时间
- 复制成功后，按钮 1.5 秒内显示 ✅ 动画反馈

### 3.3 历史持久化

#### 存储方案

| 项目 | 方案 |
|---|---|
| **存储引擎** | SQLite（通过 `Microsoft.Data.Sqlite`） |
| **数据库路径** | `%APPDATA%/DotTranslator/translator.db` |
| **表结构** | 见下方 |
| **自动清理** | 默认保留 90 天，可在设置中调整 |

#### 数据库表结构

```sql
CREATE TABLE TranslationHistory (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    SourceText  TEXT NOT NULL,           -- 原文
    TranslatedText TEXT NOT NULL,        -- 译文
    SourceLang  TEXT NOT NULL,           -- 源语言代码 (en/zh/ja/...)
    TargetLang  TEXT NOT NULL,           -- 目标语言代码
    Engine      TEXT NOT NULL,           -- 引擎名称 (volcano/tencent/baidu/...)
    Mode        TEXT NOT NULL DEFAULT 'normal', -- normal / ai
    LatencyMs   INTEGER,                -- 响应耗时(毫秒)
    IsFavorite  INTEGER NOT NULL DEFAULT 0, -- 0/1
    CreatedAt   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UpdatedAt   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE INDEX idx_history_created ON TranslationHistory(CreatedAt);
CREATE INDEX idx_history_favorite ON TranslationHistory(IsFavorite);
CREATE INDEX idx_history_lang ON TranslationHistory(SourceLang, TargetLang);

-- 术语表
CREATE TABLE Glossary (
    Id          INTEGER PRIMARY KEY AUTOINCREMENT,
    SourceTerm  TEXT NOT NULL,
    TargetTerm  TEXT NOT NULL,
    LangPair    TEXT NOT NULL,           -- 如 "en-zh"
    CreatedAt   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE UNIQUE INDEX idx_glossary_unique ON Glossary(SourceTerm, LangPair);
```

#### 历史记录生命周期

```
翻译完成
  │
  ├─ 写入 TranslationHistory 表
  │
  ├─ 用户操作：
  │   ├─ 收藏 → IsFavorite = 1
  │   ├─ 取消收藏 → IsFavorite = 0
  │   └─ 删除 → 物理删除该条记录
  │
  └─ 自动清理（每日凌晨触发）：
      ├─ 删除 CreatedAt < now - retention_days 的记录
      ├─ 被收藏的记录不受清理影响
      └─ retention_days 默认 90，可在设置中调整（7/30/90/365/永不）
```

### 3.4 Avalonia MVVM 实现

#### ViewModel 结构

翻译结果处理涉及的核心 ViewModel：

```csharp
// 翻译结果 ViewModel
public class TranslationResultViewModel : ViewModelBase
{
    [ObservableProperty]
    private string _sourceText = string.Empty;

    [ObservableProperty]
    private string _translatedText = string.Empty;

    [ObservableProperty]
    private string _sourceLang = "auto";

    [ObservableProperty]
    private string _targetLang = "zh";

    [ObservableProperty]
    private string _engineName = string.Empty;

    [ObservableProperty]
    private int _latencyMs;

    [ObservableProperty]
    private bool _isFavorite;

    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private TranslationError? _error;

    // 状态计算属性
    public bool HasResult => !string.IsNullOrEmpty(TranslatedText) && !IsLoading && Error == null;
    public bool HasError => Error != null;
    public string LatencyDisplay => $"{LatencyMs}ms";
    public string CharCountDisplay => $"{TranslatedText.Length} 字";

    [RelayCommand]
    private async Task CopyAsync()
    {
        var clipboard = TopLevel.GetTopLevel(Application.Current?.ApplicationLifetime
            is IClassicDesktopStyleApplicationLifetime desktop ? desktop.MainWindow : null)
            ?.Clipboard;
        if (clipboard != null)
        {
            await clipboard.SetTextAsync(TranslatedText);
            // 触发复制成功动画
        }
    }

    [RelayCommand]
    private async Task SpeakAsync()
    {
        await TtsService.SpeakAsync(TranslatedText, TargetLang);
    }

    [RelayCommand]
    private void ToggleFavorite()
    {
        IsFavorite = !IsFavorite;
        HistoryService.SetFavorite(/* recordId */, IsFavorite);
    }
}
```

#### 翻译请求到 UI 的数据流

```
用户输入文本
  │
  ▼
TranslateCommand (RelayCommand)
  │
  ├─ 设置 IsLoading = true, Error = null
  │
  ▼
TranslationService.TranslateAsync(request)
  │
  ├─ 管道：防抖 → 缓存检查 → 引擎路由 → 重试/熔断
  │
  ▼
TranslationResult
  │
  ├─ 成功 → TranslatedText = result.Text
  │         LatencyMs = result.ElapsedMs
  │         EngineName = result.Provider
  │         IsLoading = false
  │         写入 SQLite 历史
  │
  └─ 失败 → Error = TranslationError.From(exception)
            IsLoading = false
```

#### XAML 绑定示例

```xml
<!-- 结果卡片 -->
<Border Classes="result-card"
        IsVisible="{Binding HasResult}">
  <Border.Styles>
    <Style Selector="Border.result-card">
      <Setter Property="CornerRadius" Value="16"/>
      <Setter Property="BoxShadow" Value="{DynamicResource OutsetShadow}"/>
    </Style>
  </Border.Styles>

  <DockPanel>
    <!-- 头部：引擎 + 耗时 -->
    <StackPanel DockPanel.Dock="Top" Orientation="Horizontal"
                Spacing="8" Margin="18,12">
      <TextBlock Text="{Binding EngineName}" FontWeight="SemiBold"/>
      <Border Classes="badge-success">
        <TextBlock Text="{Binding LatencyDisplay, StringFormat='⚡ {0}'}"
                   FontSize="10" FontWeight="SemiBold"/>
      </Border>
    </StackPanel>

    <!-- 译文主体 -->
    <TextBlock Text="{Binding TranslatedText}"
               FontSize="16" LineHeight="28"
               Classes="translated" Margin="18,0"/>

    <!-- 底部操作栏 -->
    <StackPanel DockPanel.Dock="Bottom" Orientation="Horizontal"
                Spacing="8" Margin="18,10">
      <Button Command="{Binding SpeakCommand}" Content="🔊 朗读"/>
      <Button Command="{Binding CopyCommand}" Content="📋 复制"/>
      <Button Command="{Binding ToggleFavoriteCommand}"
              Content="{Binding IsFavorite, StringFormat='{}{0}'}">
        <Button.Content>
          <Binding Path="IsFavorite"
                   Converter="{StaticResource BoolToFavConverter}"/>
        </Button.Content>
      </Button>
      <Button Classes="accent" Content="⚡ 多引擎对比"/>
    </StackPanel>
  </DockPanel>
</Border>

<!-- 空状态 -->
<Border Classes="result-card" IsVisible="{Binding HasResult, Converter={StaticResource InverseBoolConverter}}">
  <TextBlock Text="译文将在此处显示..."
             Opacity="0.5" FontStyle="Italic"
             HorizontalAlignment="Center" VerticalAlignment="Center"/>
</Border>
```

---

## 四、TTS（语音朗读）

### 4.1 引擎配置

| 引擎 | 优先级 | 音质 | 成本 | 免费额度 |
|---|---|---|---|---|
| **讯飞 TTS** | ✅ **默认首选** | ★★★★★ | 免费 2 万次/日 | 每天 2 万次 |
| **Edge TTS** | 备选（自动切换） | ★★★★ | 免费 | 无限制 |

### 4.2 讯飞 TTS

| 项目 | 详情 |
|---|---|
| **音质** | 国内 TTS 最强，人声自然度极高 |
| **免费额度** | 每天 2 万次调用 |
| **接入方式** | REST API（WebSocket），AppId + ApiKey + ApiSecret，HMAC 签名 |
| **可用音色** | 30+ 种，详见下方 |

#### 讯飞可用音色列表

| 音色名 | 性别 | 风格 | 适用场景 |
|---|---|---|---|
| x4_xiaogang | 男 | 标准自然 | 通用，日常翻译默认 |
| x4_xiaoxin | 女 | 标准自然 | 通用，日常翻译默认 |
| x4_yeting | 女 | 温柔甜美 | 日常对话、温馨内容 |
| x4_mingge | 男 | 温暖沉稳 | 新闻、正式内容 |
| x4_yunxi | 女 | 活泼可爱 | 年轻化内容 |
| x4_xiaoyu | 女 | 知性优雅 | 文学、教育 |
| x4_xiaofeng | 男 | 阳光开朗 | 口语、轻松内容 |
| x4_xiaomeng | 男 | 稳重大气 | 商务、播客 |
| x4_tongnan | 男童 | 清脆活泼 | 儿童内容、童话、动画 |
| x4_tongnv | 女童 | 天真甜美 | 儿童内容、童话、动画 |

> 注：`x4_xiaogang`/`x4_xiaoxin`/`x4_tongnan`/`x4_tongnv` 为建议音色 ID 命名，实际以讯飞开放平台最新上线音色为准。接入时从讯飞 API 动态拉取可用音色列表，设置页做下拉选择 + 试听。

设置页音色选择器分组显示：

```
音色选择
├── 通用
│   ├── 🔊 xiaogang（男·标准自然）
│   └── 🔊 xiaoxin（女·标准自然）
├── 生活
│   ├── 🔊 yeting（女·温柔甜美）
│   └── 🔊 yunxi（女·活泼可爱）
├── 新闻/商务
│   ├── 🔊 mingge（男·温暖沉稳）
│   └── 🔊 xiaomeng（男·稳重大气）
├── 文学/教育
│   ├── 🔊 xiaoyu（女·知性优雅）
│   └── 🔊 xiaofeng（男·阳光开朗）
└── 儿童
    ├── 🔊 tongnan（男童·清脆活泼）
    └── 🔊 tongnv（女童·天真甜美）
```

### 4.3 Edge TTS

| 项目 | 详情 |
|---|---|
| **音质** | 接近真人，国内可正常访问 |
| **免费额度** | **无限制** |
| **接入方式** | WebSocket，无需注册，无需 API Key |
| **可用音色** | 微软 Azure Neural Voice 系列，100+ 种 |

#### Edge TTS 中文常用音色

| 音色名 | 性别 | 风格 |
|---|---|---|
| zh-CN-XiaoxiaoNeural | 女 | 温暖自然 |
| zh-CN-YunxiNeural | 男 | 阳光年轻 |
| zh-CN-YunyangNeural | 男 | 专业播音 |
| zh-CN-XiaoyiNeural | 女 | 活泼可爱 |
| zh-CN-YunjianNeural | 男 | 沉稳庄重 |
| en-US-AriaNeural | 女 | 英文自然 |
| en-US-GuyNeural | 男 | 英文沉稳 |
| ja-JP-NanamiNeural | 女 | 日文温柔 |

### 4.4 额度耗尽自动切换

```
TTS 请求进入
  │
  ├─ 1. 默认使用讯飞 TTS
  │
  ├─ 2. 发送请求
  │     │
  │     ├─ 成功 → 播放音频
  │     │
  │     ├─ 返回 429 或配额错误 → 标记「今日额度耗尽」
  │     │   → 自动切换到 Edge TTS
  │     │   → 在播放按钮旁显示小提示：「讯飞今日额度已用完，已切换至 Edge TTS」
  │     │
  │     └─ 其他错误 → 自动降级到 Edge TTS
  │
  └─ 3. 每日凌晨重置讯飞状态
```

### 4.5 TTS 设置页

```
TTS 设置
├── 默认引擎
│   └── [●讯飞 TTS  ○Edge TTS]（默认选讯飞）
│
├── 讯飞 TTS 配置
│   ├── AppId: [_______________]
│   ├── ApiKey: [_______________]
│   ├── ApiSecret: [_______________]
│   ├── [申请指南] → 跳转 xfyun.cn
│   ├── 音色选择: [下拉选择 ▼] [🔊试听]
│   └── 今日已用: ████████░░ 16,234 / 20,000 次
│
├── Edge TTS 配置
│   ├── （无需 API Key，开箱即用）
│   ├── 音色选择: [下拉选择 ▼] [🔊试听]
│   └── 状态: ✅ 可用
│
├── 通用设置
│   ├── 语速: [0.5x ─────●──── 2.0x]  当前: 1.0x
│   ├── 音量: [░░░░░░░●░░]  当前: 80%
│   └── 自动朗读: [○关闭  ●翻译后自动朗读译文  ○翻译后自动朗读原文]
│
└── 额度耗尽策略
    └── [●自动切换到备选引擎  ○静默失败  ○弹窗提醒]
```

### 4.6 朗读按钮位置

翻译结果区域中，原文和译文下方各有一个朗读按钮：

```
┌─────────────────────────────────────────┐
│  原文                                    │
│  The quick brown fox jumps over the...  │
│  [🔊朗读原文] [📋复制]                    │
│                                         │
│  译文                                    │
│  敏捷的棕色狐狸跳过了懒惰的狗。            │
│  [🔊朗读译文] [📋复制]  引擎: 讯飞·xiaoyan │
└─────────────────────────────────────────┘
```

点击朗读按钮旁的小箭头可展开选择具体音色（不进设置页也能快速切换）。

---

## 五、输入方式

### 5.1 文本输入（基础）

#### 语言默认值

| 项目 | 默认值 | 说明 |
|---|---|---|
| **源语言** | 自动检测 | 系统自动识别输入文本的语言 |
| **目标语言** | 英语（en） | 用户首次使用时的默认翻译方向 |

#### 智能目标语言切换

当源语言检测结果确定后，目标语言根据以下规则自动适配：

| 源语言检测结果 | 目标语言自动切换为 | 逻辑 |
|---|---|---|
| **中文**（zh） | **英语**（en） | 中文用户最常见需求：中→英 |
| **非中文**（en/ja/ko/fr/...） | **中文**（zh） | 外语内容最常见需求：外→中 |

> 注意：此自动切换仅在**首次检测到源语言变化时**触发。如果用户已手动选择过目标语言，则尊重用户选择，不再自动切换。用户手动切换后，直到源语言类型发生本质变化（中文↔非中文互切）才再次触发自动适配。

#### 语言交换按钮（⇄）

源语言与目标语言中间的 **⇄** 按钮，功能说明：

- **点击效果**：源语言和目标语言互换（如 `自动检测 → 英语` 变为 `英语 → 自动检测`）
- **前提条件**：源语言不能是「自动检测」时才可交换（因为「自动检测」没有固定语言值可交换）
- **如果源语言为自动检测**：交换按钮点击后，将当前检测到的实际语言（如英语）填入源语言，目标语言变为中文；同时按钮显示旋转动画提示已完成
- **旋转动画**：点击时按钮 `transform: rotate(180deg)` 旋转 180°，表示交换完成，200ms ease-out
- **Tooltip**：悬浮显示「交换源语言和目标语言」

#### 其他输入行为

- 主窗口文本框直接输入
- 防抖：输入停止 500ms 后才发请求
- 一键复制译文按钮

### 5.2 剪贴板翻译（核心高频功能）

> 这是桌面翻译工具最高频的交互方式：用户在任何地方复制文本 → 自动弹出翻译结果。
> 比手动打开窗口 → 粘贴 → 点翻译的体验好 10 倍。

#### 工作原理

```
用户在任意应用复制文本（Ctrl+C）
  │
  ├─ 1. 系统剪贴板变化 → DotTranslator 收到通知
  │     (Win32 API: AddClipboardFormatListener)
  │
  ├─ 2. 前置过滤（减少误触发）
  │     ├─ 剪贴板内容不是文本 → 忽略（图片/文件等）
  │     ├─ 文本长度 < 2 字符 → 忽略（太短，可能是误操作）
  │     ├─ 文本长度 > 5000 字符 → 忽略（太长，可能是大段代码/文章）
  │     ├─ 与上次翻译内容相同 → 忽略（重复复制）
  │     ├─ 复制来自 DotTranslator 自身 → 忽略（复制译文时不应重新翻译）
  │     └─ 距离上次触发 < 800ms → 忽略（防抖）
  │
  ├─ 3. 语言自动检测
  │     ├─ 检测源语言
  │     ├─ 如果源语言 == 默认目标语言 → 交换源/目标（如复制中文，自动翻成英文）
  │     └─ 如果源语言无法识别 → 忽略
  │
  ├─ 4. 弹出翻译浮窗
  │     ├─ 如果窗口已最小化/隐藏 → 恢复窗口并填入文本
  │     └─ 如果窗口未打开 → 在屏幕右下角弹出迷你翻译浮窗
  │
  └─ 5. 自动发起翻译（可配置）
        ├─ 默认：自动翻译（不需用户点按钮）
        └─ 设置中可关闭自动翻译，改为填入输入框等用户确认
```

#### 剪贴板监听实现

```csharp
public class ClipboardMonitor : IDisposable
{
    private readonly IntPtr _hwnd;
    private readonly int _minIntervalMs = 800;
    private DateTime _lastTrigger = DateTime.MinValue;
    private string _lastText = "";

    public event EventHandler<string>? ClipboardChanged;

    public ClipboardMonitor(Window window)
    {
        _hwnd = ((WindowImpl)window.PlatformImpl!).Handle!.Handle;
        // 注册剪贴板监听
        NativeMethods.AddClipboardFormatListener(_hwnd);
    }

    /// <summary>处理 WM_CLIPBOARDUPDATE 消息</summary>
    public void WndProc(ref Message m)
    {
        if (m.Msg == NativeMethods.WM_CLIPBOARDUPDATE)
        {
            OnClipboardChanged();
        }
    }

    private void OnClipboardChanged()
    {
        try
        {
            if (!Clipboard.ContainsText()) return;

            var text = Clipboard.GetText();

            // 过滤条件
            if (text.Length < 2 || text.Length > 5000) return;
            if (text == _lastText) return; // 重复
            if ((DateTime.Now - _lastTrigger).TotalMilliseconds < _minIntervalMs) return;

            // 排除来自自身的复制（检测剪贴板所有者）
            var owner = NativeMethods.GetClipboardOwner();
            if (owner == _hwnd) return;

            _lastText = text;
            _lastTrigger = DateTime.Now;

            ClipboardChanged?.Invoke(this, text);
        }
        catch (ExternalException)
        {
            // 剪贴板被其他进程占用，忽略
        }
    }

    public void Dispose()
    {
        NativeMethods.RemoveClipboardFormatListener(_hwnd);
    }
}

internal static class NativeMethods
{
    public const int WM_CLIPBOARDUPDATE = 0x031D;

    [DllImport("user32.dll")]
    public static extern bool AddClipboardFormatListener(IntPtr hwnd);

    [DllImport("user32.dll")]
    public static extern bool RemoveClipboardFormatListener(IntPtr hwnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetClipboardOwner();
}
```

#### 迷你翻译浮窗

当主窗口未打开时，剪贴板翻译触发后弹出一个小浮窗：

```
┌─────────────────────────────────────────┐
│ 🌍 DotTranslator                    ✕  │
│─────────────────────────────────────────│
│ 原文: The quick brown fox...      (44字)│
│                                         │
│ 🔥 火山翻译 ⚡287ms                     │
│ 敏捷的棕色狐狸跳过了懒惰的狗。           │
│                                         │
│ [📋 复制] [🔊 朗读] [📌 展开]           │
└─────────────────────────────────────────┘
```

- 浮窗出现在鼠标附近（但不遮挡光标）
- 3 秒后自动半透明（鼠标移上去恢复）
- 点击「📌 展开」切换到完整主窗口
- 点击「✕」关闭浮窗
- 按 `Esc` 关闭

#### 配置项

| 设置项 | 默认值 | 说明 |
|---|---|---|
| `ClipboardMonitor.Enabled` | `true` | 是否启用剪贴板监听 |
| `ClipboardMonitor.AutoTranslate` | `true` | 复制后是否自动翻译（关闭则填入输入框） |
| `ClipboardMonitor.ShowFloatWindow` | `true` | 主窗口隐藏时是否弹出浮窗 |
| `ClipboardMonitor.MinLength` | `2` | 最短触发字符数 |
| `ClipboardMonitor.MaxLength` | `5000` | 最长触发字符数 |
| `ClipboardMonitor.DebounceMs` | `800` | 防抖间隔（毫秒） |
| `ClipboardMonitor.AutoCopyResult` | `false` | 翻译完成后是否自动复制译文到剪贴板 |
| `ClipboardMonitor.SmartSwap` | `true` | 检测到源语言=目标语言时是否自动交换 |

### 5.3 文档翻译（第三阶段）

- 支持格式：TXT、Word（.docx）
- 拖入文件到窗口即可
- 分段翻译 + 进度条
- 导出双语对照文档
- 不做 PDF（排版保留太难）

---

## 六、UI 设计

### 6.1 设计风格 — 高端拟态（Neumorphism）

整体采用 **Neumorphism（新拟态）** 设计语言，兼顾质感与现代感：

| 设计要素 | 实现方式 |
|---|---|
| **凹凸质感** | 所有卡片、输入框、按钮通过同色系双阴影（亮+暗）营造立体浮起/按压效果 |
| **圆角** | 统一大圆角（12-16px），控件柔和不生硬 |
| **色彩** | 浅色模式以 `#E0E5EC` 为主背景，深色模式以 `#2B2D42` 为主背景 |
| **阴影** | 浅色：`box-shadow: 8px 8px 16px #B8C0CC, -8px -8px 16px #FFFFFF` |
| | 深色：`box-shadow: 8px 8px 16px #1E2030, -8px -8px 16px #383A54` |
| **按压态** | 按钮点击时阴影反转（外凸→内凹），模拟真实按键手感 |
| **字体** | 中文：思源黑体 / 英文：Inter 或 SF Pro，字号分级（标题 18sp / 正文 14sp / 辅助 12sp） |
| **图标** | 线性图标，2px 描边，圆角风格统一 |
| **动效** | 按钮 hover 时微微浮起（translateY -2px），页面切换带滑入动画，翻译结果逐字淡入 |

#### 浅色模式色板

| 用途 | 色值 | 说明 |
|---|---|---|
| 主背景 | `#E0E5EC` | 拟态灰底 |
| 亮阴影 | `#FFFFFF` | 左上光源 |
| 暗阴影 | `#B8C0CC` | 右下阴影 |
| 主文字 | `#2D3436` | 深灰，保证对比度 |
| 次要文字 | `#636E72` | 辅助信息 |
| 强调色 | `#6C5CE7` | 紫色，用于按钮/链接/焦点 |
| 成功 | `#00B894` | 状态提示 |
| 警告 | `#FDCB6E` | 额度预警 |
| 错误 | `#E17055` | 异常提示 |

#### 深色模式色板

| 用途 | 色值 | 说明 |
|---|---|---|
| 主背景 | `#2B2D42` | 深蓝灰 |
| 亮阴影 | `#383A54` | 深色亮影 |
| 暗阴影 | `#1E2030` | 深色暗影 |
| 主文字 | `#DFE6E9` | 浅灰白 |
| 次要文字 | `#B2BEC3` | 辅助信息 |
| 强调色 | `#A29BFE` | 浅紫，深色下更柔和 |
| 成功 | `#55EFC4` | 深色下荧光绿 |
| 警告 | `#FFEAA7` | 深色下柔和黄 |
| 错误 | `#FF7675` | 深色下柔和红 |

#### 各控件拟态细节

| 控件 | 默认态 | Hover 态 | 按下态 |
|---|---|---|---|
| **主按钮** | 外凸阴影 + 强调色填充 | 浮起 +2px + 阴影加深 | 内凹阴影（inset） |
| **次按钮** | 外凸阴影 + 背景色 | 浮起 + 阴影扩大 | 内凹阴影 |
| **输入框** | 内凹阴影（凹槽感） | 光标闪烁 + 强调色边框 | — |
| **下拉选择** | 内凹阴影 + 右侧箭头 | 展开时外凸浮起 | — |
| **卡片** | 外凸阴影 | 浮起 +1px | — |
| **开关** | 滑轨内凹 + 圆形滑块外凸 | 滑块微亮 | 滑动到另一端 |
| **Tab 页签** | 内凹（未选中） | — | 外凸 + 强调色（选中） |
| **滚动条** | 细条内凹 | 加宽 | — |

### 6.2 窗口体系

#### 应用图标

图标设计：两个对话气泡，分别包含 **"A"**（拉丁字母）和 **"文"**（中文），中间双向箭头表示语言互译，紫色渐变背景。**一眼即可识别为翻译软件。**

文件：`Assets/app-icon.svg`（矢量源文件）+ 多尺寸 PNG 导出

| 位置 | 说明 |
|---|---|
| **窗体图标** | 标题栏左侧 18×18px，紧跟软件名称 + 版本号 |
| **系统托盘图标** | 托盘区 16×16px，悬浮提示「DotTranslator v1.0.0」 |
| **关于页图标** | 页面居中 80×80px，带拟态阴影 |
| **安装包/快捷方式** | 256×256px `.ico` 文件 |

> 制作要求：从 `app-icon.svg` 导出 `.ico`（含 16×16, 32×32, 48×48, 256×256 四个尺寸），用于 `Window.Icon`、`TrayIcon.Icon`、NSIS 安装包。

#### 窗口结构

```
主窗口（单窗口，多标签页结构）
│
├── [左侧：功能区]
│   ├── 🌍 翻译页签（文本输入 + 结果显示）
│   ├── ⭐ 收藏页签（独立一级页签，快速访问收藏译文）
│   └── 📋 历史页签（全部翻译记录）
│
├── [弹性间距 → 将右侧页签推到最右]
│
├── [右侧：配置区]
│   ├── ⚙️ 设置页签
│   ├── ℹ️ 关于页签
│   └── ☕ 打赏页签
│
└── 常驻公告栏（底部，单行滚动，悬停暂停）

页签布局说明：
- 左侧三个页签（翻译/收藏/历史）为用户核心工作流，密集排列
- 右侧三个页签（设置/关于/打赏）为配置与元信息，视觉上与左侧分离
- 收藏从历史页签中升级为独立一级页签，方便高频访问

标题栏控件区（右上角，所有窗口统一）
├── 🌙/☀️ 主题切换按钮
├── 📌/📍 置顶按钮（未置顶📌外凸 / 已置顶📍内凹+强调色）
├── │ 分隔线
├── ─ 最小化
├── □ 最大化
└── ✕ 关闭（hover 变红）

打赏窗体（弹窗，从「关于」页签或托盘菜单触发）
├── 拟态风格，带关闭按钮
└── 打赏文案 + 微信收款码 + 支付宝收款码

系统托盘
├── 图标：`app-icon`（与窗体图标一致，16×16px）
├── 悬浮提示：DotTranslator v1.0.0
├── 左键单击：显示/隐藏主窗口
├── 右键菜单：快速翻译、设置、打赏、退出
└── 最小化到托盘（不退出）
```

### 6.3 翻译页布局

```
┌──────────────────────────────────────────────────────────────┐
│  🔲 DotTranslator v1.0.0            🌙 📌 │ ─ □ ✕           │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  源语言 [自动检测 ▼]     ⇄      目标语言 [英语 ▼]       │  │
│  │  ┌──────────────────────────────────────────────────┐  │  │
│  │  │                                                  │  │  │
│  │  │  在此输入要翻译的文本...                           │  │  │
│  │  │                                                  │  │  │
│  │  │                                                  │  │  │
│  │  │                                                  │  │  │
│  │  │                                                  │  │  │
│  │  └──────────────────────────────────────────────────┘  │  │
│  │                      [ ⚡ 翻 译 ]                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  译文                              🔥 火山翻译  ⚡287ms  │  │
│  │  ─────────────────────────────────────────────────────  │  │
│  │  敏捷的棕色狐狸跳过了懒惰的狗。                          │  │
│  │                                                        │  │
│  │  [🔊 朗读]  [📋 复制]  [⭐ 收藏]  [⚡ 多引擎对比]        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ 📢│ DotTranslator v1.1 已发布，新增多引擎并行对比…      │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

**交互说明：**
- **输入区**占据页面上半部分，大文本框，提供足够书写空间
- **[⚡ 翻 译]** 按钮居中放置在输入区下方，是页面最突出的主操作，拟态强调色
- 输入区域填入文本后，需点击翻译按钮才发起翻译请求（不自动翻译）
- **译文区**以结果卡片形式展示，顶部显示来源引擎 + 耗时，底部是操作按钮行
- **[⚡ 多引擎对比]** 按钮在译文卡片内，点击展开并行对比视图
- 语言栏中间的 **⇄** 按钮可快速交换源语言和目标语言（点击旋转 180° 动画；若源语言为自动检测，则将已检测到的实际语言填入源语言，目标语言切换为中文）
- **标题栏左上角**：应用图标（`app-icon`，18×18px）+ 软件名称 + 版本号（如 `🔲 DotTranslator v1.0.0`），版本号紧跟名称后方，字号略小、透明度降低以区分层级
- **标题栏右上角**：🌙 主题切换 → 📌 置顶（📌未置顶/📍已置顶，内凹+强调色区分状态） → │ → ─□✕ 窗口控件
- 底部常驻公告栏，单行滚动，鼠标悬停暂停

### 6.4 常驻公告栏

#### 功能说明

主窗口底部固定一个单行公告栏，实时读取远程 Markdown 文件内容并滚动展示。

| 项目 | 详情 |
|---|---|
| **位置** | 主窗口底部，翻译页签内常驻（切换页签时始终可见） |
| **数据源** | 远程 `.md` 文件（服务器 URL 在配置中指定） |
| **更新策略** | 启动时拉取一次 + 每 30 分钟自动刷新 |
| **展示方式** | 单行文字，从右向左匀速滚动（marquee 风格），文字区域 `overflow: hidden` 裁剪，不越过 📢 图标 |
| **悬停暂停** | 鼠标悬停在公告文字上时，滚动动画暂停（`animation-play-state: paused`），移开继续 |
| **超时处理** | 网络请求超时（>5s）则显示上一次缓存内容 |
| **无内容** | 如远程文件为空或无网络，公告栏自动隐藏 |
| **点击行为** | 点击公告栏可展开查看完整内容（弹出小窗） |
| **多行处理** | 远程 `.md` 可能有多行内容，取第一行非空文本展示 |
| **样式** | 左侧 📢 图标 + 强调色文字，内凹拟态底栏 |

#### 实现要点

```csharp
public class AnnouncementService
{
    private readonly HttpClient _httpClient;
    private readonly string _announcementUrl;
    private string _cachedText;
    private Timer _refreshTimer;

    public async Task InitializeAsync()
    {
        await FetchAnnouncementAsync();
        _refreshTimer = new Timer(
            async _ => await FetchAnnouncementAsync(),
            null,
            TimeSpan.FromMinutes(30),
            TimeSpan.FromMinutes(30));
    }

    private async Task FetchAnnouncementAsync()
    {
        try
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            var md = await _httpClient.GetStringAsync(_announcementUrl, cts.Token);
            // 取第一行非空文本
            var firstLine = md.Split('\n')
                .Select(l => l.Trim())
                .FirstOrDefault(l => !string.IsNullOrEmpty(l));
            _cachedText = firstLine ?? string.Empty;
            AnnouncementUpdated?.Invoke(_cachedText);
        }
        catch
        {
            // 网络失败，保持上次缓存
        }
    }
}
```

#### 滚动动画

```csharp
// Avalonia 动画实现：TextBlock 从右侧进入，匀速向左滚动，循环往复
// 使用 TranslateTransform + DoubleAnimation
// 滚动速度按文字长度动态调整，确保每字约 0.15s 通过可视区
// 文字容器设置 ClipToBounds = true，防止内容越过左侧 📢 图标
// 鼠标悬停时暂停动画：PointerEntered → animation.Pause()
// 鼠标离开时恢复动画：PointerExited → animation.Resume()
```

### 6.5 主题切换

- 支持深色 / 浅色主题，跟随系统或手动切换
- **切换入口**：标题栏右上角 🌙/☀️ 图标按钮（所有窗口统一位置）
- 点击切换时，所有窗口的主题按钮图标同步更新
- 使用自定义 Neumorphism 主题（基于 Avalonia ControlTheme，不使用 FluentTheme）
- 字体大小可调（12sp / 14sp / 16sp / 18sp）
- 切换主题时，所有拟态阴影实时重算，带 300ms 过渡动画

#### 置顶按钮

- **位置**：标题栏右上角，主题按钮右侧，窗口控件（最小化/最大化/关闭）左侧
- **两种状态**，用户可清晰分辨：
  - **未置顶**：📌 图标，外凸拟态阴影（默认态）
  - **已置顶**：📍 图标，内凹阴影 + 强调色高亮（pressed 态）
- 点击切换状态，Tooltip 动态更新为「置顶」/「取消置顶」
- 所有窗口标题栏统一布局：`主题切换 → 置顶 → │ 分隔 → 最小化 → 最大化 → 关闭`

### 6.6 样式

- 翻译结果区域支持逐句对照显示（原文/译文交替）
- 翻译中的 loading 动画：拟态风格脉冲呼吸灯
- 整体圆润、立体、有温度，区别于传统扁平化 UI

### 6.7 首次使用引导流程

用户首次打开 DotTranslator 时（`settings.json` 不存在），进入 3 步引导流程。已配置过的用户不会触发。

#### 流程设计

```
┌─────────────────────────────────────────────────────┐
│  步骤 1/3：选择翻译引擎                               │
│                                                     │
│  推荐组合（900 万+ 免费字符/月）：                     │
│  ☑️ 火山翻译    200 万/月    [📖 申请指南]            │
│  ☑️ 腾讯翻译君  500 万/月    [📖 申请指南]            │
│  ☐ 百度翻译     5-100 万/月  [📖 申请指南]            │
│  ☐ 彩云小译     100 万/月    [📖 申请指南]            │
│  ☐ 小牛翻译     每天 20-50 万 [📖 申请指南]           │
│                                                     │
│  💡 至少选择 2 个引擎才能启用多引擎对比                 │
│                                                     │
│  [跳过，直接使用]  [下一步]                            │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  步骤 2/3：填写 API Key                              │
│                                                     │
│  🔥 火山翻译                                        │
│  API Key:  [____________] [📋] [👁] [🔑 测试连接]    │
│  Secret:   [____________] [📋] [👁]                  │
│  状态: ✅ 已连接                                      │
│                                                     │
│  🐧 腾讯翻译君                                       │
│  SecretId:  [____________] [📋]                      │
│  SecretKey: [____________] [📋] [👁] [🔑 测试连接]   │
│  状态: ⏳ 未验证                                      │
│                                                     │
│  🔒 API Key 仅存储在本地，加密保存，不会上传           │
│                                                     │
│  [上一步]  [下一步]                                   │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  步骤 3/3：选择常用语言                               │
│                                                     │
│  默认源语言: [自动检测 ▼]  默认目标语言: [英语 ▼]     │
│                                                     │
│  常用语言: ☑️英语 ☑️日语 ☑️韩语 ☐法语 ☐德语          │
│                                                     │
│  [上一步]  [✅ 完成设置]                              │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│  ✅ 设置完成！                                       │
│                                                     │
│  现在可以开始翻译了。试试复制一段英文文本。             │
│                                                     │
│  快捷键：                                            │
│  • Ctrl+Shift+T  打开翻译窗口                        │
│  • Ctrl+Shift+M  多引擎对比                          │
│                                                     │
│  [🚀 开始使用]                                       │
└─────────────────────────────────────────────────────┘
```

#### 关键交互规则

| 规则 | 说明 |
|---|---|
| **跳过按钮始终可见** | 不强迫用户走完整流程，跳过后进入空状态主界面 |
| **每步独立验证** | API Key 输入框旁有「测试连接」按钮，实时调用 API 验证（发送 "hello" 翻译测试） |
| **验证反馈** | 成功 → 绿色 ✅ + 输入框绿色边框闪 1s；失败 → 红色 🔴 + 具体错误提示 |
| **Key 格式预检** | 粘贴时自动 trim 首尾空格；长度明显不对时实时提示（如火山 Key 通常 32 位） |
| **引导可重入** | 设置页底部有「重新运行引导」按钮，随时可重新进入 |
| **跳过后的降级** | 跳过引导后，首次翻译时弹提示：「未配置翻译引擎，请先在设置中填写 API Key」→ 一键跳转设置 |

#### 实现要点

```csharp
public class OnboardingService
{
    private const string SettingsFile = "settings.json";

    /// <summary>是否是首次使用（settings.json 不存在）</summary>
    public bool IsFirstRun => !File.Exists(GetSettingsPath());

    /// <summary>标记引导完成，写入初始配置</summary>
    public void CompleteOnboarding(OnboardingResult result)
    {
        var settings = new AppSettings
        {
            Version = 1,
            EnabledProviders = result.SelectedEngines,
            DefaultSourceLang = result.SourceLang,
            DefaultTargetLang = result.TargetLang,
            Credentials = EncryptCredentials(result.ApiKeys),
            OnboardingCompleted = true,
            CompletedAt = DateTime.UtcNow
        };
        SettingsManager.Save(settings);
    }

    /// <summary>测试单个引擎的 API Key 是否有效</summary>
    public async Task<ConnectionTestResult> TestConnectionAsync(
        string engineId, Dictionary<string, string> credentials, CancellationToken ct)
    {
        var provider = ProviderFactory.Create(engineId, credentials);
        try
        {
            var sw = Stopwatch.StartNew();
            await provider.TranslateAsync(new TranslationRequest
            {
                Text = "hello",
                SourceLang = "en",
                TargetLang = "zh"
            }, ct);
            sw.Stop();
            return ConnectionTestResult.Success(sw.ElapsedMilliseconds);
        }
        catch (AuthenticationException ex)
        {
            return ConnectionTestResult.Failed("API Key 无效: " + ex.Message);
        }
        catch (Exception ex)
        {
            return ConnectionTestResult.Failed("连接失败: " + ex.Message);
        }
    }
}
```

---

## 七、翻译历史与收藏

### 7.1 页签结构

收藏升级为独立一级页签后，主窗口工作流页签分为三个：

```
主窗口左侧工作流页签：🌍 翻译 → ⭐ 收藏 → 📋 历史
```

- **翻译页签**：核心翻译操作
- **收藏页签**：独立入口，快速访问已收藏译文
- **历史页签**：全部翻译记录浏览

收藏和历史的数据底层共享同一 SQLite 表（`TranslationHistory`，`IsFavorite` 字段区分），但 UI 展示为两个独立页签。

### 7.2 历史页签

### 7.2 历史页签内容

| 项目 | 方案 |
|---|---|
| **存储** | SQLite 本地数据库 |
| **字段** | 原文、译文、源语言、目标语言、引擎、时间戳、是否收藏 |
| **显示** | 默认按时间倒序，最近翻译的在最上方 |
| **搜索** | 支持按原文或译文关键词搜索 |
| **容量** | 默认保留最近 1000 条，可设置 |
| **操作** | 单条：复制、朗读、收藏/取消收藏、删除；批量：导出、清空 |
| **导出格式** | TXT / CSV / XLSX / Markdown / JSON / Anki TSV（详见 7.5 导出规范） |
| **隐私** | 数据仅存本地，不上传 |

### 7.3 收藏页签

用户点击 ⭐ 收藏的译文集中展示，方便快速查找常用翻译。

| 项目 | 方案 |
|---|---|
| **入口** | 主窗口「⭐ 收藏」一级页签（独立入口，无需进入历史页） |
| **数据来源** | 从全部历史中筛选 `is_favorite = true` 的记录 |
| **排序** | 默认按收藏时间倒序；可切换为「按使用频率」排序 |
| **搜索** | 支持按原文/译文/语言对搜索收藏内容 |
| **空状态** | 无收藏时显示：「还没有收藏的翻译，翻译结果旁点 ⭐ 即可收藏」+ 引导插图 |
| **操作** | 复制、朗读、取消收藏（取消后从此视图移除）、导出 |

#### 收藏卡片样式

```
┌─────────────────────────────────────────────────────┐
│  ⭐ 敏捷的棕色狐狸跳过了懒惰的狗。                    │
│  ─────────────────────────────────────────────────  │
│  原文: The quick brown fox jumps over the lazy dog. │
│  [EN→ZH] 🔥 火山翻译  ⭐ 收藏于 04-19 01:15         │
│                                                     │
│  [📋 复制]  [🔊 朗读]  [🗑 取消收藏]  [📊 查看对比]   │
└─────────────────────────────────────────────────────┘
```

### 7.4 收藏与智能推荐联动

| 行为 | 效果 |
|---|---|
| 用户点 ⭐ 收藏某引擎译文 | 该译文标记为「推荐」，存入收藏视图 |
| 长期收藏统计 | 记录每个引擎的被收藏次数，计算偏好度 |
| 偏好度应用 | 自动调整默认引擎优先级（收藏最多的排第一） |
| 收藏后再次翻译相同内容 | 高亮显示之前收藏过的译文 |
| 导出 | 收藏内容可单独导出为 TXT/CSV/XLSX/Markdown/JSON/Anki TSV（详见 7.5） |

### 7.5 导出格式规范

导出时用户可选择「全部历史」或「仅收藏」，每种格式的输出样例如下：

#### ① TXT（纯文本）

最通用，任何设备可打开。适合快速复制粘贴。

```
=== DotTranslator 翻译历史 ===
导出时间：2026-04-19 02:45
记录数：156 条

──────────────────────────────
[1] EN → ZH  |  🔥 火山翻译  |  2026-04-19 01:15  |  ⭐ 收藏
原文：The quick brown fox jumps over the lazy dog.
译文：敏捷的棕色狐狸跳过了懒惰的狗。

[2] EN → ZH  |  🧠 DeepSeek  |  2026-04-19 01:10
原文：Machine learning is a subset of artificial intelligence.
译文：机器学习是人工智能的一个子集。
──────────────────────────────
```

#### ② CSV（逗号分隔值）

Excel / WPS 直接打开，可筛选、排序、做数据分析。

```csv
序号,源语言,目标语言,原文,译文,引擎,时间,收藏
1,en,zh,"The quick brown fox jumps over the lazy dog.","敏捷的棕色狐狸跳过了懒惰的狗。","火山翻译","2026-04-19 01:15",是
2,en,zh,"Machine learning is a subset of artificial intelligence.","机器学习是人工智能的一个子集。","DeepSeek","2026-04-19 01:10",否
```

> 注意：原文/译文用双引号包裹，防止逗号/换行导致列错位。编码 UTF-8 with BOM（确保 WPS 不乱码）。

#### ③ XLSX（Excel 工作簿）

比 CSV 更专业，自带格式，适合正式场景。

| 列 | 内容 | 格式 |
|---|---|---|
| A 列 | 序号 | 数字，居中 |
| B 列 | 源语言 | 文本 |
| C 列 | 目标语言 | 文本 |
| D 列 | 原文 | 文本，自动换行 |
| E 列 | 译文 | 文本，自动换行，收藏行高亮 |
| F 列 | 引擎 | 文本 |
| G 列 | 时间 | 日期格式 |
| H 列 | 收藏 | ✅/— |

- 首行冻结（标题行固定）
- 列宽自适应内容
- 收藏行浅紫色底色高亮
- 用 `ClosedXML` 或 `EPPlus` 库生成

#### ④ Markdown

适合放进笔记、文档、Git 仓库。

```markdown
# DotTranslator 翻译历史

> 导出时间：2026-04-19 02:45 · 共 156 条

## EN → ZH · 2026-04-19

### ⭐ 敏捷的棕色狐狸跳过了懒惰的狗。
- 原文：The quick brown fox jumps over the lazy dog.
- 引擎：🔥 火山翻译 · 287ms
- 时间：2026-04-19 01:15

### 机器学习是人工智能的一个子集。
- 原文：Machine learning is a subset of artificial intelligence.
- 引擎：🧠 DeepSeek · 1.2s
- 时间：2026-04-19 01:10
```

#### ⑤ JSON（结构化数据）

备份/恢复用，也方便开发者二次处理。

```json
{
  "exportTime": "2026-04-19T02:45:00+08:00",
  "totalCount": 2,
  "records": [
    {
      "id": 1,
      "sourceLang": "en",
      "targetLang": "zh",
      "sourceText": "The quick brown fox jumps over the lazy dog.",
      "translatedText": "敏捷的棕色狐狸跳过了懒惰的狗。",
      "provider": "火山翻译",
      "latencyMs": 287,
      "timestamp": "2026-04-19T01:15:00+08:00",
      "isFavorite": true
    }
  ]
}
```

#### ⑥ Anki TSV（闪卡导入）

语言学习者的专属格式。Tab 分隔，直接拖入 Anki 导入。

```tsv
The quick brown fox jumps over the lazy dog.	敏捷的棕色狐狸跳过了懒惰的狗。	[EN→ZH] 火山翻译
Machine learning is a subset of artificial intelligence.	机器学习是人工智能的一个子集。	[EN→ZH] DeepSeek
```

- 第 1 列：原文（Anki 正面）
- 第 2 列：译文（Anki 背面）
- 第 3 列：标签（语言对 + 引擎名）
- 编码 UTF-8 without BOM
- 仅导出「收藏」记录（默认），也可选导出全部

#### 导出 UI

```
┌────────────────────────────────────────────┐
│  📄 导出翻译历史                             │
│                                            │
│  范围：[●全部 156 条] [○仅收藏 23 条]        │
│                                            │
│  格式：                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐          │
│  │  📄TXT  │ │  📊CSV  │ │  📋XLSX │          │
│  └────────┘ └────────┘ └────────┘          │
│  ┌────────┐ ┌────────┐ ┌────────┐          │
│  │  📝 MD  │ │  {}JSON │ │  🃏Anki │          │
│  └────────┘ └────────┘ └────────┘          │
│                                            │
│  保存位置：[  C:\Users\xxx\Desktop  ] [浏览] │
│                                            │
│         [取消]          [📄 开始导出]        │
└────────────────────────────────────────────┘
```

- 点击格式卡片即选中，选中后卡片外凸+强调色边框
- 默认保存到桌面，可自定义路径
- 导出完成弹出 Toast：「✅ 已导出 156 条记录到桌面」

---

## 八、术语表与打赏

### 8.1 术语表

| 项目 | 方案 |
|---|---|
| **格式** | 原文 → 译文 映射表 |
| **存储** | SQLite 或 JSON 文件 |
| **使用方式** | 翻译时作为 prompt 前缀注入 AI 模式 |
| | 普通模式下作为后处理替换（翻译完再按术语表修正） |
| **管理** | 设置页内增删改查，支持导入导出 |
| **适用** | 专业领域用户（技术文档、医学、法律等） |

---

### 8.2 打赏（Donate）

### 功能说明

软件免费使用，通过打赏窗体接受用户自愿赞助。

### 触发方式

- **主窗口页签**：标题栏「☕ 打赏」页签（直接切换到打赏内容展示）
- **关于页签**：「关于」页签底部「☕ 请我喝杯咖啡」按钮
- **系统托盘**：右键菜单 →「打赏支持」
- 首次使用 30 天后，可选弹出一次打赏提醒（可在设置中关闭，不再打扰）

### 打赏窗体设计

```
┌─────────────────────────────────────────────┐
│                          [✕ 关闭]            │
│                                             │
│            ☕ 请我喝杯咖啡                     │
│                                             │
│  DotTranslator 完全免费，如果你觉得好用，     │
│  可以请开发者喝杯咖啡 ☕                       │
│                                             │
│  你的支持是我持续更新的动力！                  │
│  每一份打赏都会让这个项目走得更远 💜           │
│                                             │
│  ┌─────────────────┬─────────────────┐      │
│  │                 │                 │      │
│  │  [微信收款码]    │  [支付宝收款码]   │      │
│  │   200×200px     │   200×200px     │      │
│  │                 │                 │      │
│  │                 │                 │      │
│  ├─────────────────┼─────────────────┤      │
│  │    微信支付      │    支付宝        │      │
│  └─────────────────┴─────────────────┘      │
│                                             │
│              [关闭]                          │
└─────────────────────────────────────────────┘
```

### 文案详情

| 区域 | 内容 |
|---|---|
| **标题** | ☕ 请我喝杯咖啡 |
| **主文案** | DotTranslator 完全免费，如果你觉得好用，可以请开发者喝杯咖啡 ☕ |
| **副文案** | 你的支持是我持续更新的动力！每一份打赏都会让这个项目走得更远 💜 |

### 二维码管理

| 项目 | 详情 |
|---|---|
| **存储方式** | 嵌入资源（EmbeddedResource），编译进 EXE，零外部依赖 |
| **格式** | PNG，200×200px |
| **微信收款码** | `Assets/donate/wechat.png`（嵌入资源名：`TranslatorApp.Assets.donate.wechat.png`） |
| **支付宝收款码** | `Assets/donate/alipay.png`（嵌入资源名：`TranslatorApp.Assets.donate.alipay.png`） |
| **更新方式** | 替换源码中的图片文件，重新编译即可 |
| **扫码提示** | 鼠标悬停在二维码上显示「请使用微信/支付宝扫码」 |

### 窗体样式

打赏内容有两种展示形式：

**① 页签模式（DonateView）**
- 作为主窗口页签之一，与翻译/历史/设置/关于平级
- 内容区居中展示打赏文案 + 微信/支付宝二维码
- 拟态风格，圆角 12-16px

**② 弹窗模式（DonateWindow）**
- 独立弹窗，拟态风格，圆角 16px
- 背景半透明遮罩（主窗口 60% 透明度黑底）
- 点击遮罩或关闭按钮关闭
- 窗口大小固定（约 480×520px），不可拉伸
- 二维码区域带轻微内凹阴影（拟态凹槽效果）
- 有弹出动画（从中心放大 + 淡入，300ms ease-out）

---

## 九、快捷键方案

| 功能 | 默认快捷键 | 可自定义 |
|---|---|---|
| 唤出主窗口 + 剪贴板翻译 | Ctrl+Shift+T | ✅ |
| 复制译文 | Ctrl+Shift+C | ✅ |
| 翻译并朗读 | Ctrl+Shift+R | ✅ |
| 多引擎对比 | Ctrl+Shift+M | ✅ |

---

## 十、设置页完整结构

```
设置
├── 基础设置
│   ├── 默认源语言（自动检测，默认）
│   ├── 默认目标语言（英语，默认；智能适配：中文→英语，非中文→中文）
│   ├── 默认模式（普通 / AI）
│   ├── 主题（跟随系统 / 浅色 / 深色）
│   ├── 字体大小 [12sp ───●─── 24sp]
│   ├── 界面语言 [简体中文 ▼]（简体中文 / English，预留）
│   ├── 开机自启 [●开启  ○关闭]
│   ├── 多引擎对比模式 [●开启  ○关闭]（翻译时自动发起多引擎并行对比）
│   ├── 动画效果 [●开启  ○关闭]（关闭后所有过渡动画禁用，遵循系统「减弱动画」设置）
│   └── 打赏提醒 [●开启  ○关闭]（首次 30 天后弹出一次，之后不再打扰）
│
├── 剪贴板监听
│   ├── 启用剪贴板监听 [●开启  ○关闭]（监听系统剪贴板变化，自动触发翻译）
│   ├── 自动翻译 [●开启  ○关闭]（关闭则复制后仅填入输入框，等用户确认）
│   ├── 主窗口隐藏时弹出浮窗 [●开启  ○关闭]
│   ├── 翻译完成后自动复制译文 [○开启  ●关闭]
│   ├── 智能语言交换 [●开启  ○关闭]（检测到源语言=目标语言时自动交换）
│   ├── 最短触发字符数 [2]
│   ├── 最长触发字符数 [5000]
│   └── 防抖间隔 [800 ms]
│
├── 引擎管理
│   ├── ┌─ 拖拽排序 ─────────────────────────────────────┐
│   │   │ 普通模式引擎优先级（拖拽调整顺序）             │
│   │   │ ≡ 火山翻译                                    │
│   │   │ ≡ 腾讯翻译君                                  │
│   │   │ ≡ 百度翻译                                    │
│   │   │ ≡ 彩云小译                                    │
│   │   │ ≡ 小牛翻译                                    │
│   │   └───────────────────────────────────────────────┘
│   │
│   ├── 普通模式
│   │   ├── 火山翻译
│   │   │   ├── 启用 [●开启  ○关闭]
│   │   │   ├── API Key: [____________] [👁] [📋]
│   │   │   ├── Secret:  [____________] [👁] [📋]
│   │   │   ├── [🔑 测试连接]  状态: ✅ 已连接（287ms）
│   │   │   ├── [📖 申请指南] → 跳转火山引擎
│   │   │   └── 本月已用: ████████░░ 1,234,567 / 2,000,000 字符
│   │   ├── 腾讯翻译君
│   │   │   ├── 启用 [●开启  ○关闭]
│   │   │   ├── SecretId:  [____________] [📋]
│   │   │   ├── SecretKey: [____________] [👁] [📋]
│   │   │   ├── [🔑 测试连接]  状态: ✅ 已连接（412ms）
│   │   │   ├── [📖 申请指南] → 跳转腾讯云
│   │   │   └── 本月已用: ███░░░░░░░ 1,234,567 / 5,000,000 字符
│   │   ├── 百度翻译
│   │   │   ├── 启用 [○开启  ●关闭]
│   │   │   ├── AppId:    [____________] [📋]
│   │   │   ├── Secret:   [____________] [👁] [📋]
│   │   │   ├── [🔑 测试连接]  状态: ⏳ 未验证
│   │   │   └── [📖 申请指南] → 跳转百度翻译开放平台
│   │   ├── 彩云小译
│   │   │   ├── 启用 [○开启  ●关闭]
│   │   │   ├── Token:   [____________] [👁] [📋]
│   │   │   ├── [🔑 测试连接]  状态: ⏳ 未验证
│   │   │   └── [📖 申请指南] → 需发邮件申请
│   │   └── 小牛翻译
│   │       ├── 启用 [○开启  ●关闭]
│   │       ├── AppId:   [____________] [📋]
│   │       ├── API Key: [____________] [👁] [📋]
│   │       ├── [🔑 测试连接]  状态: ⏳ 未验证
│   │       └── [📖 申请指南] → 跳转小牛翻译
│   │
│   └── AI 模式
│       ├── DeepSeek
│       │   ├── 启用 [●开启  ○关闭]
│       │   ├── 模型: [V3 ▼]（V3 日常首选 / R1 推理增强）
│       │   ├── API Key: [____________] [👁] [📋]
│       │   ├── [🔑 测试连接]  状态: ✅ 已连接（1.1s）
│       │   ├── [📖 申请指南] → 跳转 DeepSeek 平台
│       │   └── V3: ¥2-8/百万 token · R1: ¥1-4/百万 token
│       ├── 通义千问-plus
│       │   ├── 启用 [○开启  ●关闭]
│       │   ├── API Key: [____________] [👁] [📋]
│       │   ├── [🔑 测试连接]  状态: ⏳ 未验证
│       │   └── [📖 申请指南] → 跳转阿里云 DashScope
│       └── Kimi（Moonshot）
│           ├── 启用 [○开启  ●关闭]
│           ├── API Key: [____________] [👁] [📋]
│           ├── [🔑 测试连接]  状态: ⏳ 未验证
│           └── [📖 申请指南] → 跳转 Moonshot 平台
│
├── 快捷键设置
│   ├── 剪贴板翻译 [Ctrl+Shift+T] [修改]
│   ├── 复制译文   [Ctrl+Shift+C] [修改]
│   ├── 翻译朗读   [Ctrl+Shift+R] [修改]
│   ├── 多引擎对比 [Ctrl+Shift+M] [修改]
│   ├── 打开翻译窗口 [Ctrl+N] [修改]
│   ├── 打开设置    [Ctrl+,] [修改]
│   ├── 打开历史    [Ctrl+H] [修改]
│   ├── 退出应用    [Ctrl+Q] [修改]
│   └── 帮助       [F1] [修改]
│   └── 修改时自动检测冲突，若与系统快捷键冲突则弹出警告
│
├── TTS 设置
│   ├── 默认引擎 [●讯飞 TTS  ○Edge TTS]
│   ├── 讯飞 TTS 配置
│   │   ├── AppId:    [_______________] [📋]
│   │   ├── ApiKey:   [_______________] [👁] [📋]
│   │   ├── ApiSecret:[_______________] [👁] [📋]
│   │   ├── [📖 申请指南] → 跳转 xfyun.cn
│   │   ├── 音色选择: [下拉选择 ▼] [🔊 试听]（分组：通用/生活/新闻/儿童）
│   │   └── 今日已用: ████████░░ 16,234 / 20,000 次
│   ├── Edge TTS 配置
│   │   ├── （无需 API Key，开箱即用）
│   │   ├── 音色选择: [下拉选择 ▼] [🔊 试听]
│   │   └── 状态: ✅ 可用
│   ├── 语速 [0.5x ──────●── 2.0x]  当前: 1.0x
│   ├── 音量 [░░░░░░░●░░]  当前: 80%
│   ├── 自动朗读 [○关闭  ●翻译后自动朗读译文  ○翻译后自动朗读原文]
│   └── 额度耗尽策略 [●自动切换到备选引擎  ○静默失败  ○弹窗提醒]
│
├── 翻译历史
│   ├── 保留条数 [1000 ▼]（100 / 500 / 1000 / 5000 / 永不删除）
│   ├── 清空历史 [🗑 确认清空]（二次确认弹窗）
│   ├── 清除缓存 [🧹 清除]（清除内存翻译缓存，不影响历史记录）
│   ├── 导出全部 [TXT] [CSV] [XLSX] [Markdown] [JSON]
│   ├── 导出收藏 [TXT] [CSV] [XLSX] [Markdown] [JSON] [Anki TSV]
│   └── 收藏设置
│       ├── 收藏时自动调整引擎优先级 [●开启  ○关闭]
│       └── Anki 导出字段配置
│
├── 术语表
│   ├── 术语列表（表格，增删改查）
│   ├── 导入 [JSON] [CSV]
│   └── 导出 [JSON] [CSV]
│
├── 诊断
│   ├── 引擎状态面板
│   │   ├── 火山翻译    ✅ 正常      延迟: 287ms  本月已用: 1,234,567 / 2,000,000
│   │   ├── 腾讯翻译君  ⚠️ 降级      延迟: 1,203ms  本月已用: 4,567,890 / 5,000,000
│   │   ├── DeepSeek    ✅ 正常      延迟: 1.1s   状态: V3
│   │   └── ...（所有已启用引擎）
│   ├── 熔断器状态
│   │   ├── 火山翻译    Closed   连续失败: 0
│   │   ├── 腾讯翻译君  Closed   连续失败: 2
│   │   └── 彩云小译    Open     剩余: 23s   连续失败: 5
│   ├── 缓存统计
│   │   ├── 缓存条目数: 3,456 / 10,000
│   │   ├── 命中率: 34.2%
│   │   └── [🧹 清除所有缓存]
│   ├── 性能监控
│   │   ├── 启动耗时: 2.1s ✅          目标: ≤ 3s
│   │   ├── 内存占用: 67MB ✅          目标: ≤ 80MB
│   │   ├── CPU 占用: 0.3% ✅          目标: ≤ 1%
│   │   ├── 今日翻译 P95: 1.8s ✅      目标: ≤ 3s
│   │   └── 各引擎 P50/P95 延迟统计（每 5s 刷新，超标标红）
│   ├── 日志
│   │   ├── 日志级别 [Info ▼]（Info / Debug / Warning / Error）
│   │   ├── 打开日志目录 [📂 打开]
│   │   └── 最近日志 [📋 查看]（应用内查看最近 50 条日志，脱敏显示）
│   ├── 引擎健康检查 [🔄 一键检查]（测试所有已启用引擎的连通性）
│   └── [📄 导出诊断报告] → 导出为 JSON（含引擎状态/熔断器/缓存/日志摘要，方便反馈 Bug）
│
└── 关于
    ├── 版本号: v1.0.0
    ├── [🔄 检查更新]
    ├── 开源协议: MIT License
    ├── [🔗 隐私政策] → 打开隐私政策页面
    ├── [📝 提交反馈] → 跳转 GitHub Issue 创建页（预填充模板）
    ├── [💬 GitHub Discussions] → 跳转社区讨论
    └── ☕ 请我喝杯咖啡 [打赏]
```

---

## 十一、项目结构

```
TranslatorApp.sln
│
├── TranslatorApp/                        # Avalonia 主项目
│   ├── ViewModels/
│   │   ├── MainViewModel.cs
│   │   ├── SettingsViewModel.cs
│   │   ├── HistoryViewModel.cs
│   │   └── DonateViewModel.cs
│   ├── Views/
│   │   ├── MainWindow.axaml
│   │   ├── SettingsView.axaml
│   │   ├── HistoryView.axaml
│   │   ├── AboutView.axaml
│   │   ├── DonateView.axaml              # 打赏页签视图
│   │   └── DonateWindow.axaml            # 打赏弹窗（从关于页/托盘触发）
│   ├── Controls/                         # 自定义控件
│   │   ├── TranslationPairView.axaml
│   │   ├── EngineSelectorView.axaml
│   │   └── AnnouncementBar.axaml
│   ├── Services/                         # 平台相关
│   │   ├── IClipboardService.cs
│   │   ├── IHotkeyService.cs
│   │   ├── AnnouncementService.cs
│   │   └── Windows/
│   │       ├── ClipboardService.cs
│   │       └── HotkeyService.cs
│   ├── Converters/
│   ├── Assets/
│   │   ├── app-icon.svg                # 应用图标矢量源文件
│   │   ├── app-icon.ico                # 多尺寸 ICO（16/32/48/256）
│   │   ├── app-icon-256.png            # 256×256 PNG
│   │   └── donate/
│   │       ├── wechat.png               # 微信收款码（EmbeddedResource）
│   │       └── alipay.png               # 支付宝收款码（EmbeddedResource）
│   └── App.axaml
│
├── Translator.Core/                      # 核心逻辑（纯类库）
│   ├── Translation/
│   │   ├── ITranslationProvider.cs
│   │   ├── TranslationManager.cs
│   │   ├── TranslationRouter.cs
│   │   ├── TranslationPipeline.cs
│   │   ├── TranslationCache.cs
│   │   ├── TranslationPreProcessor.cs
│   │   ├── TranslationPostProcessor.cs
│   │   └── Providers/
│   │       ├── HuoshanProvider.cs
│   │       ├── TencentProvider.cs
│   │       ├── BaiduProvider.cs
│   │       ├── CaiyunProvider.cs
│   │       ├── NiutransProvider.cs
│   │       ├── DeepSeekProvider.cs
│   │       ├── QwenProvider.cs
│   │       └── KimiProvider.cs
│   ├── Tts/
│   │   ├── ITtsProvider.cs
│   │   ├── EdgeTtsProvider.cs
│   │   └── XunfeiTtsProvider.cs
│   ├── Storage/
│   │   ├── HistoryRepository.cs
│   │   ├── SettingsRepository.cs
│   │   └── GlossaryRepository.cs
│   ├── Models/
│   │   ├── TranslationRequest.cs
│   │   ├── TranslationResult.cs
│   │   ├── LanguagePair.cs
│   │   ├── EngineConfig.cs
│   │   └── AppSettings.cs
│   ├── Resilience/
│   │   ├── RetryPolicy.cs
│   │   ├── CircuitBreaker.cs
│   │   ├── TimeoutPolicy.cs
│   │   ├── ResiliencePipeline.cs
│   │   └── ClientRateLimiter.cs
│   ├── Security/
│   │   └── SecureStorage.cs
│   └── Diagnostics/
│       ├── TranslationMetrics.cs
│       └── StartupHealthCheck.cs
│
├── Translator.Tests/                     # 单元测试
│   ├── TranslationManagerTests.cs
│   ├── ProviderTests.cs
│   ├── ResilienceTests.cs
│   └── StorageTests.cs
│
└── build/
    └── installer.nsi
```

---

## 十二、NuGet 依赖

```xml
<!-- UI -->
<PackageReference Include="Avalonia" Version="11.*" />
<PackageReference Include="Avalonia.Desktop" Version="11.*" />
<PackageReference Include="Avalonia.Themes.Fluent" Version="11.*" />
<PackageReference Include="CommunityToolkit.Mvvm" Version="8.*" />

<!-- DI + 配置 -->
<PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="8.*" />
<PackageReference Include="Microsoft.Extensions.Configuration.Json" Version="8.*" />

<!-- HTTP -->
<PackageReference Include="Refit" Version="7.*" />

<!-- 数据 -->
<PackageReference Include="Microsoft.Data.Sqlite" Version="8.*" />
<PackageReference Include="Dapper" Version="2.*" -->

<!-- 序列化 + 日志 -->
<PackageReference Include="System.Text.Json" Version="8.*" />
<PackageReference Include="Serilog.Sinks.File" Version="5.*" />

<!-- 打包 -->
<!-- Velopack（通过 dotnet tool 或手动集成） -->
```

---

## 十三、国际化（i18n）

> 目标用户为中国用户，UI 主要使用中文，但需为未来多语言支持预留架构。

### 13.1 资源文件方案

| 项目 | 方案 |
|---|---|
| **机制** | Avalonia 内建 `ResourceDictionary` + `.resx` 文件 |
| **默认语言** | `zh-CN`（简体中文） |
| **资源目录** | `Assets/Lang/` 下按语言代码分文件 |
| **文件格式** | `.axaml` ResourceDictionary（推荐）或 `.resx` |

#### 资源文件结构

```
Assets/
└── Lang/
    ├── zh-CN.axaml    ← 默认（简体中文）
    ├── zh-TW.axaml    ← 繁体中文（预留）
    └── en-US.axaml    ← 英文（预留）
```

### 13.2 资源文件完整 Key 清单

总计约 120 个 key，按模块分组：

#### 通用（Common）

| Key | zh-CN | en-US |
|---|---|---|
| `App.Name` | DotTranslator | DotTranslator |
| `Btn.Translate` | 翻 译 | Translate |
| `Btn.Copy` | 复 制 | Copy |
| `Btn.Clear` | 清 空 | Clear |
| `Btn.Retry` | 重 试 | Retry |
| `Btn.Cancel` | 取 消 | Cancel |
| `Btn.Save` | 保 存 | Save |
| `Btn.Delete` | 删 除 | Delete |
| `Btn.Close` | 关 闭 | Close |
| `Btn.Back` | 上一步 | Back |
| `Btn.Next` | 下一步 | Next |
| `Btn.Finish` | 完 成 | Finish |
| `Status.Connected` | 已连接 | Connected |
| `Status.Loading` | 加载中... | Loading... |

#### 翻译页（Translate）

| Key | zh-CN | en-US |
|---|---|---|
| `Translate.AutoDetect` | 自动检测 | Auto Detect |
| `Translate.Placeholder` | 在此输入要翻译的文本... | Enter text to translate... |
| `Translate.ResultPlaceholder` | 译文将在此处显示... | Translation will appear here... |
| `Translate.DetectedLang` | 已检测: {0} | Detected: {0} |
| `Translate.CharCount` | {0} 字符 | {0} characters |
| `Translate.Translating` | 正在翻译... | Translating... |
| `Translate.Cached` | 来自缓存 | From cache |

#### 多引擎对比（Compare）

| Key | zh-CN | en-US |
|---|---|---|
| `Compare.Title` | 多引擎对比 | Multi-Engine Comparison |
| `Compare.Progress` | {0}/{1} 已完成 | {0}/{1} completed |
| `Compare.Recommended` | 推荐 | Recommended |
| `Compare.AICompare` | AI 对比 | AI Compare |
| `Compare.Similarity` | 相似度分析 | Similarity Analysis |
| `Compare.ExportReport` | 导出对比报告 | Export Comparison Report |
| `Compare.Unsupported` | 不支持该语种 | Unsupported language |

#### 错误信息（Error）

| Key | zh-CN | en-US |
|---|---|---|
| `Error.Timeout` | 响应超时 (>10s) | Response timeout (>10s) |
| `Error.QuotaExceeded` | 本月额度已耗尽 | Monthly quota exceeded |
| `Error.InvalidKey` | API Key 无效，请检查设置 | Invalid API Key, please check settings |
| `Error.NetworkError` | 网络连接失败 | Network connection failed |
| `Error.ServerError` | 服务异常 | Service error |
| `Error.AllProvidersExhausted` | 所有引擎暂不可用 | All providers unavailable |
| `Error.Retry` | 重 试 | Retry |

#### 设置（Settings）

| Key | zh-CN | en-US |
|---|---|---|
| `Settings.Title` | 设置 | Settings |
| `Settings.Engines` | 翻译引擎 | Translation Engines |
| `Settings.TTS` | 语音朗读 | Text-to-Speech |
| `Settings.Appearance` | 外观 | Appearance |
| `Settings.Theme` | 主题 | Theme |
| `Settings.Theme.Light` | 浅色 | Light |
| `Settings.Theme.Dark` | 深色 | Dark |
| `Settings.Theme.Auto` | 跟随系统 | System |
| `Settings.AutoStart` | 开机自启 | Start on boot |
| `Settings.ClipboardMonitor` | 剪贴板监听 | Clipboard monitoring |
| `Settings.FontSize` | 字体大小 | Font size |
| `Settings.Language` | 界面语言 | UI Language |

#### 历史/收藏（History）

| Key | zh-CN | en-US |
|---|---|---|
| `History.Title` | 翻译历史 | Translation History |
| `History.Favorites` | 我的收藏 | My Favorites |
| `History.Search` | 搜索历史记录... | Search history... |
| `History.Empty` | 暂无翻译记录 | No translation history |
| `History.ClearAll` | 清空全部 | Clear All |
| `History.ConfirmClear` | 确定要清空所有历史记录吗？ | Clear all history? |

#### 引导流程（Onboarding）

| Key | zh-CN | en-US |
|---|---|---|
| `Onboarding.Welcome` | 欢迎使用 DotTranslator | Welcome to DotTranslator |
| `Onboarding.Desc` | 轻量、免费、多引擎聚合对比的桌面翻译工具 | A lightweight, free, multi-engine desktop translator |
| `Onboarding.Start` | 开始设置 | Get Started |
| `Onboarding.Skip` | 跳过，直接使用 | Skip, use directly |
| `Onboarding.APIKeyHint` | API Key 仅存储在本地，加密保存，不会上传 | API keys are stored locally, encrypted, never uploaded |
| `Onboarding.TestConnection` | 测试连接 | Test Connection |
| `Onboarding.Done` | 设置完成！ | Setup Complete! |

### 13.3 格式化规则

| 类型 | 规则 | 示例 |
|---|---|---|
| **参数占位符** | 使用 `{0}` `{1}` 序号占位 | `已检测: {0}` → `已检测: 英语` |
| **复数** | 中文无复数，英文需要处理 | `{0} character` / `{0} characters` |
| **日期时间** | 使用当前 locale 的默认格式 | zh-CN: `2026-04-19 01:15` / en-US: `Apr 19, 2026 1:15 AM` |
| **数字格式** | 千分位使用当前 locale | zh-CN: `1,234,567` / de-DE: `1.234.567` |

### 13.4 XAML 中使用

```xml
<TextBlock Text="{DynamicResource Btn.Translate}"/>
<TextBox Watermark="{DynamicResource Translate.Placeholder}"/>
```

### 13.5 语言切换机制

```
用户更改界面语言
  │
  ├─ 1. 更新 `CultureInfo.CurrentUICulture`
  ├─ 2. 重新加载对应语言的 ResourceDictionary
  ├─ 3. 通知所有绑定到资源 key 的 UI 元素刷新
  ├─ 4. 保存语言偏好到 settings.json
  └─ 5. 无需重启应用（Avalonia 支持运行时切换）
```

### 13.6 未来扩展语言

| 语言 | 代码 | 优先级 | 说明 |
|---|---|---|---|
| 简体中文 | zh-CN | P0 | 默认，完整覆盖 |
| 繁体中文 | zh-TW | P1 | 港澳台用户 |
| 英语 | en-US | P1 | 国际用户、开源社区 |
| 日语 | ja-JP | P2 | 日本用户 |
| 韩语 | ko-KR | P2 | 韩国用户 |

第一版仅提供 `zh-CN`，不实现语言切换 UI。但架构已预留：
- 所有 UI 文案走 `DynamicResource` 而非硬编码
- 新增语言只需添加 `.axaml` 文件 + 注册到语言列表

---

## 十四、无障碍（Accessibility）

> 确保视觉障碍和键盘用户也能正常使用核心功能。按 WCAG 2.1 AA 级标准设计。

### 14.1 键盘导航

#### 全局快捷键

| 快捷键 | 功能 | 作用域 |
|---|---|---|
| `Ctrl+Shift+T` | 打开/聚焦翻译窗口 | 全局（系统级热键） |
| `Ctrl+Shift+M` | 多引擎对比 | 全局 |
| `Ctrl+N` | 清空输入，开始新翻译 | 应用内 |
| `Ctrl+,` | 打开设置 | 应用内 |
| `Ctrl+H` | 打开历史 | 应用内 |
| `Ctrl+Q` | 退出 | 应用内 |
| `F1` | 帮助/快捷键列表 | 应用内 |

#### 翻译页 Tab 导航顺序

```
Tab 顺序（从上到下，从左到右）：
1. 语言选择器（源语言）
2. ⇄ 交换按钮
3. 语言选择器（目标语言）
4. 输入文本框
5. 清空按钮
6. 翻译按钮
7. 结果区 - 引擎标识
8. 结果区 - 译文文本（可选中、可复制）
9. 结果区 - 朗读按钮
10. 结果区 - 复制按钮
11. 结果区 - 收藏按钮
12. 结果区 - 多引擎对比按钮
```

#### 多引擎对比页 Tab 导航顺序

```
1. 返回普通对比按钮（AI 模式时）
2. AI 对比按钮
3. 第一张卡片 → 引擎名 → 译文 → 复制 → 朗读 → 收藏 → 查差异
4. 第二张卡片 → ...
5. 相似度分析按钮
6. 复制最优按钮
7. 导出报告按钮
```

#### 焦点可见性

- 所有可交互元素获得焦点时，显示 **2px 粗的紫色焦点环**（`outline: 2px solid var(--accent)`）
- 焦点环颜色在深色主题下自动变为浅紫色
- 焦点环不占用布局空间（使用 `outline-offset: 2px`）
- 拟态按钮获得焦点时，阴影加深以区别于普通状态

#### 焦点陷阱

- 模态对话框（打赏弹窗、确认框）打开时，焦点限制在对话框内
- 按 `Esc` 关闭对话框，焦点回到触发按钮
- 下拉菜单打开时，`↑` `↓` 在选项间移动，`Enter` 选择，`Esc` 关闭

### 14.2 屏幕阅读器支持

Avalonia UI 通过 `AutomationProperties` 提供屏幕阅读器支持：

#### ARIA 属性清单

| 元素 | Role | ARIA 属性 | 说明 |
|---|---|---|---|
| 主窗口 | `application` | — | 根容器 |
| 页签栏 | `tablist` | — | — |
| 页签按钮 | `tab` | `aria-selected="true/false"` | 当前激活页签 |
| 页签内容 | `tabpanel` | `aria-labelledby="{tab-id}"` | 关联页签 |
| 输入框 | `textbox` | `aria-label="输入要翻译的文本"` | — |
| 翻译按钮 | `button` | `aria-label="翻译"` | — |
| 结果卡片 | `region` | `aria-label="翻译结果 - 火山翻译"` | 每张卡片独立 region |
| 引擎状态 | `status` | `aria-live="polite"` | 状态变化时通知阅读器 |
| 进度条 | `progressbar` | `aria-valuenow/min/max` | 多引擎对比进度 |
| 错误提示 | `alert` | `aria-live="assertive"` | 错误信息立即播报 |
| 语言选择器 | `combobox` | `aria-expanded` | — |
| 开关按钮 | `switch` | `aria-checked="true/false"` | 引擎启用/禁用 |
| 收藏按钮 | `button` | `aria-pressed="true/false"` | 收藏状态 |

#### 动态内容播报

| 事件 | 播报方式 | 时机 |
|---|---|---|
| 翻译开始 | `aria-live="polite"`：「正在翻译...」 | 按钮点击后 |
| 翻译完成 | `aria-live="polite"`：「翻译完成，结果已显示」 | 结果渲染后 |
| 翻译失败 | `aria-live="assertive"`：「翻译失败：{错误原因}」 | 错误发生时 |
| 多引擎进度 | `aria-live="polite"`：「3/5 引擎已完成」 | 每个引擎返回时 |
| 复制成功 | `aria-live="polite"`：「已复制到剪贴板」 | 复制操作后 |
| 引擎切换 | `aria-live="polite"`：「已自动切换到百度翻译，原因：额度耗尽」 | 切换发生时 |

```xml
<!-- 示例：翻译按钮 -->
<Button Content="⚡ 翻译"
        Command="{Binding TranslateCommand}"
        AutomationProperties.Name="翻译"
        AutomationProperties.HelpText="按下 Enter 或点击翻译当前文本" />

<!-- 示例：结果卡片 -->
<Border AutomationProperties.Name="翻译结果 - 火山翻译"
        AutomationProperties.AutomationId="result-card-huoshan">
  ...
</Border>

<!-- 示例：引擎状态变化播报 -->
<TextBlock Text="{Binding StatusMessage}"
           AutomationProperties.LiveSetting="Polite" />
```

### 14.3 高对比度模式

支持 Windows 高对比度主题：

```csharp
// 检测高对比度
var platformSettings = AvaloniaLocator.Current.GetService<PlatformSettings>();
var isHighContrast = platformSettings?.HighContrast ?? false;

if (isHighContrast)
{
    // 应用高对比度主题：移除阴影，使用实线边框
    Application.Current.Styles.Add(new HighContrastTheme());
}
```

- 检测到高对比度时，禁用自定义阴影效果
- 所有图标使用 SVG 矢量格式，支持颜色反转
- 引擎状态图标（✅🔴🟡⚪）同时用文字标注，不依赖纯颜色传达信息
- 前景/背景对比度 ≥ 4.5:1

### 14.4 字体缩放

| 范围 | 默认 | 最小 | 最大 |
|---|---|---|---|
| 界面 UI | 14px | 12px | 24px |
| 输入框 | 16px | 14px | 28px |
| 译文结果 | 16px | 14px | 32px |

- 设置页提供字体大小滑块（4 档或连续滑块）
- 支持 `Ctrl++` / `Ctrl+-` 快捷键实时缩放
- 窗口布局使用相对单位（`rem` / `em`），缩放时自适应
- 最大缩放下，卡片自动换行（响应式）

### 14.5 动画减弱

| 要求 | 方案 |
|---|---|
| **检测** | 系统设置「减弱动画」或设置页手动关闭 |
| **行为** | 禁用所有过渡动画、骨架屏 shimmer、主题切换渐变 |
| **降级** | 直接显示最终状态，无中间动画帧 |

```csharp
// 检测系统动画偏好
var reduceMotion = platformSettings?.ReduceMotion ?? false;
var userPref = SettingsService.Get<bool>("ReduceMotion");

if (reduceMotion || userPref)
{
    Application.Current.Resources["EnableAnimations"] = false;
}
```

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- 设置页提供「动画效果」开关，用户可手动覆盖系统设置
- 关闭动画后，所有状态变化仍正常工作，只是没有过渡效果

### 14.6 语义化标签检查清单

| 组件 | 是否使用语义化标签 | 需要的调整 |
|---|---|---|
| 页签栏 | ✅ `TabItem` | — |
| 按钮 | ✅ `Button` | — |
| 输入框 | ✅ `TextBox` | — |
| 下拉框 | ✅ `ComboBox` | — |
| 开关 | ⚠️ 需要验证 | 确保用 `ToggleSwitch` 而非自定义 `CheckBox` |
| 结果卡片 | ⚠️ 需要验证 | 用 `ContentControl` + `AutomationProperties` |
| 导航 | ⚠️ 需要验证 | 用 `TabControl` 或自定义导航控件 |
| 进度条 | ⚠️ 需要验证 | 用 `ProgressBar` 而非自定义控件 |

### 14.7 自动化测试要求

| 测试类型 | 工具 | 频率 |
|---|---|---|
| 键盘导航测试 | 手动 + UI 自动化（FlaUI） | 每个版本 |
| 屏幕阅读器测试 | NVDA + Narrator（手动） | 每个大版本 |
| 颜色对比度检查 | Colour Contrast Analyser | UI 变更时 |
| 高对比度测试 | Windows 高对比度主题 | 每个版本 |
| WCAG 合规扫描 | axe-core（如集成到 CI） | 每次 PR |

---

## 十五、工程专业化细节

### 15.1 翻译请求管道架构

所有翻译请求走统一管道，不直接调用 Provider：

```
用户触发翻译
  │
  ▼
┌─────────────────────────────────────────────────┐
│              Translation Pipeline                │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ ① 输入层  │→│ ② 缓存层  │→│ ③ 路由层      │  │
│  │ 预处理    │  │ 命中则返回 │  │ 选择引擎      │  │
│  └──────────┘  └──────────┘  └───────┬───────┘  │
│                                      │          │
│                                      ▼          │
│                              ┌───────────────┐  │
│                              │ ④ 弹性策略层   │  │
│                              │ 重试/熔断/降级  │  │
│                              └───────┬───────┘  │
│                                      │          │
│                                      ▼          │
│                              ┌───────────────┐  │
│                              │ ⑤ Provider层  │  │
│                              │ 实际调用 API   │  │
│                              └───────┬───────┘  │
│                                      │          │
│                                      ▼          │
│                              ┌───────────────┐  │
│                              │ ⑥ 后处理层     │  │
│                              │ 术语替换/格式化 │  │
│                              └───────┬───────┘  │
│                                      │          │
│                                      ▼          │
│                              ┌───────────────┐  │
│                              │ ⑦ 计费层       │  │
│                              │ 更新用量计数   │  │
│                              └───────┬───────┘  │
│                                      │          │
│                                      ▼          │
│                                  返回结果        │
└─────────────────────────────────────────────────┘
```

---

### 15.2 错误分类体系

所有 API 错误统一分类，不同错误走不同处理策略：

```csharp
public enum TranslationErrorType
{
    /// <summary>HTTP 429 或平台返回限流码，配额/频率超限</summary>
    RateLimited,

    /// <summary>HTTP 401/403，API Key 无效、过期、权限不足</summary>
    AuthenticationFailed,

    /// <summary>DNS 解析失败、连接超时、SSL 错误、无网络</summary>
    NetworkError,

    /// <summary>请求发出超过 10 秒未响应</summary>
    Timeout,

    /// <summary>HTTP 500/502/503，服务端内部错误</summary>
    ServerError,

    /// <summary>HTTP 400，请求参数错误（语言不支持、文本过长等）</summary>
    InvalidRequest,

    /// <summary>响应格式异常，无法解析翻译结果</summary>
    ParseError,

    /// <summary>未知错误</summary>
    Unknown
}
```

#### 错误分类判定逻辑

```csharp
public static TranslationErrorType ClassifyError(Exception ex, HttpResponseMessage response = null)
{
    // 网络层错误
    if (ex is HttpRequestException httpEx)
    {
        if (httpEx.InnerException is SocketException)
            return TranslationErrorType.NetworkError;
        if (httpEx.InnerException is AuthenticationException)
            return TranslationErrorType.AuthenticationFailed;
    }

    // 超时
    if (ex is TaskCanceledException || ex is TimeoutException)
        return TranslationErrorType.Timeout;

    // HTTP 状态码
    if (response != null)
    {
        return response.StatusCode switch
        {
            HttpStatusCode.TooManyRequests        => TranslationErrorType.RateLimited,
            HttpStatusCode.Unauthorized            => TranslationErrorType.AuthenticationFailed,
            HttpStatusCode.Forbidden               => TranslationErrorType.AuthenticationFailed,
            HttpStatusCode.BadRequest              => TranslationErrorType.InvalidRequest,
            HttpStatusCode.InternalServerError     => TranslationErrorType.ServerError,
            HttpStatusCode.BadGateway              => TranslationErrorType.ServerError,
            HttpStatusCode.ServiceUnavailable      => TranslationErrorType.ServerError,
            HttpStatusCode.GatewayTimeout          => TranslationErrorType.Timeout,
            _                                      => TranslationErrorType.Unknown
        };
    }

    // 平台自定义错误码（各 Provider 内部判断）
    // 例如百度翻译返回 error_code: 54003 = 未授权, 54004 = 配额不足
    // 由各 Provider 的 ParseError 方法映射

    return TranslationErrorType.Unknown;
}
```

#### 各错误类型的处理策略

| 错误类型 | 重试 | 熔断 | 降级 | 用户提示 |
|---|---|---|---|---|
| **RateLimited** | ❌ 不重试 | ✅ 标记今日不可用 | ✅ 切下一个引擎 | 「XX 翻译配额已耗尽」 |
| **AuthenticationFailed** | ❌ 不重试 | ✅ 标记配置错误 | ✅ 切下一个引擎 | 「XX 翻译 API Key 无效，请检查设置」 |
| **NetworkError** | ✅ 重试 2 次 | ✅ 连续 3 次失败后熔断 60s | ✅ 切下一个引擎 | 「网络连接失败」 |
| **Timeout** | ✅ 重试 1 次 | ✅ 连续 3 次后熔断 30s | ✅ 切下一个引擎 | 「XX 翻译响应超时」 |
| **ServerError** | ✅ 重试 2 次（指数退避） | ✅ 连续 5 次后熔断 120s | ✅ 切下一个引擎 | 「XX 翻译服务异常」 |
| **InvalidRequest** | ❌ 不重试 | ❌ | ❌ 报错 | 「翻译请求参数错误」 |
| **ParseError** | ❌ 不重试 | ✅ 连续 3 次后标记异常 | ✅ 切下一个引擎 | 「XX 翻译返回格式异常」 |

#### 错误场景 UI 设计

以下定义每种错误场景下，用户看到的具体界面。

**网络断开（`NetworkError`）：**

```
┌─────────────────────────────────────┐
│ ⚠️ 网络连接失败                       │
│                                     │
│ 无法连接到翻译服务，请检查：           │
│ • 网络连接是否正常                    │
│ • 是否需要开启代理/VPN               │
│                                     │
│ [🔄 重试]    [⚙️ 网络设置]           │
└─────────────────────────────────────┘
```

- 翻译按钮变为灰色，文字变为「无网络」
- 保留上次结果，叠加半透明遮罩 + 提示
- 底部状态栏显示 🔴 离线

**API Key 无效/过期（`AuthenticationFailed`）：**

```
┌─────────────────────────────────────┐
│ 🔑 火山翻译 API Key 无效              │
│                                     │
│ 可能原因：                            │
│ • API Key 已过期或被吊销              │
│ • Key 格式错误（复制时遗漏了字符）     │
│ • 账号欠费或被冻结                    │
│                                     │
│ [⚙️ 前往设置]   [📖 查看申请指南]     │
└─────────────────────────────────────┘
```

- 引擎卡片状态图标变为 🔴，该引擎自动禁用
- 「前往设置」直接跳转到对应引擎的设置项

**服务商改版/接口变更（`ParseError` 连续 3 次）：**

```
┌─────────────────────────────────────┐
│ 💥 百度翻译返回格式异常                │
│                                     │
│ 连续 3 次无法解析翻译结果，可能是：     │
│ • 服务商更新了接口格式                 │
│ • 请求参数不兼容                      │
│                                     │
│ 已自动暂停使用此引擎。                 │
│                                     │
│ [📋 导出错误详情]   [🔗 提交反馈]      │
└─────────────────────────────────────┘
```

**所有引擎不可用：**

```
┌─────────────────────────────────────┐
│ 🚫 所有翻译引擎暂不可用               │
│                                     │
│ 当前引擎状态：                        │
│ 🔥 火山翻译    🔴 API Key 无效       │
│ 🐧 腾讯翻译    🟡 额度耗尽           │
│ 📦 百度翻译    🔴 网络错误           │
│                                     │
│ [⚙️ 前往设置]   [📊 诊断报告]         │
└─────────────────────────────────────┘
```

- 翻译按钮完全禁用
- 每个引擎显示具体状态和原因

**翻译请求超时（`Timeout`）：**

单引擎模式：
```
⏳ 火山翻译响应超时 (>10s)
[🔄 重试此引擎]  [🔀 切换到其他引擎]
```

多引擎对比模式：超时的卡片显示 `⏱️ 超时 (>10s) ❌` + 重试按钮。

**配额即将耗尽预警（用量达到 80%）：**
- 译文下方出现黄色提示条：`⚠️ 火山翻译本月额度已用 80%（剩余 40 万字符）`
- 引擎管理页进度条变为黄色；100% 时变红

**离线模式（网络断开 + 有缓存）：**
- 状态栏显示 🔴 离线（缓存可用）
- 翻译按钮变为「查找缓存」
- 缓存命中直接返回，标注「来自缓存」
- 未命中提示「离线状态下无可用翻译」

---

### 15.3 弹性策略（Polly 风格）

不用 Polly NuGet 包（避免额外依赖），自己实现轻量版，核心三种策略：

#### ① 重试策略（Retry）

```csharp
public class RetryPolicy
{
    public int MaxRetries { get; init; } = 2;
    public TimeSpan BaseDelay { get; init; } = TimeSpan.FromMilliseconds(500);
    public bool UseExponentialBackoff { get; init; } = true;
    public bool UseJitter { get; init; } = true;  // 防止惊群效应

    public async Task<T> ExecuteAsync<T>(Func<Task<T>> action, CancellationToken ct = default)
    {
        int attempt = 0;
        while (true)
        {
            try
            {
                return await action();
            }
            catch (Exception) when (attempt < MaxRetries && IsRetryable())
            {
                attempt++;
                var delay = CalculateDelay(attempt);
                await Task.Delay(delay, ct);
            }
        }
    }

    private TimeSpan CalculateDelay(int attempt)
    {
        // 指数退避：500ms → 1000ms → 2000ms → ...
        var delay = UseExponentialBackoff
            ? TimeSpan.FromMilliseconds(BaseDelay.TotalMilliseconds * Math.Pow(2, attempt - 1))
            : BaseDelay;

        // 加随机抖动（±25%），防止多个请求同时重试
        if (UseJitter)
        {
            var jitter = Random.Shared.NextDouble() * 0.5 - 0.25;  // -25% ~ +25%
            delay = TimeSpan.FromMilliseconds(delay.TotalMilliseconds * (1 + jitter));
        }

        return delay;
    }
}
```

#### ② 熔断策略（Circuit Breaker）

```csharp
public class CircuitBreaker
{
    public int FailureThreshold { get; init; } = 5;
    public TimeSpan BreakDuration { get; init; } = TimeSpan.FromSeconds(60);
    public int HalfOpenMaxAttempts { get; init; } = 1;

    private CircuitState _state = CircuitState.Closed;
    private int _consecutiveFailures = 0;
    private DateTime _lastFailureTime;
    private int _halfOpenAttempts = 0;

    public enum CircuitState { Closed, Open, HalfOpen }

    public bool AllowRequest()
    {
        return _state switch
        {
            CircuitState.Closed   => true,
            CircuitState.Open     => DateTime.UtcNow - _lastFailureTime >= BreakDuration
                                      ? TryTransitionToHalfOpen()
                                      : false,
            CircuitState.HalfOpen => _halfOpenAttempts < HalfOpenMaxAttempts,
            _ => false
        };
    }

    public void RecordSuccess()
    {
        _consecutiveFailures = 0;
        _halfOpenAttempts = 0;
        _state = CircuitState.Closed;
    }

    public void RecordFailure()
    {
        _consecutiveFailures++;
        _lastFailureTime = DateTime.UtcNow;

        if (_state == CircuitState.HalfOpen)
        {
            _state = CircuitState.Open;
            _halfOpenAttempts = 0;
        }
        else if (_consecutiveFailures >= FailureThreshold)
        {
            _state = CircuitState.Open;
        }
    }

    public CircuitState GetState() => _state;
}
```

**熔断状态机：**

```
  ┌──────────────────────────────────────────────────┐
  │                                                  │
  ▼                                                  │
[Closed] ──连续失败≥阈值──→ [Open] ──冷却到期──→ [HalfOpen]
  ▲                                │                    │
  │                                │                    │
  │   ┌────────────────────────────┘                    │
  │   │                          成功 → 回到 Closed     │
  │   │                          失败 → 回到 Open（延长）│
  │   │                                                │
  └───┘ 成功 ──────────────────────────────────────────┘
```

#### ③ 超时策略（Timeout）

```csharp
public class TimeoutPolicy
{
    public TimeSpan RequestTimeout { get; init; } = TimeSpan.FromSeconds(10);
    public TimeSpan OverallTimeout { get; init; } = TimeSpan.FromSeconds(30);

    public async Task<T> ExecuteAsync<T>(Func<CancellationToken, Task<T>> action)
    {
        using var cts = new CancellationTokenSource(OverallTimeout);
        using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(cts.Token);

        var requestTimeout = Task.Delay(RequestTimeout, linkedCts.Token);
        var task = action(linkedCts.Token);

        var completed = await Task.WhenAny(task, requestTimeout);
        if (completed == requestTimeout)
            throw new TimeoutException($"Request exceeded {RequestTimeout.TotalSeconds}s");

        return await task;
    }
}
```

#### ④ 组合策略（Pipeline）

```csharp
public class ResiliencePipeline
{
    private readonly RetryPolicy _retry;
    private readonly CircuitBreaker _circuitBreaker;
    private readonly TimeoutPolicy _timeout;

    public ResiliencePipeline(
        RetryPolicy retry,
        CircuitBreaker circuitBreaker,
        TimeoutPolicy timeout)
    {
        _retry = retry;
        _circuitBreaker = circuitBreaker;
        _timeout = timeout;
    }

    public async Task<TranslationResult> ExecuteAsync(
        Func<CancellationToken, Task<TranslationResult>> action)
    {
        if (!_circuitBreaker.AllowRequest())
            throw new CircuitBreakerOpenException();

        try
        {
            var result = await _retry.ExecuteAsync(async () =>
            {
                return await _timeout.ExecuteAsync(action);
            });

            _circuitBreaker.RecordSuccess();
            return result;
        }
        catch (Exception ex) when (IsProviderFailure(ex))
        {
            _circuitBreaker.RecordFailure();
            throw;
        }
    }
}
```

每个 Provider 实例持有自己的 Pipeline：

```csharp
public class HuoshanProvider : ITranslationProvider
{
    private readonly ResiliencePipeline _pipeline = new(
        retry: new RetryPolicy { MaxRetries = 2, UseExponentialBackoff = true },
        circuitBreaker: new CircuitBreaker { FailureThreshold = 5, BreakDuration = TimeSpan.FromSeconds(60) },
        timeout: new TimeoutPolicy { RequestTimeout = TimeSpan.FromSeconds(10) }
    );

    public async Task<TranslationResult> TranslateAsync(TranslationRequest request)
    {
        return await _pipeline.ExecuteAsync(async ct =>
        {
            var response = await _httpClient.PostAsync(..., ct);
            return ParseResponse(response);
        });
    }
}
```

---

### 15.4 引擎路由器（Router）

#### 路由策略

```csharp
public class TranslationRouter
{
    /// <summary>
    /// 按优先级选择可用引擎
    /// </summary>
    public ITranslationProvider SelectProvider(
        IEnumerable<ITranslationProvider> providers,
        TranslationRequest request)
    {
        return providers
            .Where(p => p.IsEnabled)
            .Where(p => p.HealthStatus != HealthStatus.QuotaExhausted)
            .Where(p => p.HealthStatus != HealthStatus.ConfigError)
            .Where(p => p.SupportedLanguages.Contains(request.SourceLang))
            .Where(p => p.SupportedLanguages.Contains(request.TargetLang))
            .OrderBy(p => p.Priority)
            .ThenBy(p => p.AverageResponseTime)
            .FirstOrDefault()
            ?? throw new NoProviderAvailableException();
    }

    /// <summary>
    /// 对比模式：选择所有可用引擎
    /// </summary>
    public IReadOnlyList<ITranslationProvider> SelectAllProviders(
        IEnumerable<ITranslationProvider> providers,
        TranslationRequest request)
    {
        return providers
            .Where(p => p.IsEnabled)
            .Where(p => p.HealthStatus == HealthStatus.Healthy
                     || p.HealthStatus == HealthStatus.Degraded)
            .Where(p => p.SupportedLanguages.Contains(request.SourceLang))
            .Where(p => p.SupportedLanguages.Contains(request.TargetLang))
            .OrderBy(p => p.Priority)
            .ToList();
    }
}

public enum HealthStatus
{
    Healthy,            // 正常
    Degraded,           // 降级（有过失败但还能用）
    QuotaExhausted,     // 额度耗尽
    CircuitOpen,        // 熔断中
    Timeout,            // 连续超时
    ConfigError,        // API Key 无效
    Disabled            // 用户手动禁用
}
```

#### 智能路由（进阶）

```csharp
public class SmartRouter : TranslationRouter
{
    public ITranslationProvider SelectBestForScenario(
        IEnumerable<ITranslationProvider> providers,
        TranslationRequest request)
    {
        // 长文本（>2000字符）→ 优先 AI 模式引擎
        if (request.Text.Length > 2000 && HasAvailableAiProvider(providers))
            return SelectAiProvider(providers, request);

        // 中日翻译 → 彩云小译质量最好（如果已启用且有额度）
        if (request.SourceLang == "ja" || request.TargetLang == "ja")
        {
            var caiyun = providers.FirstOrDefault(p => p.Name == "彩云小译"
                && p.HealthStatus == HealthStatus.Healthy);
            if (caiyun != null) return caiyun;
        }

        return SelectProvider(providers, request);
    }
}
```

---

### 15.5 缓存层

```csharp
public class TranslationCache
{
    private readonly ConcurrentDictionary<string, CacheEntry> _memoryCache = new();
    private readonly int _maxEntries = 10000;
    private readonly TimeSpan _defaultTtl = TimeSpan.FromHours(24);

    private string BuildKey(string provider, string srcLang, string tgtLang, string text)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(text));
        var hashStr = Convert.ToHexString(hash.AsSpan(0, 8));
        return $"{provider}:{srcLang}:{tgtLang}:{hashStr}";
    }

    public TranslationResult Get(string provider, string srcLang, string tgtLang, string text)
    {
        var key = BuildKey(provider, srcLang, tgtLang, text);
        if (_memoryCache.TryGetValue(key, out var entry) && !entry.IsExpired)
        {
            entry.HitCount++;
            return entry.Result;
        }
        return null;
    }

    public void Set(string provider, string srcLang, string tgtLang, string text, TranslationResult result)
    {
        var key = BuildKey(provider, srcLang, tgtLang, text);
        _memoryCache[key] = new CacheEntry(result, _defaultTtl);

        if (_memoryCache.Count > _maxEntries)
        {
            var oldest = _memoryCache.OrderBy(x => x.Value.LastAccessTime).Take(500);
            foreach (var item in oldest)
                _memoryCache.TryRemove(item.Key, out _);
        }
    }

    public void InvalidateForProvider(string provider)
    {
        var keysToRemove = _memoryCache.Keys.Where(k => k.StartsWith($"{provider}:")).ToList();
        foreach (var key in keysToRemove)
            _memoryCache.TryRemove(key, out _);
    }
}
```

#### 缓存行为

| 场景 | 处理 |
|---|---|
| 相同文本 + 相同引擎 + 相同语言对 | 命中缓存，直接返回（0ms） |
| 相同文本 + 不同引擎 | 不命中（因为不同引擎译文可能不同） |
| 缓存条目超过 24 小时 | 自动过期，下次重新翻译 |
| 用户手动清缓存 | 清空整个内存缓存 |
| 缓存超过 10000 条 | LRU 驱逐最旧的 500 条 |

---

### 15.6 客户端限流器（Rate Limiter）

```csharp
public class ClientRateLimiter
{
    private readonly ConcurrentQueue<DateTime> _requestTimes = new();
    private readonly int _maxRequestsPerMinute;
    private readonly int _maxRequestsPerDay;

    public ClientRateLimiter(int maxPerMinute = 20, int maxPerDay = 2000)
    {
        _maxRequestsPerMinute = maxPerMinute;
        _maxRequestsPerDay = maxPerDay;
    }

    public bool AllowRequest()
    {
        var now = DateTime.UtcNow;

        while (_requestTimes.TryPeek(out var oldest) && (now - oldest).TotalMinutes > 1)
            _requestTimes.TryDequeue(out _);

        if (_requestTimes.Count >= _maxRequestsPerMinute)
            return false;

        var todayCount = _requestTimes.Count(t => t.Date == now.Date);
        if (todayCount >= _maxRequestsPerDay)
            return false;

        _requestTimes.Enqueue(now);
        return true;
    }
}
```

#### 限流提示

```
用户触发翻译
  → 检查限流器
    → 允许 → 继续
    → 拒绝 → 提示「操作太频繁，请稍后再试」+ 显示冷却倒计时
```

---

### 15.7 请求防抖与合并

#### 输入防抖

```csharp
private CancellationTokenSource _debounceCts;

private async void OnTextChanged(string text)
{
    _debounceCts?.Cancel();
    _debounceCts = new CancellationTokenSource();

    try
    {
        await Task.Delay(500, _debounceCts.Token);
        await TranslateAsync(text);
    }
    catch (TaskCanceledException) { }
}
```

#### 请求合并

```csharp
private readonly ConcurrentDictionary<string, Task<TranslationResult>> _pendingRequests = new();

public Task<TranslationResult> TranslateWithDeduplicationAsync(TranslationRequest request)
{
    var key = $"{request.Provider}:{request.SourceLang}:{request.TargetLang}:{request.Text.GetHashCode()}";

    return _pendingRequests.GetOrAdd(key, async _ =>
    {
        try
        {
            return await _provider.TranslateAsync(request);
        }
        finally
        {
            _pendingRequests.TryRemove(key, out _);
        }
    });
}
```

---

### 15.8 日志与诊断

#### 日志配置

```csharp
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.File(
        path: Path.Combine(AppDataDir, "logs", "app-.log"),
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 30,
        fileSizeLimitBytes: 10 * 1024 * 1024)
    .CreateLogger();
```

#### 日志内容

| 级别 | 记录内容 |
|---|---|
| **Information** | 翻译请求（引擎、语言对、文本长度、耗时、是否命中缓存） |
| **Warning** | 引擎降级、自动切换、额度预警（80%）、重试成功 |
| **Error** | 引擎故障、熔断触发、所有引擎不可用、认证失败 |
| **Debug** | 请求/响应原文（仅开发模式，默认关闭） |

#### 日志示例

```
[2026-04-18 19:05:12 INF] Translation completed: provider=火山翻译, en→zh, length=142, latency=287ms, cached=false
[2026-04-18 19:05:15 WRN] Provider degraded: 腾讯翻译君, consecutive failures=2, circuit=Closed
[2026-04-18 19:05:20 ERR] All providers exhausted for ja→zh
[2026-04-18 19:05:22 INF] Auto-fallback: 火山翻译 → 百度翻译 (reason: RateLimited)
```

#### 诊断面板（设置页）

```
诊断信息
├── 引擎状态
│   ├── 火山翻译    ✅ 正常      延迟: 287ms  本月已用: 1,234,567 / 2,000,000
│   ├── 腾讯翻译君  ⚠️ 降级      延迟: 1,203ms  本月已用: 4,567,890 / 5,000,000
│   ├── 百度翻译    ✅ 正常      延迟: 312ms  本月已用: 890,123 / 1,000,000
│   ├── 彩云小译    🔴 熔断中    剩余: 23s     本月已用: 1,000,000 / 1,000,000
│   └── 小牛翻译    ✅ 正常      延迟: 456ms  今日已用: 123,456 / 500,000
│
├── 缓存统计
│   ├── 缓存条目数: 3,456 / 10,000
│   ├── 命中率: 34.2%
│   └── 节省调用: 1,789 次
│
├── 今日统计
│   ├── 翻译次数: 234
│   ├── 翻译字符: 56,789
│   ├── 引擎使用分布: 火山 45% / 腾讯 30% / 百度 15% / 其他 10%
│   └── 平均延迟: 423ms
│
├── 熔断器状态
│   ├── 火山翻译    Closed   连续失败: 0
│   ├── 腾讯翻译君  Closed   连续失败: 2
│   └── 彩云小译    Open     剩余: 23s   连续失败: 5
│
├── [导出诊断报告]  → 导出为 JSON，方便反馈 Bug
└── [清除所有缓存]
```

---

### 15.9 翻译前后处理管道

#### 前处理（Pre-process）

```csharp
public class TranslationPreProcessor
{
    public string Process(string text, AppSettings settings)
    {
        // 1. 文本清理
        text = text.Trim();
        text = NormalizeLineEndings(text);
        text = RemoveZeroWidthCharacters(text);
        text = NormalizeUnicode(text);

        // 2. 智能分段（超长文本）
        if (text.Length > settings.MaxSegmentLength)
            return SplitIntoSegments(text, settings.MaxSegmentLength);

        // 3. 术语预注入（AI 模式）
        if (settings.Mode == TranslationMode.AI && settings.Glossary.Any())
            text = InjectGlossaryContext(text, settings.Glossary);

        return text;
    }
}
```

#### 后处理（Post-process）

```csharp
public class TranslationPostProcessor
{
    public string Process(string translatedText, TranslationRequest request, AppSettings settings)
    {
        // 1. 术语表强制替换
        if (settings.Glossary.Any())
            translatedText = ApplyGlossary(translatedText, settings.Glossary);

        // 2. 格式修复
        translatedText = FixSpacing(translatedText);
        translatedText = FixPunctuation(translatedText);
        translatedText = PreserveOriginalFormatting(translatedText, request.Text);

        // 3. 质量检查
        if (IsSuspicious(translatedText, request.Text))
            Log.Warning("Suspicious translation: length ratio={Ratio}",
                translatedText.Length / (double)request.Text.Length);

        return translatedText;
    }

    private bool IsSuspicious(string translated, string original)
    {
        var ratio = translated.Length / (double)original.Length;
        return ratio < 0.2 || ratio > 5.0;
    }
}
```

---

### 15.10 配置管理

#### 配置文件结构

```
%AppData%/TranslatorApp/
├── settings.json
├── translatorapp.db
├── credentials.json          # DPAPI 加密
├── cache/
│   └── translation/
├── logs/
│   ├── app-20260418.log
│   └── app-20260417.log
└── backups/
    └── settings-20260418.json
```

#### 配置热更新

```csharp
public class SettingsWatcher : IDisposable
{
    private readonly FileSystemWatcher _watcher;

    public SettingsWatcher(string settingsPath)
    {
        _watcher = new FileSystemWatcher(Path.GetDirectoryName(settingsPath));
        _watcher.Filter = Path.GetFileName(settingsPath);
        _watcher.NotifyFilter = NotifyFilters.LastWrite;
        _watcher.Changed += OnSettingsChanged;
        _watcher.EnableRaisingEvents = true;
    }

    private void OnSettingsChanged(object sender, FileSystemEventArgs e)
    {
        _reloadDebounce?.Cancel();
        _reloadDebounce = new CancellationTokenSource();
        Task.Delay(500, _reloadDebounce.Token).ContinueWith(_ =>
        {
            SettingsManager.Reload();
            OnSettingsReloaded?.Invoke();
        });
    }
}
```

#### 配置版本迁移

```csharp
public class SettingsMigration
{
    public AppSettings Migrate(AppSettings old)
    {
        return old.Version switch
        {
            1 => MigrateV1ToV2(MigrateV0ToV1(old)),
            2 => old,
            _ => throw new NotSupportedException($"Unknown settings version: {old.Version}")
        };
    }
}
```

---

### 15.11 健康检查与启动自检

```csharp
public class StartupHealthCheck
{
    public async Task<Dictionary<string, HealthResult>> RunAsync(
        IEnumerable<ITranslationProvider> providers)
    {
        var results = new Dictionary<string, HealthResult>();

        var tasks = providers.Where(p => p.IsEnabled).Select(async p =>
        {
            try
            {
                var sw = Stopwatch.StartNew();
                await p.TranslateAsync(new TranslationRequest
                {
                    Text = "hello",
                    SourceLang = "en",
                    TargetLang = "zh"
                });
                sw.Stop();
                results[p.Name] = HealthResult.Healthy(sw.ElapsedMilliseconds);
            }
            catch (AuthenticationException)
            {
                results[p.Name] = HealthResult.ConfigError("API Key 无效");
            }
            catch (Exception ex)
            {
                results[p.Name] = HealthResult.Unhealthy(ex.Message);
            }
        });

        await Task.WhenAll(tasks);
        return results;
    }
}
```

启动时展示：

```
┌─────────────────────────────────────────────┐
│  正在检查翻译引擎...                          │
│  ✅ 火山翻译      287ms                     │
│  ✅ 腾讯翻译君    412ms                     │
│  ✅ 百度翻译      301ms                     │
│  ⚠️ 彩云小译     超时（不影响使用）          │
│  ✅ 小牛翻译      523ms                     │
│                                              │
│  4/5 引擎可用  [跳过] [查看设置]              │
└─────────────────────────────────────────────┘
```

---

### 15.12 异常恢复与崩溃保护

```csharp
public override void OnFrameworkInitializationCompleted()
{
    AppDomain.CurrentDomain.UnhandledException += (s, e) =>
    {
        Log.Fatal(e.ExceptionObject as Exception, "Unhandled exception");
        SaveCrashDump(e.ExceptionObject as Exception);
    };

    TaskScheduler.UnobservedTaskException += (s, e) =>
    {
        Log.Error(e.Exception, "Unobserved task exception");
        e.SetObserved();
    };
}
```

应用意外退出后重启，恢复到退出前的状态：

```csharp
public void SaveState()
{
    var state = new AppState
    {
        LastSourceText = MainViewModel.SourceText,
        LastTranslation = MainViewModel.TranslatedText,
        SourceLang = MainViewModel.SelectedSourceLang,
        TargetLang = MainViewModel.SelectedTargetLang,
        WindowPosition = MainWindow.Position,
        WindowSize = MainWindow.ClientSize,
        Timestamp = DateTime.UtcNow
    };
    File.WriteAllText(StateFilePath, JsonSerializer.Serialize(state));
}
```

---

### 15.13 性能监控

```csharp
public class TranslationMetrics
{
    public ConcurrentDictionary<string, ProviderMetrics> ProviderStats { get; } = new();

    public void RecordCall(string provider, bool success, TimeSpan latency, int textLength)
    {
        var stats = ProviderStats.GetOrAdd(provider, _ => new ProviderMetrics());
        stats.TotalCalls++;
        if (success) stats.SuccessfulCalls++;
        stats.TotalLatency += latency;
        stats.TotalCharacters += textLength;
        stats.LastCallTime = DateTime.UtcNow;
    }
}

public class ProviderMetrics
{
    public long TotalCalls;
    public long SuccessfulCalls;
    public TimeSpan TotalLatency;
    public long TotalCharacters;
    public DateTime LastCallTime;

    public double SuccessRate => TotalCalls > 0 ? SuccessfulCalls * 100.0 / TotalCalls : 0;
    public double AvgLatencyMs => TotalCalls > 0 ? TotalLatency.TotalMilliseconds / TotalCalls : 0;
}
```

#### 性能基准目标

以下为 v1.0 的性能目标，用于开发自测和发布前验收：

| 指标 | 目标 | 测量方式 | 说明 |
|---|---|---|---|
| **冷启动时间** | ≤ 3s（SSD）/ ≤ 5s（HDD） | 从双击到主窗口可交互 | 含启动自检（引擎健康检查） |
| **热启动（托盘恢复）** | ≤ 500ms | 从托盘点击到窗口显示 | 不重新初始化 |
| **普通翻译响应** | ≤ 3s（P95） | 从点击翻译到结果显示 | 单引擎，不含网络波动 |
| **多引擎对比全部完成** | ≤ 8s（P95） | 从发起到最慢引擎返回 | 5 引擎并行，取最慢的 |
| **多引擎首结果可见** | ≤ 1.5s | 从发起到第一张卡片渲染 | 最快引擎返回即显示 |
| **剪贴板翻译弹窗** | ≤ 200ms | 剪贴板变化到浮窗出现 | 不含翻译耗时 |
| **内存占用（空闲）** | ≤ 80MB | 主窗口打开、无翻译任务 | .NET 8 托管内存 |
| **内存占用（峰值）** | ≤ 200MB | 多引擎对比 + TTS 播放中 | 含音频缓冲 |
| **CPU 占用（空闲）** | ≤ 1% | 剪贴板监听开启但无操作 | 后台轮询间隔 500ms |
| **SQLite 写入** | ≤ 50ms/条 | 单条翻译历史写入 | SSD，WAL 模式 |
| **历史搜索（1000 条）** | ≤ 100ms | 关键词模糊搜索 | SQLite LIKE 查询 |
| **主题切换** | ≤ 300ms | 点击到所有控件渲染完成 | 含阴影重算 |
| **安装包大小** | ≤ 50MB | Velopack 打包后 | 不含 .NET 运行时 |

#### 性能测试方法

| 方法 | 工具 | 用途 |
|---|---|---|
| **启动时间** | `Stopwatch` + 自动化启动脚本 | 冷启动/热启动测量 |
| **翻译延迟** | `TranslationMetrics` 内建统计 | P50/P95/P99 分位数 |
| **内存** | `dotnet-counters` / `dotMemory` | 实时内存监控 |
| **CPU** | `dotnet-counters` / PerfView | 空闲和峰值 CPU |
| **SQLite** | BenchmarkDotNet | 读写性能基准 |
| **UI 响应** | Avalonia `RenderTimer` + 手动感知 | 卡顿检测 |

#### 性能监控仪表盘（设置 → 诊断）

在 §15.8 诊断面板基础上，增加实时性能条：

```
性能监控（实时）
├── 启动耗时: 2.1s ✅          目标: ≤ 3s
├── 内存占用: 67MB ✅          目标: ≤ 80MB（空闲）
├── CPU 占用: 0.3% ✅          目标: ≤ 1%
├── 今日翻译: 156 次
│   ├── 平均延迟: 423ms
│   ├── P95 延迟: 1.8s ✅      目标: ≤ 3s
│   └── 缓存命中率: 34.2%
└── 引擎响应分布
    ├── 火山翻译:  P50=287ms  P95=890ms
    ├── 腾讯翻译:  P50=412ms  P95=1.2s
    └── DeepSeek:  P50=1.1s   P95=2.8s
```

- 所有指标每 5 秒刷新
- 超过目标值的指标标黄（接近目标）或红（超标）
- 仅在诊断页展示，不干扰正常使用

---

### 15.14 安全加固

| 安全措施 | 实现 |
|---|---|
| **API Key 存储** | DPAPI 加密（`ProtectedData.Protect`），仅当前用户可解密 |
| **不记录敏感信息** | 日志中 API Key 脱敏：`sk-****abcd` |
| **不上传任何数据** | 所有翻译、历史、设置仅存本地 |
| **配置文件权限** | `credentials.json` 设置 NTFS ACL 仅当前用户可读 |
| **防内存转储** | API Key 使用后尽快从 `SecureString` 中清零 |
| **HTTPS 强制** | 所有 API 调用仅允许 HTTPS，拒绝 HTTP |
| **证书校验** | 不跳过 SSL 证书验证 |

```csharp
public static string MaskKey(string key)
{
    if (string.IsNullOrEmpty(key) || key.Length <= 8)
        return "****";
    return $"{key[..4]}****{key[^4..]}";
}
```

---

### 15.15 打包与自动更新

| 项目 | 方案 |
|---|---|
| **打包工具** | Velopack（跨平台安装 + 增量更新） |
| **安装包格式** | `.exe` 自解压安装程序 |
| **更新策略** | 启动时静默检查，有新版本弹窗提示 |
| **增量更新** | 只下载变更文件，不重新下载整个包 |
| **回滚** | 保留上一个版本，更新失败自动回滚 |
| **更新通道** | 稳定版（默认）/ 测试版（设置中开启） |

#### 构建流程

```
GitHub Release Pipeline (CI/CD)
  │
  ├─ 1. 触发条件
  │     ├─ 手动触发（正式版）
  │     └─ push tag `v*`（自动版）
  │
  ├─ 2. 构建步骤
  │     ├─ dotnet restore
  │     ├─ dotnet build -c Release
  │     ├─ dotnet test
  │     ├─ Velopack pack（生成安装包 + delta 包）
  │     └─ 代码签名（见下）
  │
  ├─ 3. 产物
  │     ├─ DotTranslator-Setup-1.0.0.exe      （完整安装包，~30MB）
  │     ├─ DotTranslator-1.0.0-delta.nupkg    （增量更新包，通常 <5MB）
  │     └─ DotTranslator-Portable-1.0.0.zip   （绿色免安装版）
  │
  └─ 4. 发布
        ├─ GitHub Releases（主渠道）
        └─ 更新 JSON manifest（供自动更新检查）
```

#### 安装包体验

```
双击 DotTranslator-Setup-1.0.0.exe
  │
  ├─ 1. UAC 提示（请求管理员权限用于安装到 Program Files）
  │
  ├─ 2. 安装向导（Velopack 内建）
  │     ├─ 安装路径选择（默认: %LocalAppData%\DotTranslator）
  │     ├─ 创建桌面快捷方式 ☑️（默认勾选）
  │     ├─ 创建开始菜单快捷方式 ☑️
  │     └─ 开机自启 ☐（默认不勾选）
  │
  ├─ 3. 安装进度（Velopack 自动处理）
  │
  └─ 4. 安装完成
        ├─ 自动启动 DotTranslator
        └─ 首次运行进入引导流程
```

卸载时提示：「是否保留翻译历史和设置？」→ 保留则不删除 `%AppData%\DotTranslator\` 目录。

#### 代码签名

| 项目 | 方案 |
|---|---|
| **证书类型** | EV 代码签名证书（推荐）或标准代码签名证书 |
| **签名工具** | `signtool.exe`（Windows SDK 内建） |
| **签名时机** | Velopack pack 之后、发布之前 |
| **时间戳** | `http://timestamp.digicert.com` |
| **CI 存储** | 证书 `.pfx` 存储在 GitHub Secrets（加密） |

```yaml
# GitHub Actions 签名步骤
- name: Sign executable
  run: |
    $cert = [Convert]::FromBase64String("${{ secrets.SIGNING_CERT }}")
    Set-Content -Path cert.pfx -Value $cert -AsByteStream
    signtool sign /f cert.pfx /p "${{ secrets.CERT_PASSWORD }}" `
      /tr http://timestamp.digicert.com /td sha256 /fd sha256 `
      "releases/DotTranslator-Setup-*.exe"
```

> 未签名时 Windows SmartScreen 会显示「未知发布者」警告。过渡方案：使用自签名证书 + README 说明，积累下载量后 SmartScreen 自动信任。

#### 分发渠道

| 渠道 | 优先级 | 说明 |
|---|---|---|
| **GitHub Releases** | P0 | 主分发渠道，所有版本在此发布 |
| **Winget** | P2 | 提交到 winget-pkgs，`winget install DotTranslator` |
| **Scoop** | P2 | 提交到 Scoop Extras bucket |
| **Chocolatey** | P3 | 提交到 Chocolatey 社区包 |

#### 版本号规范

遵循语义化版本（SemVer）：`MAJOR.MINOR.PATCH`

- MAJOR: 重大架构变更或不兼容更新
- MINOR: 新功能（如新增引擎、新增语言）
- PATCH: Bug 修复、小改进

#### 更新 manifest 格式

```json
{
  "currentVersion": "1.0.0",
  "currentReleaseDate": "2026-04-19",
  "changelog": "https://github.com/wjpyinuo/DotTranslator/releases/tag/v1.0.0",
  "downloadUrl": "https://github.com/wjpyinuo/DotTranslator/releases/download/v1.0.0/DotTranslator-Setup-1.0.0.exe",
  "deltaUrl": "https://github.com/wjpyinuo/DotTranslator/releases/download/v1.0.0/DotTranslator-1.0.0-delta.nupkg",
  "sha256": "abc123...",
  "isCritical": false,
  "minimumVersion": "0.9.0"
}
```

---

## 十六、插件与扩展性设计

### 16.1 扩展点概述

当前版本 **不实现插件系统**，但架构设计为未来扩展预留接口：

| 扩展点 | 当前状态 | 未来计划 |
|---|---|---|
| 自定义翻译引擎 | 预留 `ITranslationProvider` 接口 | v2.0 支持用户加载 DLL 引擎 |
| 自定义 TTS 引擎 | 预留 `ITTsProvider` 接口 | v2.0 支持 |
| 自定义主题 | CSS 变量体系 | v1.x 支持用户导入主题文件 |
| 自定义快捷键 | 已设计 | v1.0 内建 |
| 浏览器扩展 | 不在范围 | v2.0 考虑 |

### 16.2 ITranslationProvider 接口（扩展核心）

```csharp
/// <summary>
/// 翻译引擎接口 — 所有引擎实现此接口
/// 未来可作为插件加载的合约
/// </summary>
public interface ITranslationProvider
{
    /// <summary>引擎显示名称</summary>
    string Name { get; }

    /// <summary>引擎唯一标识符</summary>
    string Id { get; }

    /// <summary>是否已启用</summary>
    bool IsEnabled { get; set; }

    /// <summary>支持的语言列表</summary>
    IReadOnlyList<string> SupportedLanguages { get; }

    /// <summary>执行翻译</summary>
    Task<TranslationResult> TranslateAsync(TranslationRequest request, CancellationToken ct = default);

    /// <summary>测试连接是否正常</summary>
    Task<bool> TestConnectionAsync(CancellationToken ct = default);

    /// <summary>获取本月已用量（字符或 token）</summary>
    Task<UsageInfo> GetUsageAsync(CancellationToken ct = default);
}
```

> v1.0 中所有引擎编译时静态注册。v2.0 考虑从 `plugins/` 目录动态加载实现此接口的 DLL。

### 16.3 用户自定义引擎（v2.0 方向）

```
plugins/
└── MyTranslationEngine/
    ├── manifest.json         # 引擎元信息
    ├── MyEngine.dll          # 实现 ITranslationProvider 的 DLL
    └── icon.png              # 引擎图标
```

**manifest.json 示例：**

```json
{
  "id": "my-custom-engine",
  "name": "我的翻译引擎",
  "version": "1.0.0",
  "author": "用户名",
  "description": "自定义翻译引擎",
  "dll": "MyEngine.dll",
  "entryClass": "MyNamespace.MyTranslationProvider",
  "supportedLanguages": ["zh", "en", "ja"]
}
```

**安全考虑：** 插件 DLL 加载在独立沙箱中；网络请求需用户授权；提供插件签名验证（可选）。

---

## 十七、用户反馈通道

### 17.1 反馈渠道

| 渠道 | 位置 | 用途 |
|---|---|---|
| **GitHub Issues** | 关于页 → 「提交反馈」按钮 | Bug 报告、功能请求 |
| **GitHub Discussions** | 仓库 Discussions 页 | 交流、提问、建议 |
| **应用内反馈** | 设置 → 关于 → 「提交反馈」 | 快速报告问题 |

### 17.2 应用内反馈流程

```
用户点击「提交反馈」
  │
  ├─ 1. 弹出反馈表单（类型/标题/描述/是否附带诊断信息/截图）
  │
  ├─ 2. 自动填充以下信息（脱敏）：
  │     - 应用版本号、操作系统版本、.NET 运行时版本
  │     - 启用的引擎列表（不含 Key）
  │     - 最近 10 条错误日志（脱敏）
  │     - 设置摘要（不含 Key）
  │
  └─ 3. 点击「提交到 GitHub」→
        打开浏览器跳转到 Issue 创建页面（预填充模板）
```

### 17.3 Bug 报告模板

```markdown
## Bug 描述
<!-- 简要描述问题 -->

## 复现步骤
1. 
2. 
3. 

## 期望行为
<!-- 你期望发生什么 -->

## 实际行为
<!-- 实际发生了什么 -->

## 环境信息
- DotTranslator 版本: 
- 操作系统: 
- 启用的引擎: 

## 截图
<!-- 如有截图请附上 -->
```

---

## 十八、隐私政策

### 18.1 数据收集声明

> ✅ **不收集、不上传、不共享任何用户数据。**

| 数据类型 | 是否收集 | 是否上传 | 存储位置 |
|---|---|---|---|
| 翻译原文 | ❌ | ❌ | 仅发送到用户选择的翻译服务商 |
| 翻译结果 | ❌ | ❌ | 本地 SQLite 数据库 |
| API Key | ❌ | ❌ | 本地 DPAPI 加密存储 |
| 翻译历史 | ❌ | ❌ | 本地 SQLite 数据库 |
| 使用统计 | ❌ | ❌ | 本地（月用量计数） |
| 崩溃报告 | ❌ | ❌ | 本地日志文件 |
| 遥测数据 | ❌ | ❌ | 不适用 |
| 用户账户 | 不需要 | ❌ | 不适用 |

### 18.2 第三方服务说明

DotTranslator 本身不收集数据，但用户使用翻译功能时，文本会发送到用户选择的第三方翻译服务商。各服务商隐私政策：

| 服务商 | 隐私政策链接 |
|---|---|
| 火山翻译 | https://www.volcengine.com/privacy |
| 腾讯翻译君 | https://cloud.tencent.com/document/product/301/11470 |
| 百度翻译 | https://fanyi-api.baidu.com/doc/9 |
| 彩云小译 | https://docs.caiyunapp.com/privacy/ |
| 小牛翻译 | https://niutrans.com/privacy |
| DeepSeek | https://chat.deepseek.com/downloads/DeepSeek%20Privacy%20Policy.html |
| 通义千问 | https://terms.aliyun.com/legal-agreement/terms/suit_bu1_ali_cloud/ |
| Kimi | https://kimi.moonshot.cn/privacy |
| 讯飞 TTS | https://www.xfyun.cn/doc/policy/privacy-policy.html |
| Edge TTS | 微软 Edge TTS（本地调用，不上传） |

### 18.3 用户权利

- **数据可携权：** 随时导出所有翻译历史（JSON/CSV/XLSX）
- **删除权：** 随时清空翻译历史、收藏、缓存
- **知情权：** 本隐私政策列明所有数据处理行为
- **控制权：** 完全控制哪些引擎启用、哪些数据保存

### 18.4 安全措施

| 措施 | 说明 |
|---|---|
| API Key 加密 | Windows DPAPI 加密，仅当前用户可解密 |
| 本地存储 | 所有数据仅存储在用户设备本地 |
| HTTPS 强制 | 所有 API 调用使用 HTTPS |
| 日志脱敏 | 日志中 API Key 仅显示最后 4 位 |
| 无远程代码 | 不加载远程代码或配置 |

---

## 十九、开发排期

| 阶段 | 内容 | 预估 |
|---|---|---|
| **Week 1** | 项目搭建、MVVM 骨架、主窗口 UI | 基础 |
| **Week 2** | 文本翻译（火山 + 百度，两个 Provider）+ 引擎调度 | 核心 |
| **Week 3** | 剪贴板翻译 + 全局热键 + 系统托盘 | 核心体验 |
| **Week 4** | 剩余 3 个普通 Provider + AI 模式（DeepSeek） | 引擎补全 |
| **Week 5** | TTS（讯飞 + Edge）+ 翻译历史（SQLite） | 功能丰富 |
| **Week 6** | 文档翻译 + 多引擎对比优化 | 进阶 |
| **Week 7** | 设置页完善 + 术语表 + 快捷键自定义 + 弹性策略 | 打磨 |
| **Week 8** | 打包安装 + 测试 + 修 Bug + 发布 | 交付 |

---

## 二十、成本总结

| 功能 | 方案 | 用户成本 |
|---|---|---|
| 翻译（普通） | 5 家国内平台 | **免费额度合计 900万+ 字符/月** |
| 翻译（AI） | DeepSeek-V3（推荐）/ R1 | ¥1-8/百万 token |
| TTS（默认） | 讯飞 TTS | 免费 2 万次/日 |
| TTS（备用） | Edge TTS | **免费，无限制** |

**核心功能全部可免费运行。**

