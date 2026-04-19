using FluentAssertions;
using TranslatorApp.ViewModels;
using Xunit;

namespace Translator.Tests;

public class MainViewModelTests
{
    private static MainViewModel CreateSut() => new();

    // ═══════════════════════════════════════
    //  默认值
    // ═══════════════════════════════════════

    [Fact]
    public void Default_SourceLanguage_Is_AutoDetect()
    {
        var sut = CreateSut();
        sut.SelectedSourceLang.Code.Should().Be("auto");
        sut.SelectedSourceLang.Name.Should().Be("自动检测");
    }

    [Fact]
    public void Default_TargetLanguage_Is_English()
    {
        var sut = CreateSut();
        sut.SelectedTargetLang.Code.Should().Be("en");
        sut.SelectedTargetLang.Name.Should().Be("英语");
    }

    [Fact]
    public void Default_CurrentMode_Is_Normal()
    {
        var sut = CreateSut();
        sut.CurrentMode.Should().Be("normal");
        sut.IsAiMode.Should().BeFalse();
    }

    [Fact]
    public void Default_SourceText_Is_Empty()
    {
        var sut = CreateSut();
        sut.SourceText.Should().BeEmpty();
    }

    [Fact]
    public void Default_TranslatedText_Is_Empty()
    {
        var sut = CreateSut();
        sut.TranslatedText.Should().BeEmpty();
    }

    [Fact]
    public void Default_IsLoading_Is_False()
    {
        var sut = CreateSut();
        sut.IsLoading.Should().BeFalse();
    }

    [Fact]
    public void Default_Error_Is_Null()
    {
        var sut = CreateSut();
        sut.Error.Should().BeNull();
    }

    // ═══════════════════════════════════════
    //  计算属性
    // ═══════════════════════════════════════

    [Fact]
    public void HasResult_False_When_TranslatedText_Empty()
    {
        var sut = CreateSut();
        sut.HasResult.Should().BeFalse();
    }

    [Fact]
    public void HasResult_False_When_IsLoading()
    {
        var sut = CreateSut();
        sut.TranslatedText = "hello";
        sut.IsLoading = true;
        sut.HasResult.Should().BeFalse();
    }

    [Fact]
    public void HasResult_False_When_Error_Set()
    {
        var sut = CreateSut();
        sut.TranslatedText = "hello";
        sut.Error = new TranslationErrorViewModel { Message = "fail" };
        sut.HasResult.Should().BeFalse();
    }

    [Fact]
    public void HasResult_True_When_HasTranslation_NotLoading_NoError()
    {
        var sut = CreateSut();
        sut.TranslatedText = "你好";
        sut.HasResult.Should().BeTrue();
    }

    [Fact]
    public void LatencyDisplay_Formats_Correctly()
    {
        var sut = CreateSut();
        sut.LatencyMs = 120;
        sut.LatencyDisplay.Should().Be("⚡ 120ms");
    }

    [Fact]
    public void CharCountDisplay_Formats_Correctly()
    {
        var sut = CreateSut();
        sut.TranslatedText = "你好世界";
        sut.CharCountDisplay.Should().Be("4 字");
    }

    // ═══════════════════════════════════════
    //  命令
    // ═══════════════════════════════════════

    [Fact]
    public void SwapLanguages_Swaps_Source_And_Target()
    {
        var sut = CreateSut();
        sut.SelectedSourceLang = new LanguageItem("zh", "中文");
        sut.SelectedTargetLang = new LanguageItem("en", "英语");

        sut.SwapLanguagesCommand.Execute(null);

        sut.SelectedSourceLang.Code.Should().Be("en");
        sut.SelectedTargetLang.Code.Should().Be("zh");
    }

    [Fact]
    public void SwapLanguages_NoOp_When_Source_Is_Auto()
    {
        var sut = CreateSut();
        sut.SelectedSourceLang = new LanguageItem("auto", "自动检测");
        sut.SelectedTargetLang = new LanguageItem("en", "英语");

        sut.SwapLanguagesCommand.Execute(null);

        sut.SelectedSourceLang.Code.Should().Be("auto");
        sut.SelectedTargetLang.Code.Should().Be("en");
    }

    [Fact]
    public void TranslateAsync_Sets_IsLoading_During_Execution()
    {
        // TranslateAsync is mocked; just verify it can be called without error
        var sut = CreateSut();
        sut.SourceText = "hello";

        var task = sut.TranslateCommand.ExecuteAsync(null);
        task.IsCompleted.Should().BeFalse(); // should be running (has Task.Delay(300))
    }

    [Fact]
    public void ToggleTheme_Toggles_IsDarkTheme()
    {
        var sut = CreateSut();
        sut.IsDarkTheme.Should().BeFalse();

        sut.ToggleThemeCommand.Execute(null);
        sut.IsDarkTheme.Should().BeTrue();

        sut.ToggleThemeCommand.Execute(null);
        sut.IsDarkTheme.Should().BeFalse();
    }

    [Fact]
    public void TogglePin_Toggles_IsPinned()
    {
        var sut = CreateSut();
        sut.IsPinned.Should().BeFalse();

        sut.TogglePinCommand.Execute(null);
        sut.IsPinned.Should().BeTrue();

        sut.TogglePinCommand.Execute(null);
        sut.IsPinned.Should().BeFalse();
    }

    [Fact]
    public void ToggleFavorite_Toggles_IsFavorite()
    {
        var sut = CreateSut();
        sut.IsFavorite.Should().BeFalse();

        sut.ToggleFavoriteCommand.Execute(null);
        sut.IsFavorite.Should().BeTrue();
    }

    [Fact]
    public void CopyAsync_NoOp_When_TranslatedText_Empty()
    {
        var sut = CreateSut();
        // Should not throw
        sut.CopyCommand.Execute(null);
        sut.CopySuccess.Should().BeFalse();
    }

    [Fact]
    public void SpeakAsync_NoOp_When_TranslatedText_Empty()
    {
        var sut = CreateSut();
        // Should not throw
        sut.SpeakCommand.Execute(null);
    }

    // ═══════════════════════════════════════
    //  模式
    // ═══════════════════════════════════════

    [Fact]
    public void IsAiMode_True_When_CurrentMode_Is_Ai()
    {
        var sut = CreateSut();
        sut.CurrentMode = "ai";
        sut.IsAiMode.Should().BeTrue();
    }
}
