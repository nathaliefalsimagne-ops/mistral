import React from 'react';
import { useToast } from '../contexts/ToastContext';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  const getToastIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-danger" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-info" />;
    }
  };

  const getToastBackground = (type) => {
    switch (type) {
      case 'success':
        return 'bg-success bg-opacity-10 border-success';
      case 'error':
        return 'bg-danger bg-opacity-10 border-danger';
      case 'warning':
        return 'bg-warning bg-opacity-10 border-warning';
      case 'info':
      default:
        return 'bg-info bg-opacity-10 border-info';
    }
  };

  return (
    <div className="fixed bottom-lg right-lg z-modal w-80 space-y-sm">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`p-md rounded-lg border shadow-lg flex items-start gap-md ${getToastBackground(toast.type)}`}
          role="alert"
        >
          <div className="flex-shrink-0">
            {getToastIcon(toast.type)}
          </div>
          <div className="flex-1">
            {toast.title && (
              <p className="font-semibold mb-xs">{toast.title}</p>
            )}
            <p className="text-sm">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-tertiary hover:text-primary transition-colors"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
