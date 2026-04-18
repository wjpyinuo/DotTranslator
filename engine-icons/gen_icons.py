#!/usr/bin/env python3
"""Generate inline SVG icons for each translation engine as base64 data URIs."""

import base64

icons = {
    "huoshan": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="vg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#4F46E5"/><stop offset="100%" stop-color="#7C3AED"/></linearGradient></defs>
      <rect width="64" height="64" rx="14" fill="url(#vg)"/>
      <path d="M32 14c0 0-12 14-12 26a12 12 0 0024 0c0-12-12-26-12-26z" fill="#fff" opacity="0.9"/>
      <path d="M32 26c0 0-6 8-6 15a6 6 0 0012 0c0-7-6-15-6-15z" fill="#F59E0B"/>
    </svg>""",
    "tencent": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#12B7F5"/>
      <text x="32" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="32" fill="#fff">T</text>
    </svg>""",
    "baidu": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#2932E1"/>
      <text x="32" y="44" text-anchor="middle" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-weight="700" font-size="28" fill="#fff">百</text>
    </svg>""",
    "caiyun": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#10B981"/><stop offset="100%" stop-color="#F59E0B"/></linearGradient></defs>
      <rect width="64" height="64" rx="14" fill="url(#cg)"/>
      <path d="M18 38a10 10 0 0110-10 10 10 0 018-4 12 12 0 010 24H20a8 8 0 01-2-10z" fill="#fff" opacity="0.9"/>
    </svg>""",
    "niutrans": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#0EA5E9"/>
      <text x="32" y="44" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="28" fill="#fff">N</text>
    </svg>""",
    "deepseek": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#1E293B"/>
      <path d="M20 32c0-6 4-12 10-14-2 4-1 8 2 10 1 1 3 1 4 0s1-3 0-4c-1-2-1-4 0-6 4 2 8 6 8 14s-6 14-12 14c-4 0-8-3-10-6s-2-5-2-8z" fill="#38BDF8"/>
      <circle cx="26" cy="30" r="2" fill="#fff"/>
    </svg>""",
    "tongyi": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs><linearGradient id="tg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FF6A00"/><stop offset="100%" stop-color="#FF2D55"/></linearGradient></defs>
      <rect width="64" height="64" rx="14" fill="url(#tg)"/>
      <text x="32" y="44" text-anchor="middle" font-family="PingFang SC,Microsoft YaHei,sans-serif" font-weight="700" font-size="24" fill="#fff">通义</text>
    </svg>""",
    "kimi": """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#000"/>
      <path d="M22 40V22h4l8 12 8-12h4v18h-4V29l-6 9h-4l-6-9v11z" fill="#fff"/>
    </svg>""",
}

for name, svg in icons.items():
    b64 = base64.b64encode(svg.encode()).decode()
    print(f'<!-- {name} -->')
    print(f'data:image/svg+xml;base64,{b64}')
    print()
