/**
 * Moteur de recommandation pour Médiathèque NATAN
 * 
 * Ce module implémente un système de recommandation intelligent basé sur:
 * - L'historique des emprunts de l'utilisateur
 * - Les notes et préférences
 * - La similitude entre les médias
 * - Les tendances générales
 */

import { useDatabase } from '../contexts/DatabaseContext';

class RecommendationEngine {
  constructor(database) {
    this.db = database;
    this.config = {
      weights: {
        historySimilarity: 0.4,    // Similitude avec l'historique
        categoryPopularity: 0.2,  // Popularité dans la catégorie
        trend: 0.15,              // Tendance du moment
        seasonality: 0.1,        // Pertinence saisonnière
        diversity: 0.1,          // Diversité des recommandations
        newArrivals: 0.05         // Nouveautés
      },
      minRecommendations: 5,
      maxRecommendations: 20,
      diversityThreshold: 0.3
    };
  }

  /**
   * Initialiser le moteur avec la configuration
   */
  initialize(config = {}) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Obtenir des recommandations pour un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {Object} options - Options de recommandation
   * @returns {Promise<Array>} - Liste des recommandations
   */
  async getRecommendations(userId, options = {}) {
    try {
      const {
        limit = 10,
        excludeHistory = true,
        includeTrending = true
      } = options;

      // Obtenir les données nécessaires
      const [user, userLoans, allMedia, allUsers] = await Promise.all([
        this.getUser(userId),
        this.getUserLoans(userId),
        this.getAllMedia(),
        this.getAllUsers()
      ]);

      if (!user) {
        console.warn(`Utilisateur non trouvé: ${userId}`);
        return [];
      }

      // Filtrer les médias déjà empruntés par l'utilisateur
      let candidateMedia = allMedia;
      if (excludeHistory) {
        const borrowedMediaIds = userLoans.map(loan => loan.media_id);
        candidateMedia = allMedia.filter(media => !borrowedMediaIds.includes(media.id));
      }

      // Calculer les scores pour chaque média candidat
      const scoredMedia = await this.calculateScores(candidateMedia, user, userLoans, allUsers);

      // Trier par score décroissant
      const sortedMedia = scoredMedia.sort((a, b) => b.score - a.score);

      // Appliquer la diversité
      const diverseMedia = this.applyDiversity(sortedMedia, user);

      // Retourner les meilleures recommandations
      return diverseMedia.slice(0, Math.min(limit, diverseMedia.length));

    } catch (error) {
      console.error('Erreur lors du calcul des recommandations:', error);
      return [];
    }
  }

  /**
   * Calculer les scores pour les médias
   */
  async calculateScores(candidateMedia, user, userLoans, allUsers) {
    const scoredMedia = [];

    for (const media of candidateMedia) {
      let score = 0;
      const contributions = {};

      // 1. Similitude avec l'historique (40%)
      const historyScore = await this.calculateHistorySimilarity(media, user, userLoans);
      score += historyScore * this.config.weights.historySimilarity;
      contributions.historySimilarity = historyScore * this.config.weights.historySimilarity;

      // 2. Popularité dans la catégorie (20%)
      const categoryScore = await this.calculateCategoryPopularity(media, userLoans, allUsers);
      score += categoryScore * this.config.weights.categoryPopularity;
      contributions.categoryPopularity = categoryScore * this.config.weights.categoryPopularity;

      // 3. Tendance du moment (15%)
      const trendScore = await this.calculateTrendScore(media, userLoans);
      score += trendScore * this.config.weights.trend;
      contributions.trend = trendScore * this.config.weights.trend;

      // 4. Pertinence saisonnière (10%)
      const seasonalityScore = this.calculateSeasonalityScore(media);
      score += seasonalityScore * this.config.weights.seasonality;
      contributions.seasonality = seasonalityScore * this.config.weights.seasonality;

      // 5. Diversité (10%) - sera appliquée plus tard
      // 6. Nouveautés (5%)
      const newArrivalScore = this.calculateNewArrivalScore(media);
      score += newArrivalScore * this.config.weights.newArrivals;
      contributions.newArrivals = newArrivalScore * this.config.weights.newArrivals;

      scoredMedia.push({
        media,
        score,
        contributions
      });
    }

    return scoredMedia;
  }

