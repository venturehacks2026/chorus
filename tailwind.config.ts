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
        sand: {
          50: '#F5EBE0',
          100: '#EDEDE9',
          200: '#E3D5CA',
          300: '#D6CCC2',
          400: '#D5BDAF',
          500: '#C4A98E',
          600: '#A68B6B',
          700: '#7C6854',
          800: '#5C4D3C',
          900: '#3D3228',
        },
        bg: {
          DEFAULT: '#EDEDE9',
          subtle: '#F5EBE0',
          muted: '#E3D5CA',
        },
        border: {
          DEFAULT: '#D6CCC2',
          subtle: '#E3D5CA',
        },
        text: {
          DEFAULT: '#3D3228',
          muted: '#7C6854',
          subtle: '#A68B6B',
        },
        accent: {
          DEFAULT: '#D5BDAF',
          hover: '#C4A98E',
          muted: 'rgba(213,189,175,0.20)',
        },
      },
    },
  },
  plugins: [],
};

export default config;
