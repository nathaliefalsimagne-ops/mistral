import React, { createContext, useState, useEffect, useCallback, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children, onLogin, onLogout }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  // Charger la liste des profils au montage (écran "qui regarde ?")
  const loadProfiles = useCallback(async () => {
    setIsLoadingProfiles(true);
    try {
      const response = await window.electronAPI.profiles.list();
      if (response.success) {
        setProfiles(response.data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des profils:', error);
    } finally {
      setIsLoadingProfiles(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const toAuthUser = (profile) => ({
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    avatar: profile.avatar_url,
    accessLevel: profile.access_level_id
  });

  // Sélectionner un profil (avec vérification du PIN si le profil en a un)
  const selectProfile = useCallback(async (profileId, pin) => {
    setIsLoading(true);
    try {
      const verification = await window.electronAPI.profiles.verifyPin(profileId, pin);
      if (!verification.success) {
        return { success: false, error: verification.error || 'Code PIN incorrect' };
      }

      const profile = profiles.find((p) => p.id === profileId);
      const authUser = toAuthUser(profile || { id: profileId });
      setUser(authUser);
      setIsAuthenticated(true);
      onLogin?.(authUser);

      return { success: true, user: authUser };
    } catch (error) {
      console.error('Erreur lors de la sélection du profil:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [profiles, onLogin]);

  // Créer un nouveau profil
  const createProfile = useCallback(async (profileData) => {
    const response = await window.electronAPI.profiles.create(profileData);
    if (response.success) {
      await loadProfiles();
    }
    return response;
  }, [loadProfiles]);

  // Modifier un profil existant
  const updateProfile = useCallback(async (profileId, updates) => {
    const response = await window.electronAPI.profiles.update({ profileId, ...updates });
    if (response.success) {
      await loadProfiles();
      setUser((prev) => (prev && prev.id === profileId ? { ...prev, ...toAuthUser({ ...updates, id: profileId }) } : prev));
    }
    return response;
  }, [loadProfiles]);

  // Supprimer un profil
  const deleteProfile = useCallback(async (profileId) => {
    const response = await window.electronAPI.profiles.delete(profileId);
    if (response.success) {
      await loadProfiles();
    }
    return response;
  }, [loadProfiles]);

  // Revenir à l'écran de sélection des profils
  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    onLogout?.();
  }, [onLogout]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    profiles,
    isLoadingProfiles,
    loadProfiles,
    selectProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    logout
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
