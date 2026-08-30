import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children, onLogin, onLogout }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier l'authentification au montage
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Pour l'instant, on désactive l'authentification
        // Dans une version future, on vérifiera le token
        setIsAuthenticated(false);
        setUser(null);
      } catch (error) {
        console.error('Erreur lors de la vérification de l\'authentification:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Connexion
  const login = useCallback(async (credentials) => {
    try {
      // Simuler une connexion (à remplacer par un appel API réel)
      // const response = await window.electronAPI.auth.login(credentials);
      
      // Pour l'instant, on accepte n'importe quel login
      const mockUser = {
        id: 'user-1',
        firstName: 'Nathalie',
        lastName: 'FALSIMAGNE',
        email: 'nathalie@natan-consulting.com',
        accessLevel: 3, // Admin
        avatar: null
      };
      
      setUser(mockUser);
      setIsAuthenticated(true);
      onLogin?.(mockUser);
      
      return { success: true, user: mockUser };
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      return { success: false, error: error.message };
    }
  }, [onLogin]);

  // Déconnexion
  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    onLogout?.();
  }, [onLogout]);

  // Inscription (non utilisée pour l'instant)
  const register = useCallback(async (_userData) => {
    // TODO: brancher sur le futur système de profils (window.electronAPI.auth.register)
    return { success: true };
  }, []);

  // Récupérer le mot de passe
  const forgotPassword = useCallback(async (_email) => {
    // TODO: brancher sur le futur système de profils (window.electronAPI.auth.forgotPassword)
    return { success: true, message: 'Un email de réinitialisation a été envoyé' };
  }, []);

  // Mettre à jour le profil
  const updateProfile = useCallback(async (profileData) => {
    try {
      // const response = await window.electronAPI.auth.updateProfile(profileData);
      setUser(prev => ({ ...prev, ...profileData }));
      return { success: true, user: { ...user, ...profileData } };
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      return { success: false, error: error.message };
    }
  }, [user]);

  // Changer le mot de passe
  const changePassword = useCallback(async (_passwordData) => {
    // TODO: brancher sur le futur système de profils (window.electronAPI.auth.changePassword)
    return { success: true, message: 'Mot de passe changé avec succès' };
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    forgotPassword,
    updateProfile,
    changePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
};

export default AuthContext;
