import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#ffffff',
          subtle:  '#f9f9fb',
          muted:   '#f3f4f6',
        },
        border: {
          DEFAULT: '#e5e7eb',
          subtle:  '#f0f0f3',
        },
        text: {
          DEFAULT: '#0f0f11',
          muted:   '#6b7280',
          subtle:  '#9ca3af',
        },
        accent: {
          DEFAULT: '#7c3aed',
          hover:   '#6d28d9',
          light:   '#8b5cf6',
          muted:   '#ede9fe',
        },
      },
      boxShadow: {
        'glow-sm': '0 0 0 3px rgba(124,58,237,0.12)',
        'glow':    '0 0 0 3px rgba(124,58,237,0.2)',
      },
    },
  },
  plugins: [],
};

export default config;