  /**
   * Calculer la similitude avec l'historique de l'utilisateur
   */
  async calculateHistorySimilarity(media, user, userLoans) {
    if (userLoans.length === 0) {
      return 0.5; // Score neutre si aucun historique
    }

    // Obtenir les médias empruntés par l'utilisateur
    const borrowedMedia = await this.getBorrowedMedia(userLoans);

    if (borrowedMedia.length === 0) {
      return 0.5;
    }

    // Calculer la similitude basée sur plusieurs critères
    const similarityScores = [];

    // Similitude par type
    const typeMatch = borrowedMedia.filter(m => m.type_id === media.type_id).length / borrowedMedia.length;
    similarityScores.push(typeMatch);

    // Similitude par genre (via catégories)
    const mediaCategories = await this.getMediaCategories(media.id);
    let categoryMatch = 0;
    let totalCategories = 0;

    for (const borrowed of borrowedMedia) {
      const borrowedCategories = await this.getMediaCategories(borrowed.id);
      const commonCategories = mediaCategories.filter(cat => 
        borrowedCategories.some(bc => bc.id === cat.id)
      );
      categoryMatch += commonCategories.length;
      totalCategories += borrowedCategories.length;
    }

    const avgCategoryMatch = totalCategories > 0 ? categoryMatch / totalCategories : 0;
    similarityScores.push(avgCategoryMatch);

    // Similitude par réalisateur/artiste
    const mediaPersons = await this.getMediaPersons(media.id);
    let personMatch = 0;
    let totalPersons = 0;

    for (const borrowed of borrowedMedia) {
      const borrowedPersons = await this.getMediaPersons(borrowed.id);
      const commonPersons = mediaPersons.filter(p => 
        borrowedPersons.some(bp => bp.id === p.id)
      );
      personMatch += commonPersons.length;
      totalPersons += borrowedPersons.length;
    }

    const avgPersonMatch = totalPersons > 0 ? personMatch / totalPersons : 0;
    similarityScores.push(avgPersonMatch);

    // Similitude par année (plus proche = plus similaire)
    const avgBorrowedYear = borrowedMedia.reduce((sum, m) => sum + (m.release_year || 0), 0) / borrowedMedia.length;
    const mediaYear = media.release_year || 0;
    const yearDifference = Math.abs(avgBorrowedYear - mediaYear);
    const maxYearDiff = 50; // 50 ans de différence max
    const yearSimilarity = 1 - Math.min(yearDifference / maxYearDiff, 1);
    similarityScores.push(yearSimilarity);

    // Retourner la moyenne des scores de similitude
    return similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length;
  }

  /**
   * Calculer la popularité dans la catégorie
   */
  async calculateCategoryPopularity(media, userLoans, allUsers) {
    const mediaCategories = await this.getMediaCategories(media.id);
    
    if (mediaCategories.length === 0) {
      return 0.5;
    }

    // Calculer la popularité moyenne des catégories du média
    let totalPopularity = 0;
    
    for (const category of mediaCategories) {
      // Obtenir tous les médias de cette catégorie
      const categoryMedia = await this.getMediaByCategory(category.id);
      
      // Calculer le nombre total d'emprunts pour les médias de cette catégorie
      let totalLoans = 0;
      for (const catMedia of categoryMedia) {
        const loans = await this.getMediaLoans(catMedia.id);
        totalLoans += loans.length;
      }
      
      // Popularité = nombre d'emprunts / nombre de médias dans la catégorie
      const categoryPopularity = categoryMedia.length > 0 ? totalLoans / categoryMedia.length : 0;
      totalPopularity += categoryPopularity;
    }

    // Popularité moyenne
    return totalPopularity / mediaCategories.length;
  }

