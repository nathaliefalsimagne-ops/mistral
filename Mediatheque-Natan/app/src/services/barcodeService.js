/**
 * Service de scan de code-barres pour Médiathèque NATAN
 * 
 * Ce module gère le scan et la détection des codes-barres
 * en utilisant la bibliothèque ZXing.
 */

class BarcodeService {
  constructor() {
    this.codeReader = null;
    this.stream = null;
    this.isScanning = false;
    this.config = {
      formats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39', 'QR_CODE'],
      tryHarder: true,
      numOfThreads: 4
    };
  }

  /**
   * Initialiser le service
   */
  async initialize(config = {}) {
    try {
      // Charger dynamiquement @zxing/browser
      const { BrowserBarcodeReader } = await import('@zxing/browser');
      
      this.codeReader = new BrowserBarcodeReader();
      this.config = { ...this.config, ...config };
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du service de code-barres:', error);
      return false;
    }
  }

  /**
   * Démarrer le scan depuis la caméra
   * @param {HTMLVideoElement} videoElement - Élément vidéo pour l'aperçu
   * @param {Function} onResult - Callback lors de la détection d'un code
   * @param {Function} onError - Callback en cas d'erreur
   * @returns {Promise<void>}
   */
  async startScanning(videoElement, onResult, onError) {
    if (this.isScanning) {
      console.warn('Le scan est déjà en cours');
      return;
    }

    if (!this.codeReader) {
      const initialized = await this.initialize();
      if (!initialized) {
        onError(new Error('Impossible d\'initialiser le service de code-barres'));
        return;
      }
    }

    try {
      this.isScanning = true;
      
      // Arrêter le stream actuel s'il existe
      this.stopScanning();

      // Obtenir le stream vidéo
      const constraints = {
        video: {
          facingMode: 'environment', // Caméra arrière par défaut
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;

      if (videoElement) {
        videoElement.srcObject = stream;
      }

      // Attendre que la vidéo soit prête
      await new Promise((resolve) => {
        if (videoElement) {
          videoElement.onloadedmetadata = resolve;
        } else {
          resolve();
        }
      });

      // Démarrer la détection continue
      const scanInterval = setInterval(async () => {
        if (!this.isScanning) {
          clearInterval(scanInterval);
          return;
        }

        try {
          const result = await this.codeReader.decodeFromVideoDevice(
            null,
            videoElement,
            (result, error) => {
              if (result) {
                this.isScanning = false;
                clearInterval(scanInterval);
                onResult(result.getText(), result.getFormat());
              }
              if (error && error.name !== 'NotFoundException') {
                console.error('Erreur de scan:', error);
              }
            }
          );

          if (result) {
            this.isScanning = false;
            clearInterval(scanInterval);
            onResult(result.getText(), result.getFormat());
          }
        } catch (error) {
          if (error.name !== 'NotFoundException') {
            console.error('Erreur lors du scan:', error);
            onError(error);
          }
        }
      }, 500);

    } catch (error) {
      console.error('Erreur lors du démarrage du scan:', error);
      this.isScanning = false;
      onError(error);
    }
  }

  /**
   * Arrêter le scan
   */
  stopScanning() {
    this.isScanning = false;
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.codeReader) {
      this.codeReader.reset();
    }
  }

  /**
   * Scanner une image statique
   * @param {HTMLImageElement|HTMLCanvasElement|string} source - Source de l'image
   * @returns {Promise<{text: string, format: string}>}
   */
  async scanFromImage(source) {
    if (!this.codeReader) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Service de code-barres non initialisé');
      }
    }

    try {
      let imageElement;
      
      if (typeof source === 'string') {
        // URL de l'image
        imageElement = new Image();
        await new Promise((resolve, reject) => {
          imageElement.onload = resolve;
          imageElement.onerror = reject;
          imageElement.src = source;
        });
      } else if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) {
        imageElement = source;
      } else {
        throw new Error('Source d\'image non valide');
      }

      const result = await this.codeReader.decodeFromImage(imageElement);
      return {
        text: result.getText(),
        format: result.getFormat()
      };
    } catch (error) {
      console.error('Erreur lors du scan de l\'image:', error);
      throw error;
    }
  }

  /**
   * Scanner depuis un fichier
   * @param {File} file - Fichier image
   * @returns {Promise<{text: string, format: string}>}
   */
  async scanFromFile(file) {
    if (!this.codeReader) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('Service de code-barres non initialisé');
      }
    }

    try {
      const imageUrl = URL.createObjectURL(file);
      const result = await this.scanFromImage(imageUrl);
      URL.revokeObjectURL(imageUrl);
      return result;
    } catch (error) {
      console.error('Erreur lors du scan du fichier:', error);
      throw error;
    }
  }

  /**
   * Basculer la caméra (avant/arrière)
   * @param {string} facingMode - 'user' ou 'environment'
   */
  async toggleCamera(facingMode) {
    if (!this.isScanning) return;

    try {
      // Arrêter le stream actuel
      this.stopScanning();

      // Redémarrer avec la nouvelle caméra
      const constraints = {
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;

      // Reconnecter au code reader (sera géré par startScanning)
      this.isScanning = true;

    } catch (error) {
      console.error('Erreur lors du basculement de caméra:', error);
      throw error;
    }
  }

  /**
   * Activer/Désactiver la lampe torche
   * @param {boolean} enable - Activer ou désactiver
   */
  async toggleTorch(enable) {
    if (!this.stream) return;

    try {
      const track = this.stream.getVideoTracks()[0];
      if (track) {
        await track.applyConstraints({
          advanced: [{ torch: enable }]
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'activation de la lampe torche:', error);
      throw error;
    }
  }

  /**
   * Vérifier si le service est disponible
   */
  isAvailable() {
    return !!this.codeReader && !!window.navigator?.mediaDevices?.getUserMedia;
  }

  /**
   * Obtenir les formats supportés
   */
  getSupportedFormats() {
    return this.config.formats;
  }

  /**
   * Exporter une instance du service
   */
  static async create(config = {}) {
    const service = new BarcodeService();
    await service.initialize(config);
    return service;
  }
}

// Exporter un singleton
let barcodeServiceInstance = null;

export const getBarcodeService = async (config = {}) => {
  if (!barcodeServiceInstance) {
    barcodeServiceInstance = await BarcodeService.create(config);
  }
  return barcodeServiceInstance;
};

export default BarcodeService;
