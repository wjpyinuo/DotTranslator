using System.Text.RegularExpressions;

namespace DotTranslator.Core.Security;

public static partial class SensitiveContentFilter
{
    [GeneratedRegex(@"\b(\d{13,19})\b")]
    private static partial Regex CardNumberRegex();

    [GeneratedRegex(@"\b1[3-9]\d{9}\b")]
    private static partial Regex PhoneRegex();

    [GeneratedRegex(@"\b\d{17}[\dXx]\b")]
    private static partial Regex IdCardRegex();

    [GeneratedRegex(@"\b(?:62|4\d{2}|5[1-5]|3[47])\d{13,16}\b")]
    private static partial Regex BankCardRegex();

    public static bool IsSensitive(string text)
    {
        if (string.IsNullOrWhiteSpace(text) || text.Trim().Length < 8) return false;

        var cardMatch = CardNumberRegex().Match(text);
        if (cardMatch.Success && PassesLuhn(cardMatch.Groups[1].Value))
            return true;
        if (PhoneRegex().IsMatch(text)) return true;
        if (IdCardRegex().IsMatch(text)) return true;
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
}
