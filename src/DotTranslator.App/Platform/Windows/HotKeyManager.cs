using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;

namespace DotTranslator.App.Platform.Windows;

public class HotKeyManager : IDisposable
{
    [DllImport("user32.dll")]
    private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

    [DllImport("user32.dll")]
    private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

    private const uint MOD_ALT = 0x0001;
    private const uint MOD_CONTROL = 0x0002;
    private const uint MOD_SHIFT = 0x0004;
    private const uint MOD_WIN = 0x0008;

    private readonly Dictionary<int, Action> _callbacks = new();
    private readonly List<int> _registeredIds = new();
    private int _nextId = 9000;
    private Timer? _pollTimer;
    private bool _hookInstalled;

    public int Register(uint modifiers, uint vk, Action callback)
    {
        var id = _nextId++;
        if (RegisterHotKey(IntPtr.Zero, id, modifiers, vk))
        {
            _callbacks[id] = callback;
            _registeredIds.Add(id);
            EnsurePolling();
        }
        return id;
    }

    private void EnsurePolling()
    {
        if (_hookInstalled) return;
        _hookInstalled = true;

        _pollTimer = new Timer(_ => PollHotKeys(), null, 100, 100);
    }

    private void PollHotKeys()
    {
        while (PeekMessage(out var msg, IntPtr.Zero, 0x0312, 0x0312, 1 /* PM_REMOVE */))
        {
            var id = msg.WParam.ToInt32();
            if (_callbacks.TryGetValue(id, out var cb))
                cb();
        }
    }

    [DllImport("user32.dll")]
    private static extern bool PeekMessage(out MSG lpMsg, IntPtr hWnd,
        uint wMsgFilterMin, uint wMsgFilterMax, uint wRemoveMsg);

    [StructLayout(LayoutKind.Sequential)]
    private struct MSG
    {
        public IntPtr Hwnd;
        public uint Message;
        public IntPtr WParam;
        public IntPtr LParam;
        public uint Time;
        public POINT Pt;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT { public int X; public int Y; }

    public void Dispose()
    {
        _pollTimer?.Dispose();
        foreach (var id in _registeredIds)
            UnregisterHotKey(IntPtr.Zero, id);
        _callbacks.Clear();
        _registeredIds.Clear();
    }
}
