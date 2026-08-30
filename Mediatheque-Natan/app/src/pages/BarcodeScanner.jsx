import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useDatabase } from '../contexts/DatabaseContext';
import {
  ArrowLeft,
  Camera,
  X,
  CheckCircle,
  AlertTriangle,
  Barcode,
  Image as ImageIcon,
  RotateCcw,
  Flashlight,
  Settings,
  Database,
  Smartphone
} from 'lucide-react';

const BarcodeScanner = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { searchMedia, getMediaById } = useDatabase();

  const [stream, setStream] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [mediaInfo, setMediaInfo] = useState(null);
  const [error, setError] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('environment'); // environment ou user
  const [mobileSession, setMobileSession] = useState(null);
  const [isStartingMobileScan, setIsStartingMobileScan] = useState(false);
  // Electron ne supporte pas window.prompt() ("prompt() is and will not be
  // supported") : la saisie manuelle passe par une petite modale maison.
  const [manualEntry, setManualEntry] = useState(null); // 'add' | 'search' | null
  const [manualEntryValue, setManualEntryValue] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const codeReaderRef = useRef(null);
  // Un scan mobile peut arriver plusieurs fois en rafale (une détection par
  // frame côté téléphone) avant que l'état React `scanned` ne soit à jour :
  // ce ref, lu et positionné de façon synchrone, évite les toasts en double.
  const scannedRef = useRef(false);

  // Charger la bibliothèque ZXing
  useEffect(() => {
    const loadZXing = async () => {
      try {
        // Charger dynamiquement @zxing/browser
        const { BrowserQRCodeReader, BrowserBarcodeReader } = await import('@zxing/browser');
        
        // Créer un lecteur de codes-barres
        const codeReader = new BrowserBarcodeReader();
        codeReaderRef.current = codeReader;
        
        // Nettoyer lors du démontage
        return () => {
          if (codeReaderRef.current) {
            codeReaderRef.current.reset();
          }
        };
      } catch (err) {
        console.error('Erreur lors du chargement de ZXing:', err);
        setError('Impossible de charger le scanner. Veuillez vérifier votre connexion Internet.');
      }
    };

    loadZXing();
  }, []);

  // Démarrer le scan
  const startScanning = useCallback(async () => {
    try {
      setError(null);
      setScanned(false);
      setBarcode('');
      setMediaInfo(null);
      
      // Vérifier si l'API MediaDevices est disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Votre navigateur ne supporte pas l\'accès à la caméra');
      }

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

      // Attendre que la vidéo soit prête
      await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = resolve;
        } else {
          resolve();
        }
      });

      // Démarrer la détection
      if (codeReaderRef.current && videoRef.current) {
        // Utiliser un intervalle pour scanner régulièrement
        const scanInterval = setInterval(async () => {
          if (!isScanning) {
            clearInterval(scanInterval);
            return;
          }

          try {
            // Capturer le frame actuel
            if (canvasRef.current) {
              const context = canvasRef.current.getContext('2d');
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              context.drawImage(
                videoRef.current, 
                0, 0, 
                canvasRef.current.width, 
                canvasRef.current.height
              );
            }

            // Décoder le code-barres
            const result = await codeReaderRef.current.decodeFromVideoDevice(
              null,
              videoRef.current,
              (result, error) => {
                if (result) {
                  handleBarcodeDetected(result.getText());
                }
                if (error && error.name !== 'NotFoundException') {
                  console.error('Erreur de scan:', error);
                }
              }
            );

            if (result) {
              handleBarcodeDetected(result.getText());
            }
          } catch (err) {
            if (err.name !== 'NotFoundException') {
              console.error('Erreur lors du scan:', err);
            }
          }
        }, 500);

        // Nettoyer l'intervalle
        return () => clearInterval(scanInterval);
      }
    } catch (err) {
      console.error('Erreur lors du démarrage du scan:', err);
      setError(`Erreur: ${err.message}`);
      
      // Si l'erreur est liée aux permissions
      if (err.name === 'NotAllowedError') {
        setError('Permission refusée. Veuillez autoriser l\'accès à la caméra.');
      }
    }
  }, [cameraFacing, isScanning]);

  // Arrêter le scan
  const stopScanning = useCallback(() => {
    setIsScanning(false);
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }

    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
  }, [stream]);

  // Gérer la détection d'un code-barres
  const handleBarcodeDetected = useCallback(async (code) => {
    if (scannedRef.current) return;
    scannedRef.current = true;

    setScanned(true);
    setIsScanning(false);
    setBarcode(code);

    // Arrêter le stream
    stopScanning();

    try {
      setIsLoading(true);
      
      // Rechercher le média avec ce code-barres
      const response = await getMediaById(code);
      
      if (response.success && response.data) {
        // Média trouvé dans la base
        setMediaInfo({
          found: true,
          source: 'local',
          data: response.data
        });
        success(`Média trouvé dans la base: ${response.data.title}`);
      } else {
        // Média non trouvé localement, essayer via API externe
        // Pour l'instant, on affiche juste le code
        setMediaInfo({
          found: false,
          source: 'barcode',
          data: { barcode: code }
        });
        success(`Code-barres détecté: ${code}`);
      }
    } catch (err) {
      console.error('Erreur lors de la recherche:', err);
      setMediaInfo({
        found: false,
        source: 'barcode',
        data: { barcode: code }
      });
      success(`Code-barres détecté: ${code}`);
    } finally {
      setIsLoading(false);
    }
  }, [stopScanning, getMediaById, success]);

  // Démarrer une session de scan depuis le mobile (QR code)
  const startMobileScan = useCallback(async () => {
    setIsStartingMobileScan(true);
    try {
      const response = await window.electronAPI.mobileScan.startSession();
      if (response.success) {
        setMobileSession(response.data);
      } else {
        showError(response.error || 'Impossible de démarrer le scan depuis le mobile');
      }
    } catch (err) {
      showError(`Erreur: ${err.message}`);
    } finally {
      setIsStartingMobileScan(false);
    }
  }, [showError]);

  // Écouter les codes-barres scannés depuis le mobile
  useEffect(() => {
    const onMobileResult = (event, { barcode: code }) => {
      setMobileSession(null);
      handleBarcodeDetected(code);
    };
    window.electronAPI.mobileScan.onResult(onMobileResult);
    return () => window.electronAPI.mobileScan.removeResultListener(onMobileResult);
  }, [handleBarcodeDetected]);

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
    // Redémarrer le scan avec la nouvelle caméra
    setTimeout(() => {
      if (isScanning) {
        startScanning();
      }
    }, 500);
  }, [isScanning, startScanning]);

  // Recommencer le scan
  const restartScan = useCallback(() => {
    scannedRef.current = false;
    setScanned(false);
    setBarcode('');
    setMediaInfo(null);
    setError(null);
    setIsScanning(true);
    startScanning();
  }, [startScanning]);

  // Continuer avec le code-barres : le média n'a par définition pas été
  // trouvé (voir mediaInfo.found ci-dessus) - la seule action utile est de
  // créer une nouvelle fiche avec ce code-barres pré-rempli, pas de relancer
  // une recherche qui ne trouvera rien non plus.
  const continueWithBarcode = useCallback(() => {
    navigate(`/media/add?barcode=${encodeURIComponent(barcode)}`);
  }, [barcode, navigate]);

  // Valider la saisie manuelle (remplace window.prompt, non supporté par Electron)
  const submitManualEntry = useCallback(() => {
    const value = manualEntryValue.trim();
    if (!value) return;

    if (manualEntry === 'search') {
      navigate(`/search?q=${encodeURIComponent(value)}`);
    } else {
      setBarcode(value);
      handleBarcodeDetected(value);
    }

    setManualEntry(null);
    setManualEntryValue('');
  }, [manualEntry, manualEntryValue, navigate, handleBarcodeDetected]);

  // Aller à la fiche du média
  const goToMediaDetail = useCallback(() => {
    if (mediaInfo?.data?.id) {
      navigate(`/media/detail/${mediaInfo.data.id}`);
    }
  }, [mediaInfo, navigate]);

  // Charger les paramètres initiaux
  useEffect(() => {
    if (isScanning) {
      startScanning();
    }
    
    return () => {
      stopScanning();
    };
  }, [isScanning, startScanning, stopScanning]);

  // Nettoyer lors du démontage
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

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
          <h1 className="text-2xl font-bold">Scanner de code-barres</h1>
          <p className="text-tertiary mt-xs">
            Scannez le code-barres d'un média pour l'identifier rapidement
          </p>
        </div>
      </div>

      {/* Zone de scan */}
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

            {/* Overlay de scan */}
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

            {/* Indicateur de scan */}
            {isScanning && !scanned && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Message de succès */}
            {scanned && !isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                <div className="text-center text-white">
                  <CheckCircle className="w-16 h-16 mx-auto mb-md text-success" />
                  <p className="text-xl font-medium">Code-barres détecté !</p>
                  <p className="mt-sm">{barcode}</p>
                </div>
              </div>
            )}

            {/* Chargement */}
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
              </div>
            )}

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
            </div>
          </div>

          {/* Résultat du scan */}
          {mediaInfo && (
            <div className="mt-lg bg-tertiary rounded-lg p-md">
              {mediaInfo.found ? (
                <div className="flex items-center gap-md">
                  <div className="w-16 h-24 bg-primary rounded overflow-hidden flex-shrink-0">
                    {mediaInfo.data.jacket_image_url ? (
                      <img
                        src={mediaInfo.data.jacket_image_url}
                        alt={mediaInfo.data.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Barcode className="w-8 h-8 text-tertiary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{mediaInfo.data.title}</p>
                    <p className="text-sm text-tertiary">
                      {mediaInfo.data.release_year} • {window.electronAPI.utils.getMediaTypeLabel(mediaInfo.data.type_id)}
                    </p>
                    <p className="text-xs text-secondary mt-xs">
                      Code-barres: {mediaInfo.data.barcode || barcode}
                    </p>
                  </div>
                  <div className="flex gap-sm">
                    <button
                      onClick={goToMediaDetail}
                      className="bg-accent text-white px-sm py-xs rounded hover:bg-accent-light transition-colors text-sm"
                    >
                      Voir la fiche
                    </button>
                    <button
                      onClick={restartScan}
                      className="bg-primary border rounded px-sm py-xs hover:bg-tertiary transition-colors text-sm"
                    >
                      Scanner un autre
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-medium">Code-barres détecté: {barcode}</p>
                  <p className="text-sm text-tertiary mt-xs">
                    Aucun média trouvé dans la base avec ce code-barres.
                  </p>
                  <div className="mt-md flex justify-center gap-md">
                    <button
                      onClick={continueWithBarcode}
                      className="bg-accent text-white px-md py-sm rounded hover:bg-accent-light transition-colors"
                    >
                      Continuer
                    </button>
                    <button
                      onClick={restartScan}
                      className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors"
                    >
                      Recommencer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {!scanned && !error && (
            <div className="mt-lg text-center text-sm text-tertiary">
              <p>Approchez le code-barres de la caméra pour le scanner</p>
              <p className="mt-xs">Le scan se fait automatiquement</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-secondary rounded-xl p-lg">
        <h2 className="text-xl font-semibold mb-md">Actions rapides</h2>
        
        <div className="grid md:grid-cols-3 gap-md">
          <ActionCard
            icon={<Barcode className="w-6 h-6" />}
            title="Saisir manuellement"
            description="Entrez un code-barres manuellement"
            onClick={() => { setManualEntryValue(''); setManualEntry('add'); }}
          />
          
          <ActionCard
            icon={<ImageIcon className="w-6 h-6" />}
            title="Reconnaissance visuelle"
            description="Identifier un média par son image"
            onClick={() => navigate('/recognize')}
          />

          <ActionCard
            icon={<Smartphone className="w-6 h-6" />}
            title="Scanner depuis mobile"
            description="Utiliser la caméra de votre téléphone"
            onClick={startMobileScan}
          />

          <ActionCard
            icon={<Database className="w-6 h-6" />}
            title="Rechercher dans la base"
            description="Rechercher un code-barres existant"
            onClick={() => { setManualEntryValue(''); setManualEntry('search'); }}
          />
        </div>
      </div>

      {/* Conseils */}
      <div className="bg-tertiary rounded-xl p-lg">
        <h2 className="text-lg font-semibold mb-md">Conseils pour le scan</h2>
        <div className="grid md:grid-cols-3 gap-lg">
          <TipCard
            icon={<Camera className="w-6 h-6" />}
            title="Bon éclairage"
            description="Assurez-vous que le code-barres est bien éclairé pour un scan optimal."
          />
          <TipCard
            icon={<Barcode className="w-6 h-6" />}
            title="Code-barres propre"
            description="Nettoyez le code-barres s'il est sale ou endommagé."
          />
          <TipCard
            icon={<Settings className="w-6 h-6" />}
            title="Distance optimale"
            description="Tenez le code-barres à environ 10-20 cm de la caméra."
          />
        </div>
      </div>

      {/* Modale de saisie manuelle (window.prompt n'est pas supporté par Electron) */}
      {manualEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-modal p-md">
          <form
            onSubmit={(e) => { e.preventDefault(); submitManualEntry(); }}
            className="bg-secondary rounded-xl p-lg w-full max-w-sm space-y-md"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {manualEntry === 'search' ? 'Rechercher un code-barres' : 'Saisir un code-barres'}
              </h3>
              <button type="button" onClick={() => setManualEntry(null)} className="text-tertiary hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={manualEntryValue}
              onChange={(e) => setManualEntryValue(e.target.value)}
              placeholder="Ex: 8712609603040"
              className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex items-center justify-end gap-md">
              <button type="button" onClick={() => setManualEntry(null)} className="px-lg py-sm rounded hover:bg-tertiary transition-colors">
                Annuler
              </button>
              <button
                type="submit"
                disabled={!manualEntryValue.trim()}
                className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                {manualEntry === 'search' ? 'Rechercher' : 'Valider'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modale QR code pour le scan depuis mobile */}
      {(mobileSession || isStartingMobileScan) && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-md">
          <div className="bg-secondary rounded-xl p-lg max-w-sm w-full text-center space-y-md">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Scanner depuis votre téléphone</h3>
              <button onClick={() => setMobileSession(null)} className="text-tertiary hover:text-primary transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {isStartingMobileScan ? (
              <div className="py-xl flex justify-center">
                <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <p className="text-sm text-tertiary">
                  Ouvrez l'appareil photo de votre téléphone (sur le même Wi-Fi) et visez ce QR code.
                </p>
                <img src={mobileSession.qrDataUrl} alt="QR code de scan mobile" className="mx-auto rounded-lg bg-white p-sm" />
                <p className="text-xs text-secondary">
                  Votre téléphone affichera un avertissement "connexion non sécurisée" : c'est normal,
                  la connexion ne quitte jamais votre réseau Wi-Fi. Vous pouvez poursuivre.
                </p>
                <p className="text-xs text-tertiary break-all">{mobileSession.url}</p>
                <p className="text-xs text-secondary">Lien valable 5 minutes.</p>
              </>
            )}
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

export default BarcodeScanner;
