import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  AlertTriangle,
  Home,
  ArrowLeft,
  Search,
  BookOpen
} from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  // Rediriger automatiquement après 10 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigate]);

  // Style du fond
  const backgroundStyle = {
    background: `linear-gradient(135deg, 
      ${theme === 'dark' ? '#1A1B2E' : '#F8F9FA'} 0%, 
      ${theme === 'dark' ? '#2B2D42' : '#E9ECEF'} 100%)`
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-md"
      style={backgroundStyle}
    >
      <div className="text-center max-w-md">
        {/* Icône d'erreur */}
        <div className="w-24 h-24 bg-danger bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-lg">
          <AlertTriangle className="w-12 h-12 text-danger" />
        </div>

        {/* Code d'erreur */}
        <h1 className="text-6xl font-bold text-danger mb-md">404</h1>
        
        {/* Message */}
        <h2 className="text-2xl font-semibold mb-md">Page introuvable</h2>
        <p className="text-secondary mb-lg">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>

        {/* Actions */}
        <div className="space-y-sm">
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-accent text-white py-md rounded-lg hover:bg-accent-light transition-colors flex items-center justify-center gap-sm"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour à la page précédente</span>
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary border rounded-lg py-md hover:bg-tertiary transition-colors flex items-center justify-center gap-sm"
          >
            <Home className="w-5 h-5" />
            <span>Retour à l'accueil</span>
          </button>
          
          <button
            onClick={() => navigate('/search')}
            className="w-full bg-primary border rounded-lg py-md hover:bg-tertiary transition-colors flex items-center justify-center gap-sm"
          >
            <Search className="w-5 h-5" />
            <span>Rechercher un média</span>
          </button>
        </div>

        {/* Suggestions */}
        <div className="mt-lg pt-lg border-t">
          <h3 className="font-medium mb-md">Essayez ces pages</h3>
          <div className="space-y-sm">
            <button
              onClick={() => navigate('/media')}
              className="w-full bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors text-left flex items-center gap-sm"
            >
              <BookOpen className="w-5 h-5" />
              <span>Bibliothèque de médias</span>
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors text-left flex items-center gap-sm"
            >
              <Home className="w-5 h-5" />
              <span>Tableau de bord</span>
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-full bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors text-left flex items-center gap-sm"
            >
              <Settings className="w-5 h-5" />
              <span>Paramètres</span>
            </button>
          </div>
        </div>

        {/* Message de redirection */}
        <p className="mt-lg text-sm text-tertiary">
          Redirection automatique vers l'accueil dans <span className="font-medium">10 secondes</span>...
        </p>

        {/* Illustration */}
        <div className="mt-xl">
          <div className="w-32 h-32 mx-auto opacity-50">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <path 
                d="M100 20 L180 60 L180 140 L100 180 L20 140 L20 60 Z"
                fill="none"
                stroke={theme === 'dark' ? '#8D99AE' : '#495057'}
                strokeWidth="2"
              />
              <path 
                d="M100 60 L140 100 L100 140 L60 100 Z"
                fill="none"
                stroke={theme === 'dark' ? '#8D99AE' : '#495057'}
                strokeWidth="2"
              />
              <circle 
                cx="100" cy="100" r="5"
                fill={theme === 'dark' ? '#8D99AE' : '#495057'}
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

// Import dynamique de l'icône Settings
const Settings = React.lazy(() => import('lucide-react').then(m => ({ default: m.Settings })));

export default NotFound;