  /**
   * Calculer le score de tendance
   */
  async calculateTrendScore(media, allLoans) {
    // Obtenir les emprunts récents (derniers 30 jours)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);
    
    const recentLoans = allLoans.filter(loan => {
      const loanDate = new Date(loan.loan_date);
      return loanDate >= recentDate;
    });

    // Compter combien de fois ce média a été emprunté récemment
    const mediaRecentLoans = recentLoans.filter(loan => loan.media_id === media.id);
    const mediaRecentCount = mediaRecentLoans.length;

    // Calculer le score de tendance
    // Plus le média est emprunté récemment, plus le score est élevé
    if (mediaRecentCount === 0) {
      return 0.1; // Score de base
    }

    // Normaliser par le nombre total d'emprunts récents
    const maxRecentLoans = Math.max(...recentLoans.map(l => 
      recentLoans.filter(rl => rl.media_id === l.media_id).length
    ));

    return mediaRecentCount / maxRecentLoans;
  }

  /**
   * Calculer le score de pertinence saisonnière
   */
  calculateSeasonalityScore(media) {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // 0-11

    // Médias de Noël (décembre)
    if (currentMonth === 11 && (media.title.toLowerCase().includes('noel') || 
                               media.title.toLowerCase().includes('christmas') ||
                               media.synopsis?.toLowerCase().includes('noel'))) {
      return 1.0;
    }

    // Médias d'été (juin, juillet, août)
    if ([5, 6, 7].includes(currentMonth) && 
        (media.title.toLowerCase().includes('été') || 
         media.title.toLowerCase().includes('summer') ||
         media.synopsis?.toLowerCase().includes('été'))) {
      return 0.8;
    }

    // Médias d'Halloween (octobre)
    if (currentMonth === 9 && (media.title.toLowerCase().includes('halloween') || 
                              media.title.toLowerCase().includes('horreur') ||
                              media.synopsis?.toLowerCase().includes('halloween'))) {
      return 0.9;
    }

    // Médias de Saint-Valentin (février)
    if (currentMonth === 1 && (media.title.toLowerCase().includes('amour') || 
                              media.title.toLowerCase().includes('valentin') ||
                              media.synopsis?.toLowerCase().includes('amour'))) {
      return 0.7;
    }

    // Score par défaut
    return 0.3;
  }

  /**
   * Calculer le score de nouveauté
   */
  calculateNewArrivalScore(media) {
    if (!media.added_date) {
      return 0;
    }

    const addedDate = new Date(media.added_date);
    const currentDate = new Date();
    const daysSinceAdded = (currentDate - addedDate) / (1000 * 60 * 60 * 24);

    // Plus le média est récent, plus le score est élevé
    // Score maximal pour les médias ajoutés dans les 7 derniers jours
    if (daysSinceAdded <= 7) {
      return 1.0;
    } else if (daysSinceAdded <= 30) {
      return 0.7;
    } else if (daysSinceAdded <= 90) {
      return 0.4;
    }

    return 0.1;
  }

  /**
   * Appliquer la diversité aux recommandations
   */
  applyDiversity(scoredMedia, user) {
    if (scoredMedia.length <= 5) {
      return scoredMedia;
    }

    // Regrouper par type de média
    const byType = {};
    scoredMedia.forEach(item => {
      const type = this.getMediaTypeLabel(item.media.type_id);
      if (!byType[type]) {
        byType[type] = [];
      }
      byType[type].push(item);
    });

    // Sélectionner les meilleurs de chaque type
    const diverseMedia = [];
    const maxPerType = Math.ceil(scoredMedia.length * 0.3); // Max 30% par type

    for (const type in byType) {
      const typeMedia = byType[type].sort((a, b) => b.score - a.score);
      const selected = typeMedia.slice(0, Math.min(maxPerType, typeMedia.length));
      diverseMedia.push(...selected);
    }

    // Si on a pas assez de recommandations, compléter avec les meilleurs restants
    if (diverseMedia.length < scoredMedia.length * 0.7) {
      const remaining = scoredMedia.filter(item => 
        !diverseMedia.includes(item)
      ).sort((a, b) => b.score - a.score);
      
      diverseMedia.push(...remaining.slice(0, Math.min(
        scoredMedia.length - diverseMedia.length,
        remaining.length
      )));
    }

    // Retrier par score
    return diverseMedia.sort((a, b) => b.score - a.score);
  }

