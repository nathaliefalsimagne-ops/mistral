import { useRef, useEffect } from 'react';

/**
 * Hook personnalisé pour obtenir la valeur précédente d'un état
 * @param {*} value - Valeur actuelle
 * @returns {*} - Valeur précédente
 */
const usePrevious = (value) => {
  // Stockage de la valeur précédente dans un ref
  const ref = useRef();

  useEffect(() => {
    // Mettre à jour le ref avec la valeur actuelle
    ref.current = value;
  }, [value]); // Ne recréer l'effet que si la valeur change

  // Renvoie la valeur précédente (ref.current)
  return ref.current;
};

export default usePrevious;
