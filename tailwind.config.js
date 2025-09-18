/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        DEFAULT: '1100px', // --maxw: 1100px
      },
    },
    extend: {
      colors: {
        // Using CSS variables to respect theme switching
        primary: {
          DEFAULT: 'var(--primary)', // --primary: #8b5cf6
          dark: '#7c3aed',
          light: '#a78bfa',
        },
        bg: {
          DEFAULT: 'var(--bg)',    // --bg: #0b1220
          2: 'var(--bg-2)',        // --bg-2: #0e1626
        },
        card: 'var(--card)',         // --card: #121a2b
        border: 'var(--border)',     // --border: #1f2a44
        text: {
          DEFAULT: 'var(--text)',    // --text: #e6f0ff
          muted: 'var(--muted)',     // --muted: #b3c1d1
        },
        muted: 'var(--muted)',       // Direct access for text-muted
        accent: '#06b6d4',
        // Button variant colors - exact matches from CSS
        danger: {
          DEFAULT: '#ef4444',  // --danger
          hover: '#dc2626',    // --danger-hover
        },
        warning: {
          DEFAULT: '#f59e0b',  // --warning
          hover: '#d97706',    // --warning-hover
        },
        success: {
          DEFAULT: '#10b981',  // --success
          hover: '#059669',    // --success-hover
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        '7xl': '4.5rem',
        '8xl': '6rem',
      },
      spacing: {
        '2.5': '10px',      // For exact 10px gap in buttons
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '18px', // Updated to match CSS variable --radius: 18px
      },
      boxShadow: {
        'card': '0 10px 30px rgba(0,0,0,.35)', // Exact match from CSS variable
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'dropdown': '0 8px 32px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'bounce-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
