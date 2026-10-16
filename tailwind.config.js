export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#EAF0F4',
        parchmentDark: '#F7FAFC',
        ink: '#2F4A5E',
        inkSoft: '#6E8394',
        library: '#586780',
        libraryDeep: '#37536A',
        oxblood: '#8C3A3A',
        oxbloodSoft: '#B97070',
        brass: '#B79C6B',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Quicksand"', 'sans-serif'],
        mono: ['"Quicksand"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 6px 16px rgba(47,74,94,0.12)',
        cardHover: '0 10px 26px rgba(47,74,94,0.18)',
      },
    },
  },
  plugins: [],
}
