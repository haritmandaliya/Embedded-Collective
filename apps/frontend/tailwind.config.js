/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: 'var(--bg-void)',
        deep: 'var(--bg-base)',
        'red-core': 'var(--accent-red)',
        'red-glow': 'var(--red-glow)',
        'red-dim': 'var(--red-dim)',
        'cyan-spark': 'var(--accent-cyan)',
        'cyan-dim': 'var(--cyan-dim)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-accent': 'var(--text-accent)',
      },
      fontFamily: {
        heading: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      maxWidth: {
        content: '1280px',
      },
    },
  },
  plugins: [],
}
