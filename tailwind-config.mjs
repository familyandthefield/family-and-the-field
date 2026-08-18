/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50:  '#FBF9F6',
          100: '#F7F3ED',
          200: '#EFE8DC',
        },
        soil: {
          400: '#A67C5D',
          500: '#8B5E3C',
          600: '#6F4A2F',
          700: '#5A3B26',
        },
        leaf: {
          400: '#6B8F71',
          500: '#4F6F56',
          600: '#3D5743',
          700: '#2F4334',
        },
        terracotta: {
          400: '#C47A5A',
          500: '#A85F42',
          600: '#8A4C35',
        },
        ink: {
          700: '#2C2A26',
          800: '#1F1E1B',
          900: '#141312',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Source Serif 4', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}