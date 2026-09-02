/** @type {import('tailwindcss').Config} */
// Sistema de diseño A.R.C.A. — tokens espejados del UI Kit v1.0.
// Mantener sincronizado con docs/UI_KIT.md y los standalone de referencia.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Escala verde — primario de la marca (Circular Green)
        green: {
          50: '#eff9f3',
          100: '#ddf3e8',
          200: '#b6ebcf',
          300: '#7ed9ab',
          500: '#1bb46f',
          600: '#138a57',
          700: '#0F6B45',
          800: '#0E5238',
          900: '#0A3D29',
        },
        // Dorado — Circular Credits / CTA de reutilización
        gold: {
          50: '#fef7e9',
          100: '#fdeccc',
          400: '#f7b54e',
          500: '#ef9d24',
          600: '#c97e12',
        },
        rose: { 100: '#fbe2dc', 600: '#c4452f' }, // alertas
        sky: { 100: '#d9eef9', 600: '#1f7fb8' }, // info
        // Neutros verdosos
        ink: { DEFAULT: '#0e1a14', 2: '#2b3a32' },
        slate: { DEFAULT: '#5d6e64', 2: '#8a988f' },
        line: { DEFAULT: '#e6ece8', 2: '#eef2ef' },
        canvas: '#f3f6f3',
        card: { DEFAULT: '#ffffff', 2: '#f8faf8' },
        side: '#0c3526',
        // Alias de compatibilidad con clases arca-* previas
        arca: { green: '#138a57', dark: '#0F6B45', light: '#ddf3e8' },
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", 'system-ui', 'sans-serif'],
        body: ["'Hanken Grotesk'", 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '12px',
        md: '18px',
        lg: '24px',
        xl: '30px',
        pill: '999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(14,26,20,.05),0 1px 3px rgba(14,26,20,.04)',
        md: '0 4px 14px rgba(14,26,20,.07),0 1px 4px rgba(14,26,20,.05)',
        lg: '0 12px 34px rgba(14,26,20,.12),0 4px 12px rgba(14,26,20,.06)',
        green: '0 8px 22px rgba(19,138,87,.28)',
        gold: '0 8px 20px rgba(239,157,36,.30)',
      },
    },
  },
  plugins: [],
};
