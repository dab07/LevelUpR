/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Custom color palette from your design
        primary: {
          50: '#FBF5F0',
          100: '#FBD5BD',
          200: '#C7C2CE',
          300: '#8A83DA',
          400: '#463699',
          500: '#262335',
        },
        // Dark theme colors
        dark: {
          bg: '#1A1A1A',
          card: '#2A2A2A',
          surface: '#333333',
          text: '#FFFFFF',
          textSecondary: '#B0B0B0',
          border: '#404040',
        },
        // Gradient colors
        gradient: {
          1: ['#FBF5F0', '#FBD5BD'],
          2: ['#C7C2CE', '#FBD5BD'],
          3: ['#C7C2CE', '#8A83DA'],
          4: ['#FBD5BD', '#8A83DA', '#463699', '#262335'],
          5: ['#463699', '#262335'],
        }
      },
      backgroundImage: {
        'gradient-1': 'linear-gradient(135deg, #FBF5F0, #FBD5BD)',
        'gradient-2': 'linear-gradient(135deg, #C7C2CE, #FBD5BD)',
        'gradient-3': 'linear-gradient(135deg, #C7C2CE, #8A83DA)',
        'gradient-4': 'linear-gradient(135deg, #FBD5BD, #8A83DA, #463699, #262335)',
        'gradient-5': 'linear-gradient(135deg, #463699, #262335)',
      }
    },
  },
  plugins: [],
}