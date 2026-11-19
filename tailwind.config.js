/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1B1F3B', 2: '#2A2F55', 3: '#3C4270' },
        paper: '#F5F6FA',
        mist: '#DDE1EE',
        stage: { DEFAULT: '#F2B33D', deep: '#8A5A00', soft: '#FCEFD2' },
        hs: { DEFAULT: '#186A5F', soft: '#DDF0EC' },
        college: { DEFAULT: '#6B3FA0', soft: '#ECE3F6' },
        brick: { DEFAULT: '#B4383C', soft: '#F8E1E1' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', '"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"Atkinson Hyperlegible"', 'Verdana', 'system-ui', 'sans-serif'],
      },
      maxWidth: { prose: '68ch' },
    },
  },
  plugins: [],
};
