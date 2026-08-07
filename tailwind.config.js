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
        bg: '#f4f5f7',
        ink: { DEFAULT: '#17202d', 2: '#344154', 3: '#697586', 4: '#9aa5b5' },
        border: { DEFAULT: '#dfe4eb', 2: '#c5ceda' },
        accent: { DEFAULT: '#e56722', dark: '#c95418', bg: '#fff2e9' },
        slate: { DEFAULT: '#151b27', 2: '#20293a' },
        success: { DEFAULT: '#1a6645', bg: '#eaf4ef' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,32,45,0.04), 0 5px 18px rgba(23,32,45,0.05)',
        'card-lg': '0 8px 20px rgba(23,32,45,0.10), 0 22px 50px rgba(23,32,45,0.08)',
      },
    },
  },
  plugins: [],
}
