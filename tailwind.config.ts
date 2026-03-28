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
        sans: ['var(--font-geist-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'JetBrains Mono', 'monospace'],
      },
      colors: {
        sand: {
          50: '#F5EBE0',   // cream — inputs, modals, elevated surfaces
          100: '#EDEDE9',   // warm gray — page background
          200: '#E3D5CA',   // light sand — cards, panels (tertiary)
          300: '#D6CCC2',   // warm stone — borders, hover (secondary)
          400: '#D5BDAF',   // rosy taupe — accent, buttons (primary)
          500: '#C4A98E',   // deeper taupe — active/pressed states
          600: '#A68B6B',   // dark taupe — strong text accents
          700: '#7C6854',   // earth — headings, high-contrast text
          800: '#5C4D3C',   // deep earth — primary text
          900: '#3D3228',   // near-black — max contrast text
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
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
