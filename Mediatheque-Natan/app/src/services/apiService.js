/**
 * Service API pour Médiathèque NATAN
 * 
 * Ce module gère les appels aux APIs externes (TMDB, MusicBrainz, etc.)
 */

import axios from 'axios';

class ApiService {
  constructor() {
    this.config = {
      tmdb: {
        baseUrl: 'https://api.themoviedb.org/3',
        apiKey: null,
        language: 'fr-FR'
      },
      musicBrainz: {
        baseUrl: 'https://musicbrainz.org/ws/2',
        userAgent: 'Mediatheque-NATAN/1.0.0 (nathalie@natan-consulting.com)'
      },
      cache: {
        enabled: true,
        ttl: 86400000 // 24 heures en ms
      }
    };
    
    this.cache = new Map();
  }

  /**
   * Initialiser avec la configuration
   */
  initialize(config = {}) {
    this.config = {
      ...this.config,
      ...config,
      tmdb: { ...this.config.tmdb, ...config.tmdb },
      musicBrainz: { ...this.config.musicBrainz, ...config.musicBrainz },
      cache: { ...this.config.cache, ...config.cache }
    };
  }

  /**
   * Rechercher dans TMDB
   */
  async searchTMDB(query, type = 'movie', options = {}) {
    if (!this.config.tmdb.apiKey) {
      return { success: false, error: 'Clé API TMDB non configurée' };
    }

    try {
      // Vérifier le cache
      const cacheKey = `tmdb:${type}:${query}`;
      if (this.config.cache.enabled && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cache.ttl) {
          return { success: true, ...cached.data };
        }
        this.cache.delete(cacheKey);
      }

      const params = {
        api_key: this.config.tmdb.apiKey,
        query,
        language: this.config.tmdb.language,
        page: 1,
        include_adult: false,
        ...options
      };

      const endpoint = type === 'movie' ? '/search/movie' : 
                      type === 'tv' ? '/search/tv' : 
                      type === 'person' ? '/search/person' : '/search/multi';

      const response = await axios.get(`${this.config.tmdb.baseUrl}${endpoint}`, { params });

      const results = response.data.results.map(item => ({
        id: item.id,
        title: item.title || item.name,
        original_title: item.original_title || item.original_name,
        release_date: item.release_date || item.first_air_date,
        release_year: item.release_date ? new Date(item.release_date).getFullYear() : null,
        runtime: item.runtime,
        overview: item.overview,
        vote_average: item.vote_average,
        vote_count: item.vote_count,
        poster_path: item.poster_path,
        backdrop_path: item.backdrop_path,
        genre_ids: item.genre_ids,
        type: type
      }));

      // Mettre en cache
      if (this.config.cache.enabled) {
        this.cache.set(cacheKey, {
          data: { results },
          timestamp: Date.now()
        });
      }

      return { success: true, results };

    } catch (error) {
      console.error('Erreur lors de la recherche TMDB:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de la recherche TMDB' 
      };
    }
  }

  /**
   * Obtenir les détails d'un film/série depuis TMDB
   */
  async getTMDBDetails(id, type = 'movie') {
    if (!this.config.tmdb.apiKey) {
      return { success: false, error: 'Clé API TMDB non configurée' };
    }

    try {
      // Vérifier le cache
      const cacheKey = `tmdb:details:${type}:${id}`;
      if (this.config.cache.enabled && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cache.ttl) {
          return { success: true, ...cached.data };
        }
        this.cache.delete(cacheKey);
      }

      const endpoint = type === 'movie' ? `/movie/${id}` : 
                      type === 'tv' ? `/tv/${id}` : 
                      `/person/${id}`;

      const params = {
        api_key: this.config.tmdb.apiKey,
        language: this.config.tmdb.language,
        append_to_response: 'credits,images,videos,release_dates'
      };

      const response = await axios.get(`${this.config.tmdb.baseUrl}${endpoint}`, { params });
      const data = response.data;

      const result = {
        id: data.id,
        imdb_id: data.imdb_id,
        title: data.title || data.name,
        original_title: data.original_title || data.original_name,
        release_date: data.release_date || data.first_air_date,
        release_year: data.release_date ? new Date(data.release_date).getFullYear() : null,
        runtime: data.runtime || (data.episodes?.[0]?.runtime || 0),
        overview: data.overview,
        vote_average: data.vote_average,
        vote_count: data.vote_count,
        poster_path: data.poster_path,
        backdrop_path: data.backdrop_path,
        genres: data.genres?.map(g => g.name) || [],
        production_companies: data.production_companies?.map(c => c.name) || [],
        production_countries: data.production_countries?.map(c => c.name) || [],
        spoken_languages: data.spoken_languages?.map(l => l.name) || [],
        
        // Directeurs/réalisateurs
        directors: data.credits?.crew?.filter(c => c.job === 'Director')?.map(c => c.name) || [],
        
        // Acteurs principaux
        cast: data.credits?.cast?.slice(0, 10)?.map(c => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path
        })) || [],
        
        // Images
        images: data.images?.posters?.slice(0, 5)?.map(i => i.file_path) || [],
        
        // Type
        type: type
      };

      // Mettre en cache
      if (this.config.cache.enabled) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      return { success: true, ...result };

    } catch (error) {
      console.error('Erreur lors de la récupération des détails TMDB:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de la récupération des détails TMDB' 
      };
    }
  }

  /**
   * Rechercher dans MusicBrainz
   */
  async searchMusicBrainz(query, type = 'recording', options = {}) {
    try {
      // Vérifier le cache
      const cacheKey = `musicbrainz:${type}:${query}`;
      if (this.config.cache.enabled && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cache.ttl) {
          return { success: true, ...cached.data };
        }
        this.cache.delete(cacheKey);
      }

      const params = {
        query,
        fmt: 'json',
        limit: 10,
        ...options
      };

      const response = await axios.get(`${this.config.musicBrainz.baseUrl}/${type}`, {
        params,
        headers: {
          'User-Agent': this.config.musicBrainz.userAgent
        }
      });

      const results = response.data[type + 's']?.map(item => ({
        id: item.id,
        title: item.title,
        artist: item['artist-credit']?.[0]?.artist?.name || item['artist-credit']?.[0]?.name,
        release_date: item.date,
        release_year: item.date ? new Date(item.date).getFullYear() : null,
        duration: item.length ? this.parseDuration(item.length) : null,
        type: type
      })) || [];

      // Mettre en cache
      if (this.config.cache.enabled) {
        this.cache.set(cacheKey, {
          data: { results },
          timestamp: Date.now()
        });
      }

      return { success: true, results };

    } catch (error) {
      console.error('Erreur lors de la recherche MusicBrainz:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de la recherche MusicBrainz' 
      };
    }
  }

  /**
   * Obtenir les détails d'un enregistrement depuis MusicBrainz
   */
  async getMusicBrainzDetails(id, type = 'recording') {
    try {
      // Vérifier le cache
      const cacheKey = `musicbrainz:details:${type}:${id}`;
      if (this.config.cache.enabled && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.config.cache.ttl) {
          return { success: true, ...cached.data };
        }
        this.cache.delete(cacheKey);
      }

      const response = await axios.get(`${this.config.musicBrainz.baseUrl}/${type}/${id}`, {
        params: {
          fmt: 'json',
          inc: 'artists+recordings+releases+genres+tags+aliases'
        },
        headers: {
          'User-Agent': this.config.musicBrainz.userAgent
        }
      });

      const data = response.data;

      const result = {
        id: data.id,
        title: data.title,
        artist: data['artist-credit']?.[0]?.artist?.name || data['artist-credit']?.[0]?.name,
        artists: data['artist-credit']?.map(ac => ac.artist?.name || ac.name) || [],
        release_date: data.date,
        release_year: data.date ? new Date(data.date).getFullYear() : null,
        duration: data.length ? this.parseDuration(data.length) : null,
        genres: data.genres?.map(g => g.name) || [],
        tags: data.tags?.map(t => t.name) || [],
        
        // Pour les releases
        tracks: data['track-list']?.[0]?.track?.map(t => ({
          id: t.id,
          title: t.title,
          duration: t.length ? this.parseDuration(t.length) : null,
          number: t.number
        })) || [],
        
        // Type
        type: type
      };

      // Mettre en cache
      if (this.config.cache.enabled) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      return { success: true, ...result };

    } catch (error) {
      console.error('Erreur lors de la récupération des détails MusicBrainz:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de la récupération des détails MusicBrainz' 
      };
    }
  }

  /**
   * Analyser la durée MusicBrainz (format ISO 8601)
   */
  parseDuration(duration) {
    if (!duration) return null;
    
    // Format: PT#M#S (ex: PT4M12S = 4 minutes 12 secondes)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return null;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Effacer le cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Obtenir la taille du cache
   */
  getCacheSize() {
    return this.cache.size;
  }

  /**
   * Exporter une instance du service
   */
  static create(config = {}) {
    const service = new ApiService();
    service.initialize(config);
    return service;
  }
}

// Exporter un singleton
let apiServiceInstance = null;

export const getApiService = (config = {}) => {
  if (!apiServiceInstance) {
    apiServiceInstance = ApiService.create(config);
  }
  return apiServiceInstance;
};

export default ApiService;
