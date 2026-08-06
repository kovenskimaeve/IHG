export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#F6EFE2',
        parchmentDark: '#EFE4CF',
        ink: '#4A3A2C',
        inkSoft: '#7C6A57',
        library: '#8A5A34',
        libraryDeep: '#6B4423',
        oxblood: '#C98A72',
        oxbloodSoft: '#D7A794',
        brass: '#8CA184',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Quicksand"', 'sans-serif'],
        mono: ['"Quicksand"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 6px 16px rgba(74,58,44,0.12)',
        cardHover: '0 10px 26px rgba(74,58,44,0.18)',
      },
    },
  },
  plugins: [],
}
