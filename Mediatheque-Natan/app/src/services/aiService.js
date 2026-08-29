/**
 * Service IA pour Médiathèque NATAN
 * 
 * Ce module gère l'intégration avec Ollama pour les fonctionnalités d'IA locale.
 * Modèle par défaut : mistral:7b (optimisé pour le français)
 * 
 * Fonctionnalités :
 * - Chat conversationnel avec l'assistant
 * - Recherche naturelle dans la médiathèque
 * - Recommandations intelligentes basées sur le contenu
 * - Analyse et génération de texte
 */

import axios from 'axios';

/**
 * Configuration par défaut pour Ollama
 */
const DEFAULT_CONFIG = {
  baseUrl: 'http://localhost:11434',
  model: 'mistral:7b',
  timeout: 120000, // 2 minutes
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  max_tokens: 2048,
  stop: ['<|im_end|>', '<|im_start|>'],
  stream: true,
  keep_alive: '5m',
  // Paramètres spécifiques à l'application
  app: {
    // Contexte système pour Médiathèque NATAN
    systemPrompt: `Tu es Médiathèque NATAN, un assistant intelligent spécialisé dans la gestion de médias physiques (CDs, DVDs, Blu-rays). 
Tu réponds toujours en français de manière claire, concise et utile.

Règles :
- Sois précis et factuel
- Utilise un ton professionnel mais amical
- Si tu ne connais pas la réponse, dis-le honnêtement
- Adapte tes réponses au contexte de la gestion de médiathèque
- Pour les recherches, retourne des résultats structurés (JSON si demandé)
- Pour les recommandations, justifie tes suggestions`,
    
    // Prompt pour la recherche naturelle
    searchPrompt: `Analyse la requête suivante de l'utilisateur et génère une requête de recherche SQL optimisée pour une base de données de médiathèque.
Retourne UNIQUEMENT la requête SQL entre balises [SQL] ou des mots-clés entre balises [KEYWORDS] si une recherche simple suffit.

Requête utilisateur: "{query}"

Exemples:
- "films d'action des années 2020" -> [KEYWORDS] action,2020,film
- "tous les DVDs empruntés par Jean" -> [SQL] SELECT * FROM media WHERE type_id = 2 AND state_id = 3 AND borrowed_by = 'Jean'
- "quels sont mes médias les plus populaires" -> [SQL] SELECT * FROM media ORDER BY popularity DESC LIMIT 10

Important: Ne retourne QUE la requête SQL ou les mots-clés, sans explication.`,
    
    // Prompt pour les recommandations
    recommendationPrompt: `En tant qu'expert en médias, analyse le profil suivant et recommande des médias pertinents.

Profil utilisateur:
- Historique récent: {history}
- Préférences: {preferences}
- Médias disponibles: {availableMedia}

Retourne une liste de 5-10 recommandations avec justification pour chaque.
Format JSON:
{{
  "recommendations": [
    {{
      "title": "Nom du média",
      "type": "film|série|musique",
      "reason": "Pourquoi cette recommandation",
      "score": 0.0-1.0
    }}
  ]
}}`,
    
    // Prompt pour l'analyse de médias
    analysisPrompt: `Analyse le média suivant et extrais les informations pertinentes pour une médiathèque.

Média: {mediaInfo}

Retourne une analyse structurée en JSON avec:
- titre
- type (film, série, musique, etc.)
- année
- réalisateur/artiste
- catégories/genres
- durée
- description
- mots-clés pour la recherche`
  }
};

/**
 * Classe principale du service IA
 */
