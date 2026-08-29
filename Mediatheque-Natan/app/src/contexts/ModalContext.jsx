import React, { createContext, useState, useContext, useCallback } from 'react';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modals, setModals] = useState([]);

  const openModal = useCallback((modal) => {
    const id = Date.now().toString();
    const newModal = {
      id,
      component: null,
      props: {},
      options: {
        closeOnBackdrop: true,
        closeOnEscape: true,
        size: 'md', // sm, md, lg, xl, full
        centered: true
      },
      ...modal
    };

    setModals(prev => [...prev, newModal]);
    return id;
  }, []);

  const closeModal = useCallback((id) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  }, []);

  const closeAllModals = useCallback(() => {
    setModals([]);
  }, []);

  const updateModal = useCallback((id, updates) => {
    setModals(prev => 
      prev.map(modal => 
        modal.id === id ? { ...modal, ...updates } : modal
      )
    );
  }, []);

  // Fermer le dernier modal
  const closeLastModal = useCallback(() => {
    setModals(prev => prev.slice(0, -1));
  }, []);

  const value = {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    closeLastModal,
    updateModal
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal doit être utilisé dans un ModalProvider');
  }
  return context;
};

export default ModalContext;
