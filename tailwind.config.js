/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['Epilogue', 'sans-serif'],
      },
      colors: {
        bg: '#f7f6f3',
        ink: { DEFAULT: '#141414', 2: '#3a3a3a', 3: '#717171', 4: '#a8a8a8' },
        border: { DEFAULT: '#e2e0db', 2: '#c8c5be' },
        accent: { DEFAULT: '#d4570a', dark: '#b04408', bg: '#fdf0e8' },
        slate: { DEFAULT: '#1e2330', 2: '#2d3444' },
        success: { DEFAULT: '#1a6645', bg: '#eaf4ef' },
      },
      boxShadow: {
        card: '0 1px 4px rgba(20,20,20,0.06), 0 4px 16px rgba(20,20,20,0.06)',
        'card-lg': '0 4px 8px rgba(20,20,20,0.06), 0 16px 48px rgba(20,20,20,0.1)',
      },
    },
  },
  plugins: [],
}
