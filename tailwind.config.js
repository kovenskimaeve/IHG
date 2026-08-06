export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#EFE7D2',
        parchmentDark: '#E3D8BC',
        ink: '#2B2620',
        inkSoft: '#5B5346',
        library: '#243D2E',
        libraryDeep: '#152B1F',
        oxblood: '#7A2E2A',
        oxbloodSoft: '#9A4A44',
        brass: '#B08D3E',
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        card: '2px 3px 0 0 rgba(43,38,32,0.15)',
        cardHover: '4px 5px 0 0 rgba(43,38,32,0.2)',
      },
    },
  },
  plugins: [],
}
