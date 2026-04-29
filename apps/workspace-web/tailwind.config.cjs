/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Primitive Neo-Brutalist palette
        'nb-black': '#0D0D0D',
        'nb-white': '#FFFFFF',
        'nb-cream': '#F5F0E8',
        'nb-mint': '#A7F3D0',
        'nb-pink': '#F9A8D4',

        // Semantic — mapped to legacy names so existing classes keep working
        bg: {
          primary: '#F5F0E8',
          secondary: '#FFFFFF',
          tertiary: '#F9F7F2',
          hover: '#EDE9E0',
          active: '#E5E1D8',
        },
        text: {
          primary: '#1A1A1A',
          secondary: '#6B6B6B',
          tertiary: '#9CA3AF',
          placeholder: '#9CA3AF',
        },
        border: {
          primary: '#1A1A1A',
          secondary: '#E5E5E5',
        },
        accent: {
          primary: '#7C5CFF',
          'primary-hover': '#6A4AF0',
          secondary: '#C4B5FD',
          subtle: 'rgba(124, 92, 255, 0.12)',
        },
        status: {
          success: '#4ADE80',
          warning: '#FACC15',
          error: '#FB7185',
        },
        avatar: {
          bg: '#F9F7F2',
          text: '#1A1A1A',
        },

        // Tag / badge pastels
        'tag-purple': '#E9D5FF',
        'tag-pink': '#FBCFE8',
        'tag-yellow': '#FEF08A',
        'tag-blue': '#BFDBFE',
        'tag-green': '#BBF7D0',
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        18: '4.5rem',
        88: '22rem',
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
        nb: '16px',
        'nb-md': '12px',
        'nb-sm': '8px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.05)',
        md: '0 4px 6px -1px rgba(0,0,0,0.1)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.1)',
        card: '0px 4px 20px rgba(0,0,0,0.08)',
        modal: '0px 8px 40px rgba(0,0,0,0.12)',
        brutal: '4px 4px 0px #0D0D0D',
        'brutal-sm': '2px 2px 0px #0D0D0D',
        'brutal-lg': '6px 6px 0px #0D0D0D',
        'brutal-xl': '8px 8px 0px #0D0D0D',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 180ms ease-out',
        'scale-in': 'scaleIn 180ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('tailwindcss-animate')],
};
