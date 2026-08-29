import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour obtenir la taille de la fenêtre
 * @returns {Object} - Largeur et hauteur de la fenêtre
 */
const useWindowSize = () => {
  // Initialiser avec la taille de la fenêtre
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    // Fonction pour mettre à jour la taille de la fenêtre
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Ajouter l'écouteur d'événement
    window.addEventListener('resize', handleResize);

    // Nettoyer
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

export default useWindowSize;
