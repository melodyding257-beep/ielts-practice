/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ielts: {
          blue: '#003B71',
          lightblue: '#0066CC',
          accent: '#E8F0FE',
          highlight: '#FFF176',
          border: '#D0D5DD',
          text: '#1A1A1A',
          muted: '#6B7280',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
