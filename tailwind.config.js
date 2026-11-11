/** @type {import('tailwindcss').Config} */
const { colors: defaultColors } = require('tailwindcss/defaultTheme');
const scrollbar = require('tailwind-scrollbar');

module.exports = {
  content: ['./client/**/*.{js,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        ...defaultColors,
        // Burgundy primary palette
        burgundy: {
          DEFAULT: '#800020',
          50: '#FDF2F4',
          100: '#FBE6EA',
          200: '#F7CDD5',
          300: '#F0A4B3',
          400: '#E47189',
          500: '#D14264',
          600: '#AD2244',
          700: '#800020', // classic rich burgundy
          800: '#67031C', // deeper wine
          900: '#4D0416', // bordeaux
          950: '#2E020D',
        },
        // Map sky to burgundy so all existing buttons, badges, rings, active indicators become rich burgundy
        sky: {
          50: '#FDF2F4',
          100: '#FBE6EA',
          200: '#F7CDD5',
          300: '#F0A4B3',
          400: '#E47189',
          500: '#D14264',
          600: '#800020',
          700: '#67031C',
          800: '#4D0416',
          900: '#38020E',
          950: '#240108',
        },
        // Warm light-theme neutral surfaces with subtle burgundy undertone
        spill: {
          DEFAULT: '#1E1417',
          50: '#FAF7F8',  // light bg
          100: '#F4EFF1', // light panels / hover
          200: '#E8DFE2', // light borders / dividers
          300: '#D5C7CB',
          400: '#BAA7AD',
          500: '#8C777E',
          600: '#665359',
          700: '#47363B',
          800: '#2C1E23',
          900: '#1C1215',
          950: '#120A0C',
        },
        ink: {
          50: '#FAF8F8',
          100: '#F3EEF0',
          200: '#E5DCE0',
          300: '#CDBFC5',
          400: '#9E8D93',
          500: '#6E5C62',
          600: '#4E3E43',
          700: '#382B2F',
          800: '#251B1E',
          900: '#170E11',
          950: '#0D0709',
        },
      },
    },
  },
  plugins: [scrollbar],
};
