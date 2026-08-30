/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/public/index.html',
    './app/src/**/*.{js,jsx}'
  ],
  // Le reset (Preflight) de Tailwind est désactivé : index.css a déjà son
  // propre reset global (`* { margin:0; padding:0; box-sizing:border-box }`)
  // et de nombreux composants existants comptent dessus. Activer Preflight
  // en plus risquerait de changer l'apparence d'éléments qui fonctionnent
  // déjà (tableaux, formulaires, titres).
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      // Échelle sémantique déjà utilisée dans tout le code (p-lg, px-md,
      // gap-sm, space-y-xs, top-lg, etc.) : l'étendre ici fait que Tailwind
      // génère automatiquement toutes les variantes directionnelles
      // (px-*, py-*, mx-*, ml-*, space-y-*, w-*, top-*, translate-x-*...)
      // au lieu de devoir les écrire une par une à la main.
      spacing: {
        xs: '0.25rem',
        sm: '0.5rem',
        md: '1rem',
        lg: '1.5rem',
        xl: '2rem'
      },
      colors: {
        dark: '#14152A',
        light: 'var(--text-primary)',
        color: 'var(--border)'
      },
      zIndex: {
        fixed: '1030',
        modal: '1000'
      }
    }
  },
  plugins: []
};
