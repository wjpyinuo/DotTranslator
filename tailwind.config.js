/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'dt-bg': 'var(--bg-primary)',
        'dt-surface': 'var(--bg-secondary)',
        'dt-text': 'var(--text-primary)',
        'dt-text-muted': 'var(--text-secondary)',
        'dt-accent': 'var(--accent)',
        'dt-warm': 'var(--warm)',
      },
      borderRadius: {
        dt: '12px',
      },
    },
  },
  plugins: [],
};
