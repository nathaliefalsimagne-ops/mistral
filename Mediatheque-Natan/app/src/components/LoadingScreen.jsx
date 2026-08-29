import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen = ({ message = 'Chargement...' }) => {
  return (
    <div className="fixed inset-0 bg-primary flex items-center justify-center z-modal">
      <div className="text-center">
        <div className="mb-lg">
          <div className="w-20 h-20 bg-dark rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-white text-4xl font-bold">N</span>
          </div>
        </div>
        <div className="flex items-center gap-md text-secondary">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-lg">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