  /**
   * Obtenir les recommandations pour la page d'accueil
   */
  async getHomepageRecommendations(userId) {
    try {
      // Obtenir les recommandations principales
      const mainRecommendations = await this.getRecommendations(userId, {
        limit: 5,
        excludeHistory: true
      });

      // Obtenir les tendances
      const trending = await this.getTrendingMedia(5);

      // Obtenir les nouveautés
      const newArrivals = await this.getNewArrivals(5);

      // Combiner et dédupliquer
      const allRecommendations = [...mainRecommendations, ...trending, ...newArrivals];
      const uniqueRecommendations = this.removeDuplicates(allRecommendations);

      return uniqueRecommendations.slice(0, 10);

    } catch (error) {
      console.error('Erreur lors de l\'obtention des recommandations pour la page d\'accueil:', error);
      return [];
    }
  }

  /**
   * Obtenir les médias tendances
   */
  async getTrendingMedia(limit = 10) {
    try {
      const allLoans = await this.getAllLoans();
      const allMedia = await this.getAllMedia();

      // Compter les emprunts par média
      const loanCounts = {};
      allLoans.forEach(loan => {
        if (!loan.return_date) {
          loanCounts[loan.media_id] = (loanCounts[loan.media_id] || 0) + 1;
        }
      });

      // Trier par nombre d'emprunts
      const sortedMediaIds = Object.keys(loanCounts)
        .sort((a, b) => loanCounts[b] - loanCounts[a]);

      // Obtenir les détails des médias
      const trendingMedia = [];
      for (const mediaId of sortedMediaIds.slice(0, limit)) {
        const media = allMedia.find(m => m.id === mediaId);
        if (media) {
          trendingMedia.push({
            media,
            score: loanCounts[mediaId],
            reason: `Tendance: ${loanCounts[mediaId]} emprunt(s) en cours`
          });
        }
      }

      return trendingMedia;

    } catch (error) {
      console.error('Erreur lors de l\'obtention des médias tendances:', error);
      return [];
    }
  }

  /**
   * Obtenir les nouveautés
   */
  async getNewArrivals(limit = 10) {
    try {
      const allMedia = await this.getAllMedia();

      // Trier par date d'ajout
      const sortedMedia = allMedia
        .filter(m => m.added_date)
        .sort((a, b) => new Date(b.added_date) - new Date(a.added_date));

      return sortedMedia.slice(0, limit).map(media => ({
        media,
        score: 1.0,
        reason: 'Nouveauté: ajouté récemment'
      }));

    } catch (error) {
      console.error('Erreur lors de l\'obtention des nouveautés:', error);
      return [];
    }
  }

  /**
   * Obtenir des recommandations similaires à un média
   */
  async getSimilarMedia(mediaId, limit = 5) {
    try {
      const media = await this.getMediaById(mediaId);
      if (!media) {
        return [];
      }

      const allMedia = await this.getAllMedia();
      
      // Calculer la similitude avec tous les autres médias
      const similarMedia = [];
      
      for (const otherMedia of allMedia) {
        if (otherMedia.id === media.id) continue;
        
        const similarity = await this.calculateMediaSimilarity(media, otherMedia);
        if (similarity > 0.3) {
          similarMedia.push({
            media: otherMedia,
            score: similarity,
            reason: `Similaire à ${media.title}`
          });
        }
      }

      // Trier par score de similitude
      return similarMedia
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    } catch (error) {
      console.error('Erreur lors de l\'obtention des médias similaires:', error);
      return [];
    }
  }

