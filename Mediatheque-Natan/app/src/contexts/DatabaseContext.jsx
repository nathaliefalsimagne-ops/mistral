import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getAiService } from '../services';

const DatabaseContext = createContext();

export const DatabaseProvider = ({ children }) => {
  const [media, setMedia] = useState([]);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [persons, setPersons] = useState([]);
  const [users, setUsers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    type: null,
    category: null,
    location: null,
    hasJacket: null,
    search: ''
  });
  const [aiService, setAiService] = useState(null);
  const [isAiAvailable, setIsAiAvailable] = useState(false);

  // Initialiser le service IA
  useEffect(() => {
    const initAiService = async () => {
      try {
        const service = getAiService();
        const status = await service.checkOllamaStatus();
        setAiService(service);
        setIsAiAvailable(status.running);
      } catch (err) {
        console.error('Erreur lors de l\'initialisation du service IA:', err);
        setIsAiAvailable(false);
      }
    };
    initAiService();
  }, []);

  // Charger les données initiales
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Charger les médias avec les filtres
      const mediaResponse = await window.electronAPI.db.getMedia(filters);
      if (mediaResponse.success) {
        setMedia(mediaResponse.data);
      }
      
      // Charger les emplacements
      const locationsResponse = await window.electronAPI.db.getLocations();
      if (locationsResponse.success) {
        setLocations(locationsResponse.data);
      }
      
      // Charger les catégories
      const categoriesResponse = await window.electronAPI.db.getCategories();
      if (categoriesResponse.success) {
        setCategories(categoriesResponse.data);
      }
      
      // Charger les personnes
      const personsResponse = await window.electronAPI.db.getPersons();
      if (personsResponse.success) {
        setPersons(personsResponse.data);
      }
      
      // Charger les utilisateurs
      const usersResponse = await window.electronAPI.db.getUsers();
      if (usersResponse.success) {
        setUsers(usersResponse.data);
      }
      
      // Charger les emprunts
      const loansResponse = await window.electronAPI.db.getLoans();
      if (loansResponse.success) {
        setLoans(loansResponse.data);
      }
      
      setError(null);
    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Charger les données au montage
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Rafraîchir les données
  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  // Ajouter un média
  const addMedia = useCallback(async (mediaData) => {
    try {
      const response = await window.electronAPI.db.addMedia(mediaData);
      if (response.success) {
        await loadData();
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (err) {
      console.error('Erreur lors de l\'ajout du média:', err);
      return { success: false, error: err.message };
    }
  }, [loadData]);

  // Mettre à jour un média
  const updateMedia = useCallback(async (mediaData) => {
    try {
      const response = await window.electronAPI.db.updateMedia(mediaData);
      if (response.success) {
        await loadData();
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (err) {
      console.error('Erreur lors de la mise à jour du média:', err);
      return { success: false, error: err.message };
    }
  }, [loadData]);

  // Supprimer un média
  const deleteMedia = useCallback(async (id) => {
    try {
      const response = await window.electronAPI.db.deleteMedia(id);
      if (response.success) {
        await loadData();
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (err) {
      console.error('Erreur lors de la suppression du média:', err);
      return { success: false, error: err.message };
    }
  }, [loadData]);

  // Rechercher des médias (recherche standard)
  const searchMedia = useCallback(async (query) => {
    try {
      const response = await window.electronAPI.db.searchMedia(query);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (err) {
      console.error('Erreur lors de la recherche:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Recherche naturelle avec IA
  const naturalLanguageSearch = useCallback(async (query) => {
    try {
      if (!aiService || !isAiAvailable) {
        return {
          success: false,
          error: 'Service IA non disponible. Vérifiez qu\'Ollama est démarré.',
          fallback: true,
          query: query
        };
      }

      // Utiliser l'IA pour transformer la requête naturelle en requête SQL ou mots-clés
      const response = await aiService.naturalLanguageSearch(query, media);
      
      if (!response.success) {
        console.error('Erreur lors de la recherche naturelle:', response.error);
        // Retourner la requête originale pour une recherche standard
        return {
          success: false,
          error: response.error,
          fallback: true,
          query: query
        };
      }

      // Si l'IA retourne une requête SQL
      if (response.type === 'sql') {
        try {
          // Exécuter la requête SQL
          const sqlResponse = await window.electronAPI.db.query({ sql: response.query });
          if (sqlResponse.success) {
            return {
              success: true,
              data: sqlResponse.data,
              query: response.query,
              type: 'sql',
              aiUsed: true
            };
          }
        } catch (sqlErr) {
          console.error('Erreur lors de l\'exécution de la requête SQL:', sqlErr);
        }
      }

      // Si l'IA retourne des mots-clés ou si la requête SQL échoue
      const keywords = response.type === 'keywords' ? response.keywords : [query];
      
      // Effectuer une recherche standard avec les mots-clés
      const results = [];
      for (const keyword of keywords) {
        const searchResponse = await window.electronAPI.db.searchMedia(keyword);
        if (searchResponse.success) {
          results.push(...searchResponse.data);
        }
      }

      // Supprimer les doublons
      const uniqueResults = Array.from(new Map(results.map(item => [item.id, item])).values());

      return {
        success: true,
        data: uniqueResults,
        query: keywords.join(' '),
        type: 'keywords',
        aiUsed: true,
        keywords: keywords
      };

    } catch (err) {
      console.error('Erreur lors de la recherche naturelle:', err);
      return {
        success: false,
        error: err.message,
        fallback: true,
        query: query
      };
    }
  }, [aiService, isAiAvailable, media]);

  // Obtenir des recommandations IA
  const getAiRecommendations = useCallback(async (userId = null, limit = 5) => {
    try {
      if (!aiService || !isAiAvailable) {
        return {
          success: false,
          error: 'Service IA non disponible',
          fallback: true
        };
      }

      // Obtenir l'historique de l'utilisateur
      let userHistory = [];
      if (userId) {
        const loansResponse = await window.electronAPI.db.getLoansByUser(userId);
        if (loansResponse.success) {
          userHistory = loansResponse.data;
        }
      } else {
        // Utiliser tous les emprunts
        userHistory = loans;
      }

      // Obtenir les préférences
      const preferences = {};
      if (userId) {
        // Pour l'instant, on utilise les catégories les plus empruntées
        const categoryStats = {};
        userHistory.forEach(loan => {
          const mediaItem = media.find(m => m.id === loan.media_id);
          if (mediaItem && mediaItem.categories) {
            mediaItem.categories.forEach(cat => {
              categoryStats[cat] = (categoryStats[cat] || 0) + 1;
            });
          }
        });
        preferences.favoriteCategories = Object.entries(categoryStats)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([cat, count]) => cat);
      }

      // Obtenir les recommandations via IA
      const response = await aiService.getRecommendations(
        userHistory,
        media,
        preferences
      );

      if (!response.success) {
        return {
          success: false,
          error: response.error,
          fallback: true
        };
      }

      // Mapper les recommandations aux médias réels
      const recommendedMedia = [];
      for (const rec of response.recommendations) {
        const matchingMedia = media.filter(m => 
          m.title.toLowerCase().includes(rec.title.toLowerCase()) ||
          (m.original_title && m.original_title.toLowerCase().includes(rec.title.toLowerCase()))
        );
        recommendedMedia.push({
          ...rec,
          media: matchingMedia
        });
      }

      return {
        success: true,
        recommendations: recommendedMedia.slice(0, limit),
        aiUsed: true
      };

    } catch (err) {
      console.error('Erreur lors de l\'obtention des recommandations IA:', err);
      return {
        success: false,
        error: err.message,
        fallback: true
      };
    }
  }, [aiService, isAiAvailable, media, loans]);

  // Analyser un média avec l'IA
  const analyzeMediaWithAI = useCallback(async (mediaItem) => {
    try {
      if (!aiService || !isAiAvailable) {
        return {
          success: false,
          error: 'Service IA non disponible'
        };
      }

      const response = await aiService.analyzeMedia(mediaItem);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error
        };
      }

      return {
        success: true,
        analysis: response.analysis,
        rawResponse: response.rawResponse,
        aiUsed: true
      };

    } catch (err) {
      console.error('Erreur lors de l\'analyse du média:', err);
      return {
        success: false,
        error: err.message
      };
    }
  }, [aiService, isAiAvailable]);

  // Vérifier la disponibilité de l'IA
  const checkAiAvailability = useCallback(async () => {
    try {
      if (!aiService) return false;
      const status = await aiService.checkOllamaStatus();
      setIsAiAvailable(status.running);
      return status.running;
    } catch (err) {
      setIsAiAvailable(false);
      return false;
    }
  }, [aiService]);

  // Obtenir un média par ID
  const getMediaById = useCallback(async (id) => {
    try {
      const response = await window.electronAPI.db.getMediaById(id);
      if (response.success) {
        return { success: true, data: response.data };
      }
      return { success: false, error: response.error };
    } catch (err) {
      console.error('Erreur lors de la récupération du média:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Mettre à jour les filtres
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Réinitialiser les filtres
  const resetFilters = useCallback(() => {
    setFilters({
      type: null,
      category: null,
      location: null,
      hasJacket: null,
      search: ''
    });
  }, []);

  // Obtenir les statistiques
  const getStats = useCallback(async () => {
    try {
      const stats = {
        totalMedia: media.length,
        byType: {},
        byLocation: {},
        byCategory: {},
        byState: {},
        recentAdditions: [],
        mostBorrowed: []
      };

      // Par type
      media.forEach(m => {
        const type = window.electronAPI.utils.getMediaTypeLabel(m.type_id);
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      });

      // Par emplacement
      media.forEach(m => {
        const location = locations.find(l => l.id === m.location_id);
        const locationName = location ? location.name : 'Non spécifié';
        stats.byLocation[locationName] = (stats.byLocation[locationName] || 0) + 1;
      });

      // Par catégorie
      // (Nécessiterait une jointure avec media_categories)

      // Par état
      media.forEach(m => {
        const state = window.electronAPI.utils.getMediaStateLabel(m.state_id);
        stats.byState[state] = (stats.byState[state] || 0) + 1;
      });

      // Ajouts récents
      stats.recentAdditions = [...media]
        .sort((a, b) => new Date(b.added_date || b.created_at) - new Date(a.added_date || a.created_at))
        .slice(0, 5);

      return stats;
    } catch (err) {
      console.error('Erreur lors du calcul des statistiques:', err);
      return null;
    }
  }, [media, locations]);

  // Exporter les données
  const exportData = useCallback(async (_format = 'csv') => {
    // TODO: implémenter via un appel IPC dédié (window.electronAPI)
    return { success: true, message: 'Export en cours...' };
  }, []);

  // Importer les données
  const importData = useCallback(async (_source, _options = {}) => {
    // TODO: implémenter via un appel IPC dédié (window.electronAPI)
    return { success: true, message: 'Import en cours...' };
  }, []);

  const value = {
    media,
    locations,
    categories,
    persons,
    users,
    loans,
    isLoading,
    error,
    filters,
    aiService,
    isAiAvailable,
    loadData,
    refreshData,
    addMedia,
    updateMedia,
    deleteMedia,
    searchMedia,
    naturalLanguageSearch,
    getMediaById,
    getAiRecommendations,
    analyzeMediaWithAI,
    checkAiAvailability,
    updateFilters,
    resetFilters,
    getStats,
    exportData,
    importData
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase doit être utilisé dans un DatabaseProvider');
  }
  return context;
};

export default DatabaseContext;
