import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour gérer les media queries
 * @param {string} query - Requête media query
 * @returns {boolean} - Résultat de la requête
 */
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Vérifier si la requête correspond
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    // Écouteur pour les changements
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);

    // Nettoyer
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

export default useMediaQuery;
