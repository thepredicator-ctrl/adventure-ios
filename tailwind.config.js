/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    './examples/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08080a',
          900: '#0c0c10',
          800: '#131318',
          700: '#1c1c22',
          600: '#26262d'
        },
        accent: {
          DEFAULT: '#A855F7',
          soft: '#c4b5fd',
          deep: '#6d28d9'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      animation: {
        'fade-in': 'fadein 380ms cubic-bezier(0.22, 1, 0.36, 1)',
        shimmer: 'shimmer 2.4s linear infinite'
      },
      keyframes: {
        fadein: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: []
};
