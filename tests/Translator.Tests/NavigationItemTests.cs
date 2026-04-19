using FluentAssertions;
using TranslatorApp.ViewModels;
using Xunit;

namespace Translator.Tests;

public class NavigationItemTests
{
    [Fact]
    public void Constructor_Sets_Properties()
    {
        var item = new NavigationItem("translate", "🌍", "翻译");
        item.Key.Should().Be("translate");
        item.Icon.Should().Be("🌍");
        item.Label.Should().Be("翻译");
        item.IsSelected.Should().BeFalse();
    }

    [Fact]
    public void IsSelected_Is_Observable()
    {
        var item = new NavigationItem("test", "🔧", "Test");
        bool notified = false;
        item.PropertyChanged += (s, e) =>
        {
            if (e.PropertyName == nameof(NavigationItem.IsSelected))
                notified = true;
        };

        item.IsSelected = true;
        notified.Should().BeTrue();
        item.IsSelected.Should().BeTrue();
    }
}
