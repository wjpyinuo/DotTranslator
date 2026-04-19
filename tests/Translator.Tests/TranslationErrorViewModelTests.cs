using FluentAssertions;
using TranslatorApp.ViewModels;
using Xunit;

namespace Translator.Tests;

public class TranslationErrorViewModelTests
{
    [Fact]
    public void FromException_Timeout_Returns_Correct_ErrorType_And_Suggestion()
    {
        var ex = new TimeoutException("请求超时");

        var error = TranslationErrorViewModel.FromException(ex);

        error.ErrorType.Should().Be("Timeout");
        error.Message.Should().Be("请求超时");
        error.Suggestion.Should().Be("请检查网络连接后重试");
    }

    [Fact]
    public void FromException_HttpRequest_Returns_Network_ErrorType()
    {
        var ex = new HttpRequestException("无法连接到服务器");

        var error = TranslationErrorViewModel.FromException(ex);

        error.ErrorType.Should().Be("Network");
        error.Message.Should().Be("无法连接到服务器");
        error.Suggestion.Should().Be("请检查网络连接");
    }

    [Fact]
    public void FromException_Generic_Returns_Unknown_ErrorType()
    {
        var ex = new InvalidOperationException("未知错误");

        var error = TranslationErrorViewModel.FromException(ex);

        error.ErrorType.Should().Be("Unknown");
        error.Message.Should().Be("未知错误");
        error.Suggestion.Should().Be("请稍后重试");
    }

    [Fact]
    public void Default_Properties_Are_Empty()
    {
        var error = new TranslationErrorViewModel();

        error.ErrorType.Should().BeEmpty();
        error.Message.Should().BeEmpty();
        error.Suggestion.Should().BeEmpty();
    }
}

public class LanguageItemTests
{
    [Fact]
    public void Record_Holds_Code_And_Name()
    {
        var item = new LanguageItem("ja", "日语");

        item.Code.Should().Be("ja");
        item.Name.Should().Be("日语");
    }

    [Fact]
    public void Records_With_Same_Values_Are_Equal()
    {
        var a = new LanguageItem("zh", "中文");
        var b = new LanguageItem("zh", "中文");

        a.Should().Be(b);
    }
}
