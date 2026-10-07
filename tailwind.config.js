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

        // Past Papers page only — a warm, pastel "bento box" palette,
        // deliberately distinct from the ocean (Home) and library
        // (everything else) themes.
        bentoCream: '#FFF8F2',
        bentoBox: '#FFFDFA',
        bentoWood: '#C98E6B',
        bentoInk: '#5B4638',
        bentoInkSoft: '#9C8373',
        bentoStamp: '#D1654A',
        bentoBlush: '#F7D9D2',
        bentoMint: '#D9E8DC',
        bentoButter: '#F6E4B8',
        bentoSky: '#D7E6EE',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Quicksand"', 'sans-serif'],
        mono: ['"Quicksand"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 6px 16px rgba(47,74,94,0.12)',
        cardHover: '0 10px 26px rgba(47,74,94,0.18)',
        bento: '0 8px 20px rgba(140,90,60,0.14)',
        bentoHover: '0 12px 28px rgba(140,90,60,0.22)',
      },
    },
  },
  plugins: [],
}
