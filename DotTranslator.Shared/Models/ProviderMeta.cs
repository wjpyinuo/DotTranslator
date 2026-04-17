namespace DotTranslator.Shared.Models;

/// <summary>
/// 翻译引擎元信息，用于设置页展示
/// </summary>
public record ProviderMeta(
    string Id,
    string Name,
    string ApplyUrl,
    string FreeQuota,
    string[] RequiredFields,
    string FieldHints
);

public static class ProviderRegistry
{
    public static readonly IReadOnlyList<ProviderMeta> All = new[]
    {
        new ProviderMeta("microsoft", "Microsoft Translator",
            "https://azure.microsoft.com/products/ai-services/ai-translator",
            "每月 200 万字符免费（Azure 免费层）",
            new[] { "ApiKey", "Region" },
            "Azure 订阅密钥 + 区域（如 eastus）"),

        new ProviderMeta("amazon", "Amazon Translate",
            "https://aws.amazon.com/translate/",
            "每月 200 万字符免费（12 个月内）",
            new[] { "AccessKeyId", "SecretAccessKey", "Region" },
            "AWS IAM Access Key + Secret + 区域（如 us-east-1）"),

        new ProviderMeta("deepl", "DeepL",
            "https://www.deepl.com/pro-api",
            "每月 50 万字符免费（DeepL API Free）",
            new[] { "ApiKey" },
            "DeepL API Free Key（以 :fx 结尾）"),

        new ProviderMeta("baidu", "百度翻译",
            "https://fanyi-api.baidu.com",
            "每月 5 万字符免费；基础版通用翻译",
            new[] { "AppId", "SecretKey" },
            "百度翻译开放平台 App ID + 密钥"),

        new ProviderMeta("alibaba", "阿里翻译",
            "https://www.aliyun.com/product/nls/trans",
            "每月 100 万字符免费（机器翻译通用版）",
            new[] { "AccessKeyId", "AccessKeySecret" },
            "阿里云 AccessKey ID + Secret"),

        new ProviderMeta("youdao", "有道翻译",
            "https://ai.youdao.com",
            "注册送 100 元体验金；个人开发者可用",
            new[] { "AppId", "AppSecret" },
            "有道智云 App ID + 应用密钥"),

        new ProviderMeta("tencent", "腾讯翻译",
            "https://cloud.tencent.com/product/tmt",
            "每月 500 万字符免费",
            new[] { "SecretId", "SecretKey", "Region" },
            "腾讯云 SecretId + SecretKey + 地域（如 ap-guangzhou）"),

        new ProviderMeta("niutrans", "小牛翻译",
            "https://niutrans.com",
            "注册送 20 万字符/天；个人免费版可用",
            new[] { "ApiKey" },
            "小牛翻译 API 密钥"),

        new ProviderMeta("caiyun", "彩云小译",
            "https://fanyi.caiyunapp.com",
            "每月 100 万字符免费",
            new[] { "Token" },
            "彩云天气开放平台 Token"),

        new ProviderMeta("volcengine", "火山翻译",
            "https://www.volcengine.com/product/imagetrans",
            "每月 200 万字符免费",
            new[] { "AccessKeyId", "SecretAccessKey", "Region" },
            "火山引擎 AccessKey + Secret + 地域"),

        new ProviderMeta("iflytek", "讯飞翻译 V2",
            "https://www.xfyun.cn/service/translation",
            "每天 2 万字符免费（讯飞开放平台）",
            new[] { "AppId", "ApiKey", "ApiSecret" },
            "讯飞开放平台 App ID + API Key + API Secret"),
    };
}
