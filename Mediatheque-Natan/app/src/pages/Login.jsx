import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2
} from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { error: showError } = useToast();
  const { theme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Rediriger si déjà authentifié
  useEffect(() => {
    if (isAuthenticated) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // Connexion
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      showError('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({
        email: email.trim(),
        password,
        remember: rememberMe
      });

      if (response.success) {
        // Rediriger vers la page précédente ou la page d'accueil
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else {
        showError(response.error || 'Identifiants incorrects');
      }
    } catch (err) {
      console.error('Erreur lors de la connexion:', err);
      showError(`Erreur lors de la connexion: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, rememberMe, login, showError, navigate, location]);

  // Connexion rapide (pour le développement)
  const handleQuickLogin = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Se connecter avec un utilisateur par défaut
      const response = await login({
        email: 'nathalie@natan-consulting.com',
        password: 'demo123',
        remember: false
      });

      if (response.success) {
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Erreur lors de la connexion rapide:', err);
    } finally {
      setIsLoading(false);
    }
  }, [login, navigate, location]);

  // Basculer la visibilité du mot de passe
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // Style du fond
  const backgroundStyle = {
    background: `linear-gradient(135deg, 
      ${theme === 'dark' ? '#1A1B2E' : '#2B2D42'} 0%, 
      ${theme === 'dark' ? '#2B2D42' : '#4A4D6A'} 100%)`
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-md"
      style={backgroundStyle}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-xl">
          <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-md">
            <span className="text-white text-4xl font-bold">N</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Médiathèque NATAN</h1>
          <p className="text-secondary mt-xs">Gestion intelligente de votre collection</p>
        </div>

        {/* Formulaire de connexion */}
        <form onSubmit={handleSubmit} className="bg-secondary rounded-xl p-lg">
          <div className="space-y-md">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-sm">
                Adresse email
              </label>
              <div className="relative">
                <User className="absolute left-md top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pl-12 pr-md py-sm bg-primary border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-sm font-medium mb-sm">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-md top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Entrez votre mot de passe"
                  className="w-full pl-12 pr-12 py-sm bg-primary border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-accent"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-md top-1/2 -translate-y-1/2 text-tertiary hover:text-primary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Se souvenir de moi */}
            <label className="flex items-center gap-sm cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4"
                disabled={isLoading}
              />
              <span className="text-sm">Se souvenir de moi</span>
            </label>

            {/* Bouton de connexion */}
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full bg-accent text-white py-md rounded-lg hover:bg-accent-light transition-colors flex items-center justify-center gap-sm disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connexion...</span>
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Connexion rapide (dev) */}
            {process.env.NODE_ENV === 'development' && (
              <button
                type="button"
                onClick={handleQuickLogin}
                disabled={isLoading}
                className="w-full bg-tertiary text-secondary py-sm rounded-lg hover:bg-primary transition-colors text-sm"
              >
                Connexion rapide (démo)
              </button>
            )}
          </div>

          {/* Liens utiles */}
          <div className="mt-lg pt-lg border-t space-y-sm text-center">
            <button
              type="button"
              className="text-sm text-tertiary hover:text-primary transition-colors"
            >
              Mot de passe oublié ?
            </button>
            <div className="text-sm text-tertiary">
              <span>Nouveau ici ? </span>
              <button
                type="button"
                className="text-accent hover:underline transition-colors"
              >
                Créer un compte
              </button>
            </div>
          </div>
        </form>

        {/* Pied de page */}
        <div className="mt-lg text-center text-sm text-tertiary">
          <p>© {new Date().getFullYear()} NATAN Consulting</p>
          <p className="mt-xs">Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
