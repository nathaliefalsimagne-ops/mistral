/**
 * Service de reconnaissance visuelle pour Médiathèque NATAN
 * 
 * Ce module gère la reconnaissance d'images de disques et jaquettes
 * en utilisant TensorFlow.js.
 */

class RecognitionService {
  constructor() {
    this.model = null;
    this.tf = null;
    this.isLoaded = false;
    this.config = {
      model: {
        // MobileNet pour la classification d'images
        name: 'mobilenet',
        version: 'v1',
        alpha: 1.0,
        size: 224
      },
      // Modèle personnalisé pour la reconnaissance de disques
      customModel: null,
      confidenceThreshold: 0.7
    };
  }

  /**
   * Initialiser le service
   */
  async initialize(config = {}) {
    try {
      this.config = { ...this.config, ...config };
      
      // Charger TensorFlow.js
      this.tf = await import('@tensorflow/tfjs');
      
      // Vérifier le backend
      if (!this.tf.getBackend()) {
        await this.tf.setBackend('cpu');
      }
      
      // Charger MobileNet
      const mobilenet = await import('@tensorflow-models/mobilenet');
      this.model = await mobilenet.load({
        version: this.config.model.version,
        alpha: this.config.model.alpha
      });
      
      this.isLoaded = true;
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service de reconnaissance:', error);
      return false;
    }
  }

  /**
   * Reconnaitre une image
   * @param {HTMLImageElement|HTMLCanvasElement|string} image - Image à analyser
   * @returns {Promise<Array>} - Liste des prédictions
   */
  async recognizeImage(image) {
    if (!this.isLoaded) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Service de reconnaissance non initialisé');
      }
    }

    try {
      let imageElement;
      
      if (typeof image === 'string') {
        // URL de l'image
        imageElement = new Image();
        await new Promise((resolve, reject) => {
          imageElement.onload = resolve;
          imageElement.onerror = reject;
          imageElement.src = image;
        });
      } else if (image instanceof HTMLImageElement || image instanceof HTMLCanvasElement) {
        imageElement = image;
      } else {
        throw new Error('Image non valide');
      }

      // Prétraiter l'image
      const tensor = this.tf.browser.fromPixels(imageElement)
        .resizeNearestNeighbor([this.config.model.size, this.config.model.size])
        .toFloat();
      
      // Normaliser
      const normalized = tensor.div(this.tf.scalar(255.0));
      
      // Ajouter une dimension batch
      const batched = normalized.expandDims(0);
      
      // Effectuer la prédiction
      const predictions = await this.model.predict(batched);
      const data = await predictions.data();
      
      // Obtenir les labels MobileNet
      const labels = await this.getLabels();
      
      // Obtenir les top prédictions
      const topPredictions = Array.from(data)
        .map((value, index) => ({
          label: labels[index],
          probability: value,
          confidence: value * 100
        }))
        .sort((a, b) => b.probability - a.probability)
        .filter(p => p.confidence >= this.config.confidenceThreshold * 100);
      
      return topPredictions;

    } catch (error) {
      console.error('Erreur lors de la reconnaissance:', error);
      throw error;
    }
  }

  /**
   * Reconnaitre un disque depuis une image
   * @param {HTMLImageElement|HTMLCanvasElement|string} image - Image du disque
   * @returns {Promise<Object>} - Résultat de la reconnaissance
   */
  async recognizeDisk(image) {
    try {
      // Pour l'instant, on utilise MobileNet pour la classification générale
      const predictions = await this.recognizeImage(image);
      
      // Filtrer les prédictions pertinentes pour les disques
      const diskRelated = predictions.filter(p => 
        p.label.toLowerCase().includes('cd') ||
        p.label.toLowerCase().includes('dvd') ||
        p.label.toLowerCase().includes('disc') ||
        p.label.toLowerCase().includes('blu') ||
        p.label.toLowerCase().includes('ray')
      );
      
      if (diskRelated.length > 0) {
        return {
          type: diskRelated[0].label,
          confidence: diskRelated[0].confidence,
          allPredictions: predictions
        };
      }
      
      return {
        type: 'unknown',
        confidence: predictions[0]?.confidence || 0,
        allPredictions: predictions
      };

    } catch (error) {
      console.error('Erreur lors de la reconnaissance du disque:', error);
      throw error;
    }
  }

  /**
   * Reconnaitre une jaquette depuis une image
   * @param {HTMLImageElement|HTMLCanvasElement|string} image - Image de la jaquette
   * @returns {Promise<Object>} - Résultat de la reconnaissance
   */
  async recognizeJacket(image) {
    try {
      const predictions = await this.recognizeImage(image);
      
      // Pour une jaquette, on cherche des éléments comme 'poster', 'cover', 'movie', etc.
      const jacketRelated = predictions.filter(p => 
        p.label.toLowerCase().includes('poster') ||
        p.label.toLowerCase().includes('cover') ||
        p.label.toLowerCase().includes('movie') ||
        p.label.toLowerCase().includes('film')
      );
      
      if (jacketRelated.length > 0) {
        return {
          type: 'jacket',
          confidence: jacketRelated[0].confidence,
          allPredictions: predictions
        };
      }
      
      return {
        type: 'unknown',
        confidence: predictions[0]?.confidence || 0,
        allPredictions: predictions
      };

    } catch (error) {
      console.error('Erreur lors de la reconnaissance de la jaquette:', error);
      throw error;
    }
  }

  /**
   * Extraire le texte d'une image (OCR)
   * @param {HTMLImageElement|HTMLCanvasElement|string} image - Image à analyser
   * @returns {Promise<string>} - Texte extrait
   */
  async extractText(image) {
    try {
      // Pour l'instant, on utilise Tesseract.js si disponible
      // Sinon, on retourne une erreur
      
      if (typeof window.Tesseract === 'undefined') {
        throw new Error('Tesseract.js non chargé. Veuillez vérifier que la bibliothèque est importée.');
      }

      let imageElement;
      
      if (typeof image === 'string') {
        imageElement = new Image();
        await new Promise((resolve, reject) => {
          imageElement.onload = resolve;
          imageElement.onerror = reject;
          imageElement.src = image;
        });
      } else {
        imageElement = image;
      }

      const { data: { text } } = await window.Tesseract.recognize(
        imageElement,
        'fra+eng', // Langues: français + anglais
        {
          logger: m => console.log(m)
        }
      );

      return text;

    } catch (error) {
      console.error('Erreur lors de l\'extraction du texte:', error);
      throw error;
    }
  }

  /**
   * Obtenir les labels MobileNet
   */
  async getLabels() {
    if (this.labels) {
      return this.labels;
    }

    try {
      const response = await fetch('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0_224/labels.json');
      this.labels = await response.json();
      return this.labels;
    } catch (error) {
      console.error('Erreur lors du chargement des labels:', error);
      // Retourner des labels par défaut
      return Array(1000).fill('').map((_, i) => `Class ${i}`);
    }
  }

  /**
   * Vérifier si le service est disponible
   */
  isAvailable() {
    return this.isLoaded && !!this.tf && !!this.model;
  }

  /**
   * Libérer les ressources
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isLoaded = false;
  }

  /**
   * Exporter une instance du service
   */
  static async create(config = {}) {
    const service = new RecognitionService();
    await service.initialize(config);
    return service;
  }
}

// Exporter un singleton
let recognitionServiceInstance = null;

export const getRecognitionService = async (config = {}) => {
  if (!recognitionServiceInstance) {
    recognitionServiceInstance = await RecognitionService.create(config);
  }
  return recognitionServiceInstance;
};

export default RecognitionService;
