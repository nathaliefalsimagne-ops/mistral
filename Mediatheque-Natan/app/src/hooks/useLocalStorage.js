import { useState, useEffect } from 'react';

/**
 * Hook personnalisé pour gérer l'état avec localStorage
 * @param {string} key - Clé pour localStorage
 * @param {*} initialValue - Valeur initiale
 * @returns {Array} - État et fonction de mise à jour
 */
const useLocalStorage = (key, initialValue) => {
  // État pour stocker notre valeur
  const [storedValue, setStoredValue] = useState(() => {
    try {
      // Obtenir depuis localStorage par clé
      const item = window.localStorage.getItem(key);
      // Analyser l'élément stocké
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // Si l'erreur est de ne pas pouvoir analyser l'item JSON
      console.error('Erreur lors de la lecture depuis localStorage:', error);
      return initialValue;
    }
  });

  // Retourner un wrapper de notre fonction useState setValue qui ...
  // ... persiste l'état dans localStorage.
  const setValue = (value) => {
    try {
      // Permettre la valeur d'être une fonction afin que nous puissions faire quelque chose comme setValue(prev => newValue)
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Sauvegarder l'état
      setStoredValue(valueToStore);
      // Sauvegarder dans localStorage
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // Une erreur plus sophistiquée ici serait de ne pas permettre de mettre à jour l'état
      console.error('Erreur lors de la sauvegarde dans localStorage:', error);
    }
  };

  return [storedValue, setValue];
};

export default useLocalStorage;
