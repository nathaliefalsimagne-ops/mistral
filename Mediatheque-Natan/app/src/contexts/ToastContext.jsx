import React, { createContext, useState, useContext, useCallback } from 'react';

const ToastContext = createContext();

// Compteur partagé pour garantir un id de toast unique même quand deux
// toasts sont déclenchés dans la même milliseconde (ex: deux imports TMDB
// rapprochés) - Date.now() seul produisait alors deux toasts avec le
// même id, ce que React (qui utilise cet id comme clé de liste) gère mal :
// le bouton "x" et l'auto-fermeture d'un toast pouvaient alors n'avoir
// aucun effet visible, les toasts s'empilant indéfiniment.
let toastIdCounter = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = `${Date.now()}-${++toastIdCounter}`;
    const newToast = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: 5000,
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    // Supprimer automatiquement après la durée
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, options = {}) => {
    return addToast({ 
      type: 'success', 
      message, 
      ...options 
    });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({ 
      type: 'error', 
      message, 
      duration: 8000, // Plus long pour les erreurs
      ...options 
    });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({ 
      type: 'warning', 
      message, 
      ...options 
    });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({ 
      type: 'info', 
      message, 
      ...options 
    });
  }, [addToast]);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
    clearAll
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast doit être utilisé dans un ToastProvider');
  }
  return context;
};

export default ToastContext;
