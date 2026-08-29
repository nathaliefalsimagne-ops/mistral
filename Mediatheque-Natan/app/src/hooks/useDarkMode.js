import { useEffect, useState } from 'react';

/**
 * Hook personnalisé pour gérer le mode sombre
 * @returns {Array} - État du mode sombre et fonction de bascule
 */
const useDarkMode = () => {
  // Vérifier si le mode sombre est activé dans localStorage ou les préférences système
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('theme');
    if (savedMode === 'dark') return true;
    if (savedMode === 'light') return false;
    
    // Vérifier les préférences système
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // Appliquer la classe dark à l'élément html
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Sauvegarder dans localStorage
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Écouteur pour les changements des préférences système
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Si aucun thème n'est sauvegardé, suivre les préférences système
      if (!localStorage.getItem('theme')) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return [isDarkMode, toggleDarkMode];
};

export default useDarkMode;
