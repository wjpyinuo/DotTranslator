using FluentAssertions;
using TranslatorApp.Converters;
using Xunit;

namespace Translator.Tests;

public class InverseBoolConverterTests
{
    private readonly InverseBoolConverter _sut = InverseBoolConverter.Instance;

    [Fact]
    public void Convert_True_Returns_False()
    {
        var result = _sut.Convert(true, typeof(bool), null, System.Globalization.CultureInfo.InvariantCulture);
        result.Should().Be(false);
    }

    [Fact]
    public void Convert_False_Returns_True()
    {
        var result = _sut.Convert(false, typeof(bool), null, System.Globalization.CultureInfo.InvariantCulture);
        result.Should().Be(true);
    }

    [Fact]
    public void Convert_NonBool_Returns_Original_Value()
    {
        var result = _sut.Convert("hello", typeof(bool), null, System.Globalization.CultureInfo.InvariantCulture);
        result.Should().Be("hello");
    }

    [Fact]
    public void ConvertBack_True_Returns_False()
    {
        var result = _sut.ConvertBack(true, typeof(bool), null, System.Globalization.CultureInfo.InvariantCulture);
        result.Should().Be(false);
    }

    [Fact]
    public void ConvertBack_False_Returns_True()
    {
        var result = _sut.ConvertBack(false, typeof(bool), null, System.Globalization.CultureInfo.InvariantCulture);
        result.Should().Be(true);
    }

    [Fact]
    public void ConvertBack_NonBool_Returns_Original_Value()
    {
        var result = _sut.ConvertBack(42, typeof(bool), null, System.Globalization.CultureInfo.InvariantCulture);
        result.Should().Be(42);
    }

    [Fact]
    public void Instance_Is_Singleton()
    {
        var a = InverseBoolConverter.Instance;
        var b = InverseBoolConverter.Instance;
        a.Should().BeSameAs(b);
    }
}
