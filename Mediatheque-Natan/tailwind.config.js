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
      // Valeurs littérales (pas de var()) pour que les dégradés
      // (from-accent to-accent-light), les modificateurs d'opacité
      // (bg-danger/50) et les ring/shadow colorés fonctionnent : Tailwind
      // ne peut pas calculer une opacité ou un dégradé sur une valeur
      // var(--...) opaque au moment de la compilation.
      colors: {
        dark: '#14152A',
        light: 'var(--text-primary)',
        color: 'var(--border)',
        accent: '#D90429',
        'accent-light': '#EF233C',
        success: '#27AE60',
        info: '#2980B9',
        warning: '#F2994A',
        danger: '#EB5757'
      },
      zIndex: {
        fixed: '1030',
        modal: '1000'
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        }
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.35s ease-out both',
        'fade-in': 'fadeIn 0.2s ease-out both',
        'scale-in': 'scaleIn 0.2s ease-out both'
      },
      boxShadow: {
        glow: '0 8px 30px -8px rgba(217, 4, 41, 0.45)',
        'glow-lg': '0 20px 45px -12px rgba(217, 4, 41, 0.5)'
      }
    }
  },
  plugins: []
};