class AiService {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.conversationHistory = [];
    this.isGenerating = false;
    this.abortController = null;
  }

  /**
   * Initialiser le service avec une configuration
   */
  initialize(config = {}) {
    this.config = {
      ...this.config,
      ...config,
      app: { ...this.config.app, ...config.app }
    };
    
    // Nettoyer l'historique si le modèle change
    if (config.model && config.model !== this.config.model) {
      this.clearConversation();
    }
  }

  /**
   * Vérifier si Ollama est disponible
   */
  async checkOllamaStatus() {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
        timeout: 5000
      });
      return {
        success: true,
        running: true,
        models: response.data.models || [],
        version: response.data.version || null
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        return {
          success: false,
          running: false,
          error: 'Ollama ne semble pas démarré. Lancez Ollama avec `ollama serve` ou `ollama run mistral:7b`'
        };
      }
      return {
        success: false,
        running: false,
        error: error.message || 'Erreur de connexion à Ollama'
      };
    }
  }

  /**
   * Lister les modèles disponibles localement
   */
  async listModels() {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
        timeout: this.config.timeout
      });
      
      return {
        success: true,
        models: response.data.models.map(m => ({
          name: m.name,
          size: this.formatBytes(m.size),
          digest: m.digest.substring(0, 12),
          modified_at: m.modified_at
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Impossible de lister les modèles'
      };
    }
  }

  /**
   * Tirer (télécharger) un modèle
   */
  async pullModel(modelName) {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/pull`,
        { name: modelName },
        {
          timeout: this.config.timeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      return {
        success: true,
        message: `Modèle ${modelName} téléchargé avec succès`,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || `Échec du téléchargement du modèle ${modelName}`
      };
    }
  }

  /**
   * Supprimer un modèle
   */
  async deleteModel(modelName) {
    try {
      await axios.delete(`${this.config.baseUrl}/api/delete`, {
        data: { name: modelName },
        timeout: this.config.timeout
      });
      
      return {
        success: true,
        message: `Modèle ${modelName} supprimé`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || `Échec de la suppression du modèle ${modelName}`
      };
    }
  }

  /**
   * Générer une réponse de chat (mode streaming)
   * @param {string} message - Message de l'utilisateur
   * @param {Function} onChunk - Callback pour chaque chunk de réponse
   * @param {Function} onComplete - Callback à la fin
   * @param {Function} onError - Callback en cas d'erreur
   */
  async chat(message, onChunk, onComplete, onError) {
    if (this.isGenerating) {
      if (onError) onError({ error: 'Une génération est déjà en cours' });
      return;
    }

    this.isGenerating = true;
    this.abortController = new AbortController();

    try {
      // Ajouter à l'historique
      this.addToConversation('user', message);
      
      // Construire le prompt avec l'historique
      const prompt = this.buildChatPrompt(message);

      const response = await axios.post(
        `${this.config.baseUrl}/api/chat`,
        {
          model: this.config.model,
          messages: this.getConversationMessages(),
          stream: true,
          options: {
            temperature: this.config.temperature,
            top_p: this.config.top_p,
            top_k: this.config.top_k,
            num_predict: this.config.max_tokens
          }
        },
        {
          timeout: this.config.timeout,
          responseType: 'stream',
          signal: this.abortController.signal,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const reader = response.data.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data:')) {
            try {
              const jsonData = JSON.parse(line.substring(5));
              const content = jsonData.message?.content || jsonData.response || '';
              
              if (content) {
                fullResponse += content;
                if (onChunk) onChunk(content);
              }
              
              // Vérifier si c'est la fin
              if (jsonData.done) {
                this.addToConversation('assistant', fullResponse);
                if (onComplete) onComplete(fullResponse);
              }
            } catch (e) {
              console.error('Erreur de parsing du chunk:', e);
            }
          }
        }
      }

    } catch (error) {
      console.error('Erreur lors du chat:', error);
      if (onError) onError({ error: error.message || 'Erreur lors de la génération' });
    } finally {
      this.isGenerating = false;
      this.abortController = null;
    }
  }

  /**
   * Générer une réponse simple (sans streaming)
   */
  async generate(prompt, options = {}) {
    try {
      const response = await axios.post(
        `${this.config.baseUrl}/api/generate`,
        {
          model: this.config.model,
          prompt: this.buildSystemPrompt(prompt),
          stream: false,
          options: {
            temperature: options.temperature || this.config.temperature,
            top_p: options.top_p || this.config.top_p,
            top_k: options.top_k || this.config.top_k,
            num_predict: options.max_tokens || this.config.max_tokens
          }
        },
        {
          timeout: this.config.timeout,
          headers: { 'Content-Type': 'application/json' }
        }
      );

      return {
        success: true,
        response: response.data.response,
        done: response.data.done
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la génération'
      };
    }
  }

  /**
   * Recherche naturelle dans la médiathèque
   * Convertit une requête en langage naturel en requête SQL ou mots-clés
   */
  async naturalLanguageSearch(query, mediaData = []) {
    try {
      // Construire le prompt avec le contexte des médias disponibles
      const mediaContext = mediaData.length > 0
        ? `\nMédias disponibles (échantillon): ${JSON.stringify(mediaData.slice(0, 10))}`
        : '';
      
      const prompt = this.config.app.searchPrompt
        .replace('{query}', query)
        .concat(mediaContext);

      const response = await this.generate(prompt, {
        temperature: 0.3, // Plus déterministe pour la recherche
        max_tokens: 512
      });

      if (!response.success) {
        return { success: false, error: response.error };
      }

      // Analyser la réponse pour extraire SQL ou mots-clés
      const result = this.parseSearchResponse(response.response);
      
      return {
        success: true,
        query: result.query,
        keywords: result.keywords,
        type: result.type,
        rawResponse: response.response
      };

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la recherche naturelle'
      };
    }
  }

  /**
   * Obtenir des recommandations intelligentes
   */
  async getRecommendations(userHistory = [], availableMedia = [], preferences = {}) {
    try {
      const prompt = this.config.app.recommendationPrompt
        .replace('{history}', JSON.stringify(userHistory.slice(0, 20)))
        .replace('{preferences}', JSON.stringify(preferences))
        .replace('{availableMedia}', JSON.stringify(availableMedia.slice(0, 50)));

      const response = await this.generate(prompt, {
        temperature: 0.8,
        max_tokens: 2048
      });

      if (!response.success) {
        return { success: false, error: response.error };
      }

      // Parser la réponse JSON
      try {
        const jsonStart = response.response.indexOf('{');
        const jsonEnd = response.response.lastIndexOf('}') + 1;
        const jsonStr = response.response.substring(jsonStart, jsonEnd);
        const recommendations = JSON.parse(jsonStr);
        
        return {
          success: true,
          recommendations: recommendations.recommendations || [],
          rawResponse: response.response
        };
      } catch (e) {
        // Si le parsing JSON échoue, retourner la réponse brute
        return {
          success: true,
          recommendations: [],
          rawResponse: response.response
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Erreur lors de la génération des recommandations'
      };
    }
  }

  /**
   * Analyser un média avec l'IA
   */
  async analyzeMedia(mediaInfo) {
    try {
      const prompt = this.config.app.analysisPrompt
        .replace('{mediaInfo}', JSON.stringify(mediaInfo));

      const response = await this.generate(prompt, {
        temperature: 0.3,
        max_tokens: 1024
      });

      if (!response.success) {
        return { success: false, error: response.error };
      }

      // Parser la réponse JSON
      try {
        const jsonStart = response.response.indexOf('{');
        const jsonEnd = response.response.lastIndexOf('}') + 1;
        const jsonStr = response.response.substring(jsonStart, jsonEnd);
        const analysis = JSON.parse(jsonStr);
        
        return {
          success: true,
          analysis,
          rawResponse: response.response
        };
      } catch (e) {
        return {
          success: true,
          analysis: null,
          rawResponse: response.response
        };
      }

    } catch (error) {
      return {
        success: false,
        error: error.message || 'Erreur lors de l\'analyse du média'
      };
    }
  }

  /**
   * Annuler la génération en cours
   */
  cancelGeneration() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      this.isGenerating = false;
      return true;
    }
    return false;
  }

  /**
   * Effacer l'historique de conversation
   */
  clearConversation() {
    this.conversationHistory = [];
  }

  /**
   * Ajouter un message à l'historique
   */
  addToConversation(role, content) {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
    
    // Limiter l'historique pour éviter la surcharge
    if (this.conversationHistory.length > 50) {
      this.conversationHistory = this.conversationHistory.slice(-30);
    }
  }

  /**
   * Obtenir les messages pour l'API Ollama
   */
  getConversationMessages() {
    // Ollama attend un format spécifique pour les messages
    return this.conversationHistory.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * Construire le prompt de chat avec le contexte système
   */
  buildChatPrompt(message) {
    // Le système prompt est géré séparément par Ollama via l'API /api/chat
    // On retourne juste le message utilisateur
    return message;
  }

  /**
   * Construire le prompt avec le contexte système (pour /api/generate)
   */
  buildSystemPrompt(prompt) {
    return `${this.config.app.systemPrompt}\n\n${prompt}`;
  }

  /**
   * Parser la réponse de recherche naturelle
   */
  parseSearchResponse(response) {
    // Vérifier si c'est du SQL
    const sqlMatch = response.match(/\[SQL\](.+?)(?:\n|$)/);
    if (sqlMatch) {
      return {
        type: 'sql',
        query: sqlMatch[1].trim(),
        keywords: []
      };
    }

    // Vérifier si c'est des mots-clés
    const keywordsMatch = response.match(/\[KEYWORDS\](.+?)(?:\n|$)/);
    if (keywordsMatch) {
      return {
        type: 'keywords',
        query: '',
        keywords: keywordsMatch[1].split(',').map(k => k.trim())
      };
    }

    // Sinon, essayer d'extraire automatiquement
    if (response.includes('SELECT') || response.includes('WHERE')) {
      return {
        type: 'sql',
        query: response.trim(),
        keywords: []
      };
    }

    // Par défaut, retourner comme mots-clés
    return {
      type: 'keywords',
      query: '',
      keywords: response.split(/[,\s]+/).filter(k => k.length > 2)
    };
  }

  /**
   * Formater les bytes en format lisible
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Définir la configuration
   */
  setConfig(config) {
    this.initialize(config);
  }

  /**
   * Exporter une instance du service
   */
  static create(config = {}) {
    const service = new AiService();
    service.initialize(config);
    return service;
  }
}

// Exporter un singleton
let aiServiceInstance = null;

export const getAiService = (config = {}) => {
  if (!aiServiceInstance) {
    aiServiceInstance = AiService.create(config);
  }
  return aiServiceInstance;
};

export default AiService;
