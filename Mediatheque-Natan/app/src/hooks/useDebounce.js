import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour débouncer une valeur
 * @param {*} value - Valeur à débouncer
 * @param {number} delay - Délai de debounce en ms
 * @returns {*} - Valeur débouncée
 */
const useDebounce = (value, delay) => {
  // État et setters pour la valeur débouncée
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Mettre à jour la valeur débouncée après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Nettoyer le timeout si la valeur change (aussi sur le démontage)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Ne recréer l'effet que si la valeur ou le délai change

  return debouncedValue;
};

export default useDebounce;
