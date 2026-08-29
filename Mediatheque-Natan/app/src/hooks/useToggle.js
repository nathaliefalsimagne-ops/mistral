import { useState, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer un état booléen avec bascule
 * @param {boolean} initialValue - Valeur initiale
 * @returns {Array} - État et fonctions de bascule
 */
const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => {
    setValue(prev => !prev);
  }, []);

  const setTrue = useCallback(() => {
    setValue(true);
  }, []);

  const setFalse = useCallback(() => {
    setValue(false);
  }, []);

  return [value, toggle, setTrue, setFalse];
};

export default useToggle;
