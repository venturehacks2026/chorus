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
          subtle:  '#f9fafb',
          muted:   '#f3f4f6',
        },
        border: {
          DEFAULT: '#e5e7eb',
          subtle:  '#f3f4f6',
        },
        text: {
          DEFAULT: '#111827',
          muted:   '#6b7280',
          subtle:  '#9ca3af',
        },
        accent: {
          DEFAULT: '#7c3aed',
          hover:   '#6d28d9',
          light:   '#8b5cf6',
          muted:   '#f5f3ff',
        },
        input: {
          DEFAULT: '#FAF6F1',
          border: '#C4B5A5',
          focus: '#A68B6B',
          placeholder: '#B8A090',
        },
        panel: {
          DEFAULT: '#F0E6DA',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
