using System.Text.RegularExpressions;

namespace DotTranslator.Core.Security;

public static partial class SensitiveContentFilter
{
    // 通用银行卡号（13-19位，需通过 Luhn 校验）
    [GeneratedRegex(@"\b(\d{13,19})\b")]
    private static partial Regex CardNumberRegex();

    // 中国大陆手机号：1开头第二位3-9，11位纯数字
    // 排除小数（前后有小数点）、金额（前有¥/$/￥等）、年份（19xx/20xx开头）
    [GeneratedRegex(@"(?<![¥$￥€£\d.])(?<!19\d{2})(?<!20\d{2})1[3-9]\d{9}(?![\d.])(?!万|亿|元|角|分)")]
    private static partial Regex PhoneRegex();

    // 中国身份证号：18位，末位可为X
    [GeneratedRegex(@"\b\d{17}[\dXx]\b")]
    private static partial Regex IdCardRegex();

    // 银行卡前缀匹配：62开头(银联)、4开头(Visa)、51-55(Master)、34/37(Amex)
    [GeneratedRegex(@"\b(?:62|4\d{2}|5[1-5]|3[47])\d{13,16}\b")]
    private static partial Regex BankCardRegex();

    public static bool IsSensitive(string text)
    {
        if (string.IsNullOrWhiteSpace(text) || text.Trim().Length < 8) return false;

        // 银行卡号（Luhn 校验过滤大部分误报）
        var cardMatch = CardNumberRegex().Match(text);
        if (cardMatch.Success && PassesLuhn(cardMatch.Groups[1].Value))
            return true;

        // 手机号（正则已排除常见误报场景）
        if (PhoneRegex().IsMatch(text)) return true;

        // 身份证号（需通过校验位验证）
        var idMatch = IdCardRegex().Match(text);
        if (idMatch.Success && IsValidChineseId(idMatch.Value))
            return true;

        // 银行卡前缀匹配
        if (BankCardRegex().IsMatch(text)) return true;

        return false;
    }

    private static bool PassesLuhn(string digits)
    {
        int sum = 0;
        bool alt = false;
        for (int i = digits.Length - 1; i >= 0; i--)
        {
            int n = digits[i] - '0';
            if (alt)
            {
                n *= 2;
                if (n > 9) n -= 9;
            }
            sum += n;
            alt = !alt;
        }
        return sum % 10 == 0;
    }

    /// <summary>
    /// 验证中国居民身份证号校验位（GB 11643-1999）
    /// </summary>
    private static bool IsValidChineseId(string id)
    {
        if (id.Length != 18) return false;

        // 前17位必须全是数字
        for (int i = 0; i < 17; i++)
        {
            if (!char.IsDigit(id[i])) return false;
        }

        // 加权因子
        int[] weights = { 7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2 };
        // 校验码对应值
        char[] checkCodes = { '1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2' };

        int sum = 0;
        for (int i = 0; i < 17; i++)
        {
            sum += (id[i] - '0') * weights[i];
        }

        return char.ToUpperInvariant(id[17]) == checkCodes[sum % 11];
    }
}