  /**
   * Calculer la similitude entre deux médias
   */
  async calculateMediaSimilarity(media1, media2) {
    const similarities = [];

    // Similitude par type
    const typeSimilarity = media1.type_id === media2.type_id ? 1.0 : 0.0;
    similarities.push(typeSimilarity);

    // Similitude par année
    const year1 = media1.release_year || 0;
    const year2 = media2.release_year || 0;
    const yearDiff = Math.abs(year1 - year2);
    const yearSimilarity = 1 - Math.min(yearDiff / 50, 1);
    similarities.push(yearSimilarity);

    // Similitude par catégories
    const categories1 = await this.getMediaCategories(media1.id);
    const categories2 = await this.getMediaCategories(media2.id);
    
    const commonCategories = categories1.filter(cat1 => 
      categories2.some(cat2 => cat2.id === cat1.id)
    );
    const categorySimilarity = categories1.length > 0 && categories2.length > 0 
      ? commonCategories.length / Math.max(categories1.length, categories2.length)
      : 0;
    similarities.push(categorySimilarity);

    // Similitude par personnes (réalisateur, acteurs)
    const persons1 = await this.getMediaPersons(media1.id);
    const persons2 = await this.getMediaPersons(media2.id);
    
    const commonPersons = persons1.filter(p1 => 
      persons2.some(p2 => p2.id === p1.id)
    );
    const personSimilarity = persons1.length > 0 && persons2.length > 0
      ? commonPersons.length / Math.max(persons1.length, persons2.length)
      : 0;
    similarities.push(personSimilarity);

    // Retourner la moyenne des similarités
    return similarities.reduce((a, b) => a + b, 0) / similarities.length;
  }

  /**
   * Supprimer les doublons
   */
  removeDuplicates(recommendations) {
    const seen = new Set();
    return recommendations.filter(item => {
      const key = item.media.id;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Méthodes utilitaires pour accéder à la base de données

  async getUser(userId) {
    const response = await this.db.getUsers();
    return response.success ? response.data.find(u => u.id === userId) : null;
  }

  async getUserLoans(userId) {
    const response = await this.db.getLoans({ userId });
    return response.success ? response.data : [];
  }

  async getAllUsers() {
    const response = await this.db.getUsers();
    return response.success ? response.data : [];
  }

  async getAllMedia() {
    const response = await this.db.getMedia();
    return response.success ? response.data : [];
  }

  async getAllLoans() {
    const response = await this.db.getLoans();
    return response.success ? response.data : [];
  }

  async getMediaById(mediaId) {
    const response = await this.db.getMediaById(mediaId);
    return response.success ? response.data : null;
  }

  async getBorrowedMedia(loans) {
    const mediaIds = loans.map(loan => loan.media_id);
    const allMedia = await this.getAllMedia();
    return allMedia.filter(media => mediaIds.includes(media.id));
  }

  async getMediaCategories(mediaId) {
    const response = await this.db.query({
      sql: `SELECT c.* FROM media_categories mc JOIN categories c ON mc.category_id = c.id WHERE mc.media_id = ?`,
      params: [mediaId]
    });
    return response.success ? response.data : [];
  }

  async getMediaPersons(mediaId) {
    const response = await this.db.query({
      sql: `SELECT p.* FROM media_persons mp JOIN persons p ON mp.person_id = p.id WHERE mp.media_id = ?`,
      params: [mediaId]
    });
    return response.success ? response.data : [];
  }

  async getMediaByCategory(categoryId) {
    const response = await this.db.query({
      sql: `SELECT m.* FROM media_categories mc JOIN media m ON mc.media_id = m.id WHERE mc.category_id = ?`,
      params: [categoryId]
    });
    return response.success ? response.data : [];
  }

  async getMediaLoans(mediaId) {
    const response = await this.db.getLoans({ mediaId });
    return response.success ? response.data : [];
  }

  getMediaTypeLabel(typeId) {
    const types = {
      1: 'DVD',
      2: 'Blu-ray',
      3: 'CD',
      4: 'Vinyl'
    };
    return types[typeId] || 'Inconnu';
  }

  /**
   * Exporter une instance du moteur
   */
  static async create(database) {
    const engine = new RecommendationEngine(database);
    return engine;
  }
}

// Exporter un singleton
let recommendationEngineInstance = null;

export const getRecommendationEngine = async (database) => {
  if (!recommendationEngineInstance) {
    recommendationEngineInstance = await RecommendationEngine.create(database);
  }
  return recommendationEngineInstance;
};

export default RecommendationEngine;
