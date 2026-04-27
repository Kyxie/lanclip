import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        stripe: {
          bg: '#f6f9fc',
          border: '#e6ebf1',
          text: '#1a1f36',
          muted: '#697386',
          blue: '#0570de',
          hover: '#0461c5',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
