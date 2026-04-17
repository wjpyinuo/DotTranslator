using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;

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
    private int _nextId = 9000;

    public int Register(uint modifiers, uint vk, Action callback)
    {
        var id = _nextId++;
        if (RegisterHotKey(IntPtr.Zero, id, modifiers, vk))
        {
            _callbacks[id] = callback;
            // In Avalonia, we need to hook into the message loop
            // For simplicity, we use a polling approach or subclass
            SetupMessageHook();
        }
        return id;
    }

    private bool _hookInstalled;
    private void SetupMessageHook()
    {
        if (_hookInstalled) return;
        _hookInstalled = true;

        // Use a timer to poll for hotkey messages
        var timer = new System.Threading.Timer(_ =>
        {
            // MSG structure: 4 IntPtr fields
            while (PeekMessage(out var msg, IntPtr.Zero, 0x0312, 0x0312, 1) /* PM_REMOVE */)
            {
                var id = msg.WParam.ToInt32();
                if (_callbacks.TryGetValue(id, out var cb))
                    cb();
            }
        }, null, 100, 100);
    }

    [DllImport("user32.dll")]
    private static extern bool PeekMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax, uint wRemoveMsg);

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
        foreach (var id in _callbacks.Keys)
            UnregisterHotKey(IntPtr.Zero, id);
        _callbacks.Clear();
    }
}
