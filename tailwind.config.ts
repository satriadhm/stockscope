import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        'bg-primary': '#06050f',
        'bg-alt': '#0d1e30',
        'bg-content': '#09131f',
        'bg-card-alt': '#060d18',
        'text-primary': '#e8f4f8',
        'text-secondary': '#a8c8e8',
        'text-tertiary': '#6b8aad',
        'border-primary': '#1e3a52',
        'border-alt': '#132030',
        'accent-blue': '#457b9d',
        'tier-red': '#e76f51',
        'tier-amber': '#e9c46a',
        'tier-green': '#2a9d8f',
        // Owner type colors
        'owner-individual': '#2a9d8f',
        'owner-corporate': '#e9c46a',
        'owner-bank': '#457b9d',
        'owner-foundation': '#d4a574',
        'owner-government': '#c55a7e',
        'owner-otherbanks': '#8491a3',
        'owner-other': '#666666',
      },
      backgroundColor: {
        primary: '#06050f',
        alt: '#0d1e30',
        content: '#09131f',
        'card-alt': '#060d18',
      },
      textColor: {
        primary: '#e8f4f8',
        secondary: '#a8c8e8',
        tertiary: '#6b8aad',
      },
      borderColor: {
        primary: '#1e3a52',
        alt: '#132030',
      },
      spacing: {
        full: '100%',
      },
      fontSize: {
        // Responsive font sizes using clamp
        xs: 'clamp(0.75rem, 2vw, 0.875rem)',
        sm: 'clamp(0.875rem, 2.5vw, 1rem)',
        base: 'clamp(0.875rem, 3vw, 1rem)',
        lg: 'clamp(1rem, 4vw, 1.125rem)',
        xl: 'clamp(1.125rem, 5vw, 1.25rem)',
        '2xl': 'clamp(1.375rem, 6vw, 1.5rem)',
        '3xl': 'clamp(1.75rem, 7vw, 2rem)',
      },
      gridTemplateColumns: {
        'auto-fit': 'repeat(auto-fit, minmax(150px, 1fr))',
        'auto-fill': 'repeat(auto-fill, minmax(200px, 1fr))',
      },
    },
  },
  plugins: [],
};

export default config;
