/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {
      colors: { 
        brandBlue: 'rgb(36 127 255)',
        // You can add more custom colors here:
        // 'my-custom-green': '#123456',
        // 'another-color': 'rgba(255, 0, 0, 0.5)',
      },
    },
  },
  plugins: [],
}