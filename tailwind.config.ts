import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#FDFBF7',
        foreground: '#1D1D1F',
        vivat: {
          DEFAULT: '#13543A',
          dark: '#0A422D',
          light: '#EAF2EE',
          accent: '#E3A857',
        },
        danger: '#FF3B30'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'sans-serif'],
        book: ['Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', 'Palatino', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        'xl': '0.75rem',
      },
      boxShadow: {
        'soft': '0 4px 24px -4px rgba(19, 84, 58, 0.06)',
      }
    },
  },
  plugins: [],
};

export default config;
