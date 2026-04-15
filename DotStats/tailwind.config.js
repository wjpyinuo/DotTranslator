/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ds-bg': '#0f1117',
        'ds-card': '#1a1d27',
        'ds-border': '#2a2d3a',
        'ds-text': '#e2e8f0',
        'ds-muted': '#64748b',
        'ds-blue': '#3b82f6',
        'ds-green': '#10b981',
        'ds-orange': '#f59e0b',
        'ds-red': '#ef4444',
        'ds-purple': '#8b5cf6',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
