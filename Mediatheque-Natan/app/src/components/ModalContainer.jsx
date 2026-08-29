import React from 'react';
import { useModal } from '../contexts/ModalContext';

const ModalContainer = () => {
  const { modals, closeLastModal, closeModal } = useModal();

  const getModalSize = (size) => {
    switch (size) {
      case 'sm':
        return 'max-w-sm';
      case 'md':
        return 'max-w-md';
      case 'lg':
        return 'max-w-lg';
      case 'xl':
        return 'max-w-xl';
      case 'full':
        return 'max-w-full h-full';
      default:
        return 'max-w-md';
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      const lastModal = modals[modals.length - 1];
      if (lastModal?.options?.closeOnBackdrop) {
        closeLastModal();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      const lastModal = modals[modals.length - 1];
      if (lastModal?.options?.closeOnEscape) {
        closeLastModal();
      }
    }
  };

  // Ajouter l'écouteur d'événements
  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [modals]);

  if (modals.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center p-md"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm" />

      {/* Modals */}
      <div className="relative w-full max-w-full flex flex-col gap-md">
        {modals.map((modal, index) => {
          const ModalComponent = modal.component;
          if (!ModalComponent) return null;

          return (
            <div
              key={modal.id}
              className={`
                bg-secondary rounded-lg shadow-xl overflow-hidden
                ${getModalSize(modal.options?.size)}
                ${modal.options?.centered ? 'mx-auto my-auto' : ''}
                ${index < modals.length - 1 ? 'hidden' : ''}
              `}
              style={{
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              <ModalComponent 
                {...modal.props} 
                onClose={() => closeModal(modal.id)} 
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModalContainer;
