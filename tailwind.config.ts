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
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        bg: {
          DEFAULT: '#ffffff',
          subtle: '#fafafa',
          muted: '#f4f4f6',
        },
        border: {
          DEFAULT: '#e4e4e7',
          subtle: '#f0f0f1',
        },
        text: {
          DEFAULT: '#111111',
          muted: '#6b7280',
          subtle: '#9ca3af',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
          muted: '#eef2ff',
        },
      },
    },
  },
  plugins: [],
};

export default config;
