import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useDatabase } from '../contexts/DatabaseContext';
import {
  ArrowLeft,
  Camera,
  X,
  CheckCircle,
  AlertTriangle,
  Image as ImageIcon,
  RotateCcw,
  Flashlight,
  Search,
  Upload,
  Settings
} from 'lucide-react';

const VisualRecognition = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: showError } = useToast();
  const { searchMedia, addMedia } = useDatabase();

  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [modelLoaded, setModelLoaded] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Charger le modèle TensorFlow.js
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Charger TensorFlow.js
        const tf = await import('@tensorflow/tfjs');
        
        // Vérifier si WebGL est disponible
        if (!tf.getBackend()) {
          await tf.setBackend('cpu');
        }
        
        // Charger MobileNet (pour la classification d'images)
        const mobilenet = await import('@tensorflow-models/mobilenet');
        const model = await mobilenet.load();
        
        // Stocker le modèle
        window.tfModel = model;
        window.tf = tf;
        
        setModelLoaded(true);
        success('Modèle de reconnaissance chargé avec succès');
        
      } catch (err) {
        console.error('Erreur lors du chargement du modèle:', err);
        setError('Impossible de charger le modèle de reconnaissance. Vérifiez votre connexion Internet.');
      }
    };

    loadModel();

    // Nettoyer
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Démarrer la caméra
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setCapturedImage(null);
      setResults([]);

      // Arrêter le stream actuel s'il existe
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Obtenir le stream vidéo
      const constraints = {
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

    } catch (err) {
      console.error('Erreur lors du démarrage de la caméra:', err);
      setError(`Erreur: ${err.message}`);
      
      if (err.name === 'NotAllowedError') {
        setError('Permission refusée. Veuillez autoriser l\'accès à la caméra.');
      }
    }
  }, [cameraFacing, stream]);

  // Arrêter la caméra
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Capturer une image
  const captureImage = useCallback(() => {
    if (!videoRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Définir la taille du canvas
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const context = canvas.getContext('2d');
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    // Obtenir l'image en base64
    const imageData = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageData);
    
    stopCamera();
    setIsScanning(false);
    
    success('Image capturée ! Analyse en cours...');
  }, [stopCamera, success]);

  // Analyser l'image
  const analyzeImage = useCallback(async () => {
    if (!capturedImage || !modelLoaded) return;

    try {
      setIsProcessing(true);
      setResults([]);
      
      // Créer un élément image
      const img = new Image();
      img.src = capturedImage;
      
      // Attendre que l'image soit chargée
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      // Prétraiter l'image pour MobileNet
      const tensor = window.tf.browser.fromPixels(img)
        .resizeNearestNeighbor([224, 224])
        .toFloat();
      
      // Normaliser
      const normalized = tensor.div(window.tf.scalar(255.0));
      
      // Ajouter une dimension batch
      const batched = normalized.expandDims(0);
      
      // Effectuer la prédiction
      const predictions = await window.tfModel.predict(batched);
      const data = await predictions.data();
      
      // Obtenir les labels MobileNet
      const labels = await fetch('https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0_224/labels.json')
        .then(response => response.json());
      
      // Obtenir les top 5 prédictions
      const topPredictions = Array.from(data)
        .map((value, index) => ({
          label: labels[index],
          probability: value
        }))
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 5);
      
      setResults(topPredictions);
      
      // Rechercher dans la base de données
      const searchTerms = topPredictions.map(p => p.label.split(',')[0].split(' ')[0]);
      
      // Pour l'instant, on affiche juste les résultats
      success('Analyse terminée !');
      
    } catch (err) {
      console.error('Erreur lors de l\'analyse:', err);
      showError(`Erreur lors de l'analyse: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, modelLoaded, success, showError]);

  // Basculer la lampe torche
  const toggleTorch = useCallback(async () => {
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (track) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }]
        });
        setTorchOn(!torchOn);
      } catch (err) {
        console.error('Erreur lors de l\'activation de la lampe torche:', err);
        showError('Impossible d\'activer la lampe torche');
      }
    }
  }, [stream, torchOn, showError]);

  // Basculer la caméra
  const toggleCamera = useCallback(() => {
    setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment');
    // Redémarrer la caméra avec la nouvelle orientation
    setTimeout(() => {
      startCamera();
    }, 500);
  }, [startCamera]);

  // Recommencer
  const restart = useCallback(() => {
    setCapturedImage(null);
    setResults([]);
    setError(null);
    startCamera();
    setIsScanning(true);
  }, [startCamera]);

  // Charger une image depuis un fichier
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target.result);
        stopCamera();
        setIsScanning(false);
        success('Image chargée ! Analyse en cours...');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erreur lors du chargement du fichier:', err);
      showError(`Erreur lors du chargement: ${err.message}`);
    }
  }, [stopCamera, success, showError]);

  // Sélectionner un résultat
  const selectResult = useCallback((result) => {
    // Vérifier d'où vient la requête
    const params = new URLSearchParams(location.search);
    const from = params.get('from');
    
    if (from === 'add-media') {
      // Retourner à la page d'ajout avec le titre
      navigate(`/media/add?title=${encodeURIComponent(result.label)}`);
    } else {
      // Rechercher le média
      navigate(`/search?q=${encodeURIComponent(result.label)}`);
    }
  }, [navigate, location.search]);

  // Démarrer/arrêter le scan automatique
  useEffect(() => {
    if (isScanning && modelLoaded) {
      // Pour l'instant, on ne fait pas de scan automatique en continu
      // car c'est trop gourmand en ressources
      // On attend que l'utilisateur capture manuellement
    }
  }, [isScanning, modelLoaded]);

  // Démarrer la caméra au montage
  useEffect(() => {
    if (modelLoaded) {
      startCamera();
      setIsScanning(true);
    }
  }, [modelLoaded, startCamera]);

  // Nettoyer lors du démontage
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="space-y-lg">
      {/* En-tête */}
      <div className="flex items-center gap-md">
        <button
          onClick={() => navigate(-1)}
          className="p-sm rounded-full hover:bg-tertiary transition-colors"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Reconnaissance visuelle</h1>
          <p className="text-tertiary mt-xs">
            Identifiez un média en photographiant son disque ou sa jaquette
          </p>
        </div>
      </div>

      {/* Zone de capture */}
      <div className="bg-secondary rounded-xl p-lg">
        <div className="relative">
          {/* Message d'erreur */}
          {error && (
            <div className="bg-danger bg-opacity-10 text-danger p-md rounded-lg mb-md flex items-center gap-md">
              <AlertTriangle className="w-5 h-5" />
              <p>{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-danger hover:text-danger-light transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Prévisualisation de la caméra */}
          {capturedImage ? (
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <img
                src={capturedImage}
                alt="Capturée"
                className="w-full h-full object-contain"
              />
              
              {/* Contrôles */}
              <div className="absolute bottom-md left-0 right-0 flex justify-center gap-md">
                <button
                  onClick={restart}
                  className="bg-black bg-opacity-50 text-white p-sm rounded-full hover:bg-opacity-75 transition-colors"
                  title="Recommencer"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={analyzeImage}
                  disabled={isProcessing}
                  className="bg-accent text-white p-sm rounded-full hover:bg-accent-light transition-colors disabled:opacity-50"
                  title="Analyser"
                >
                  {isProcessing ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Canvas pour la capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Overlay de capture */}
              <div className="absolute inset-0 pointer-events-none border-4 border-accent rounded-lg">
                {/* Coin supérieur gauche */}
                <div className="absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 border-accent" />
                {/* Coin supérieur droit */}
                <div className="absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 border-accent" />
                {/* Coin inférieur gauche */}
                <div className="absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 border-accent" />
                {/* Coin inférieur droit */}
                <div className="absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 border-accent" />
              </div>

              {/* Bouton de capture */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <button
                  onClick={captureImage}
                  className="w-20 h-20 bg-accent rounded-full flex items-center justify-center pointer-events-auto hover:bg-accent-light transition-colors"
                >
                  <Camera className="w-8 h-8 text-white" />
                </button>
              </div>

              {/* Contrôles */}
              <div className="absolute bottom-md left-0 right-0 flex justify-center gap-md">
                <button
                  onClick={toggleTorch}
                  className="bg-black bg-opacity-50 text-white p-sm rounded-full hover:bg-opacity-75 transition-colors"
                  title={torchOn ? 'Éteindre la lampe torche' : 'Allumer la lampe torche'}
                >
                  <Flashlight className={`w-5 h-5 ${torchOn ? 'text-yellow-400' : ''}`} />
                </button>
                <button
                  onClick={toggleCamera}
                  className="bg-black bg-opacity-50 text-white p-sm rounded-full hover:bg-opacity-75 transition-colors"
                  title={cameraFacing === 'environment' ? 'Caméra avant' : 'Caméra arrière'}
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <label className="bg-black bg-opacity-50 text-white p-sm rounded-full hover:bg-opacity-75 transition-colors cursor-pointer">
                  <Upload className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Chargement du modèle */}
          {!modelLoaded && !error && (
            <div className="text-center py-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mx-auto" />
              <p className="mt-md text-tertiary">Chargement du modèle de reconnaissance...</p>
            </div>
          )}

          {/* Résultats de l'analyse */}
          {results.length > 0 && (
            <div className="mt-lg bg-tertiary rounded-lg p-md">
              <h3 className="font-medium mb-md">Résultats de l'analyse</h3>
              <div className="space-y-sm">
                {results.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => selectResult(result)}
                    className="w-full flex items-center justify-between p-md rounded-lg hover:bg-secondary transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium">{result.label}</p>
                      <p className="text-xs text-tertiary">
                        Confiance: {(result.probability * 100).toFixed(1)}%
                      </p>
                    </div>
                    <span className="text-sm text-tertiary">
                      #{index + 1}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {!capturedImage && !error && modelLoaded && (
            <div className="mt-lg text-center text-sm text-tertiary">
              <p>Photographiez le disque ou la jaquette du média</p>
              <p className="mt-xs">L'application identifiera automatiquement le média</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-secondary rounded-xl p-lg">
        <h2 className="text-xl font-semibold mb-md">Actions rapides</h2>
        
        <div className="grid md:grid-cols-3 gap-md">
          <ActionCard
            icon={<Camera className="w-6 h-6" />}
            title="Prendre une photo"
            description="Capturez une image de votre disque ou jaquette"
            onClick={() => {
              if (!isScanning) {
                startCamera();
                setIsScanning(true);
              }
            }}
          />
          
          <ActionCard
            icon={<Upload className="w-6 h-6" />}
            title="Importer une image"
            description="Sélectionnez une image depuis votre appareil"
            onClick={() => document.querySelector('input[type="file"]')?.click()}
          />
          
          <ActionCard
            icon={<Barcode className="w-6 h-6" />}
            title="Scanner un code-barres"
            description="Utilisez le scanner de code-barres"
            onClick={() => navigate('/scan')}
          />
        </div>
      </div>

      {/* Conseils */}
      <div className="bg-tertiary rounded-xl p-lg">
        <h2 className="text-lg font-semibold mb-md">Conseils pour la reconnaissance</h2>
        <div className="grid md:grid-cols-3 gap-lg">
          <TipCard
            icon={<ImageIcon className="w-6 h-6" />}
            title="Image claire"
            description="Assurez-vous que l'image est nette et bien éclairée pour une meilleure reconnaissance."
          />
          <TipCard
            icon={<Camera className="w-6 h-6" />}
            title="Cadrage correct"
            description="Cadrez bien le disque ou la jaquette pour que tous les détails soient visibles."
          />
          <TipCard
            icon={<Settings className="w-6 h-6" />}
            title="Plusieurs angles"
            description="Si la reconnaissance échoue, essayez de photographier sous un autre angle."
          />
        </div>
      </div>

      {/* Modal de confirmation pour les résultats */}
      {results.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-md">
          <div className="bg-secondary rounded-xl p-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="text-xl font-semibold">Résultats de la reconnaissance</h2>
              <button
                onClick={() => setResults([])}
                className="text-tertiary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-sm max-h-80 overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={index}
                  onClick={() => {
                    selectResult(result);
                    setResults([]);
                  }}
                  className="w-full flex items-center justify-between p-md rounded-lg hover:bg-tertiary transition-colors text-left"
                >
                  <div>
                    <p className="font-medium">{result.label}</p>
                    <p className="text-xs text-tertiary">
                      Confiance: {(result.probability * 100).toFixed(1)}%
                    </p>
                  </div>
                  <span className="text-sm text-tertiary">
                    #{index + 1}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-lg flex items-center justify-end gap-md pt-md border-t">
              <button
                onClick={() => setResults([])}
                className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant ActionCard
const ActionCard = ({ icon, title, description, onClick }) => (
  <button
    onClick={onClick}
    className="bg-primary rounded-lg p-md text-left hover:bg-tertiary transition-colors"
  >
    <div className="flex items-center gap-md">
      <div className="p-sm rounded-lg bg-accent bg-opacity-10">
        <span className="text-accent">{icon}</span>
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-tertiary">{description}</p>
      </div>
    </div>
  </button>
);

// Composant TipCard
const TipCard = ({ icon, title, description }) => (
  <div className="flex items-start gap-md">
    <div className="p-sm rounded-lg bg-primary flex-shrink-0">
      <span className="text-accent">{icon}</span>
    </div>
    <div>
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-secondary">{description}</p>
    </div>
  </div>
);

export default VisualRecognition;
