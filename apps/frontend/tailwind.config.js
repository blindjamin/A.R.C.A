/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        arca: {
          green: '#2f9e44',
          dark: '#1b4332',
          light: '#d8f3dc',
        },
      },
    },
  },
  plugins: [],
};
