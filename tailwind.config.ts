import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'media',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard Variable', 'Pretendard', 'Malgun Gothic', '맑은 고딕', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif KR', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        coral: {
          50:  '#FFF5EE',
          100: '#FFE4D1',
          200: '#FFC8A0',
          300: '#FFA867',
          400: '#FF8437',
          500: '#E8631A',
          600: '#C4501A',
          700: '#9A3D14',
          800: '#6F2B0E',
          900: '#451A08',
        },
        sage: {
          50:  '#F2F8F3',
          100: '#DFEEE2',
          200: '#BCDCC2',
          300: '#97C8A1',
          400: '#74B583',
          500: '#5AA069',
          600: '#478253',
          700: '#36623F',
          800: '#24422A',
          900: '#122216',
        },
        rose: {
          50:  '#FDF7F4',
          100: '#F8E6DE',
          200: '#F0CDBD',
          300: '#E5AC93',
          400: '#D38C6E',
          500: '#BA6D4E',
        },
        bg:      '#FFFCF8',
        surface: '#FFFFFF',
        text: {
          DEFAULT: '#1E1511',
          mute:    '#6B625C',
        },
        border: '#EFE6DC',
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '16px',
        xl:   '24px',
        full: '9999px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(30,21,17,0.06), 0 4px 12px rgba(30,21,17,0.04)',
        soft: '0 2px 6px rgba(30,21,17,0.05)',
      },
      maxWidth: {
        content: '720px',
        wide:    '1160px',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '72ch',
            color: '#1E1511',
            lineHeight: '1.8',
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
