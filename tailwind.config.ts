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
        apple: {
          blue: '#0071E3',
          'blue-dark': '#0077ED',
          text: '#1D1D1F',
          'text-secondary': '#6E6E73',
          'text-tertiary': '#AEAEB2',
          border: '#D2D2D7',
          surface: '#F5F5F7',
          green: '#1DB954',
          red: '#FF3B30',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Inter',
          'Segoe UI',
          'sans-serif',
        ],
      },
      fontSize: {
        'display': ['34px', { lineHeight: '1.12', letterSpacing: '-0.5px', fontWeight: '700' }],
        'title': ['22px', { lineHeight: '1.27', letterSpacing: '-0.26px', fontWeight: '600' }],
        'headline': ['17px', { lineHeight: '1.47', fontWeight: '600' }],
        'body': ['17px', { lineHeight: '1.47', fontWeight: '400' }],
        'callout': ['15px', { lineHeight: '1.53', fontWeight: '400' }],
        'caption': ['13px', { lineHeight: '1.38', fontWeight: '400' }],
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
        'input': '10px',
      },
      maxWidth: {
        'content': '680px',
      },
    },
  },
  plugins: [],
};

export default config;
