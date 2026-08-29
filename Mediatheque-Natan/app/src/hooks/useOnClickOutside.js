import { useEffect } from 'react';

/**
 * Hook personnalisé pour détecter les clics en dehors d'un élément
 * @param {RefObject} ref - Référence à l'élément
 * @param {Function} handler - Fonction à appeler lors d'un clic en dehors
 */
const useOnClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      // Ne rien faire si le clic est à l'intérieur de l'élément
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      
      // Appeler le handler
      handler(event);
    };

    // Ajouter l'écouteur d'événement
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    // Nettoyer
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]); // Ne recréer l'effet que si le ref ou le handler change
};

export default useOnClickOutside;
