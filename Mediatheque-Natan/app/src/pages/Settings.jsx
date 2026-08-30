import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { getAiService } from '../services';
import {
  ArrowLeft,
  Save,
  X,
  Palette,
  Moon,
  Sun,
  Monitor,
  Bell,
  User,
  Shield,
  Database,
  HardDrive,
  Cloud,
  Globe,
  Languages,
  HelpCircle,
  Bot,
  Cpu,
  Thermometer,
  Play,
  Square,
  RefreshCw,
  BarChart3
} from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme: setThemeContext } = useTheme();
  const { success, error: showError } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    theme: theme,
    language: 'fr',
    notifications: {
      enabled: true,
      sound: true,
      types: {
        recommendations: true,
        loans: true,
        backups: true,
        updates: true
      }
    },
    database: {
      autoBackup: true,
      backupFrequency: 'daily',
      maxBackups: 30,
      includeMedia: true
    },
    externalStorage: {
      enabled: true,
      autoSync: false,
      syncFrequency: 'weekly'
    },
    recognition: {
      enabled: true,
      useCloud: false,
      confidenceThreshold: 0.85
    },
    api: {
      tmdb: {
        enabled: true,
        apiKey: ''
      },
      musicBrainz: {
        enabled: true,
        apiKey: ''
      }
    },
    privacy: {
      analytics: false,
      crashReports: true
    },
    ai: {
      enabled: true,
      baseUrl: 'http://localhost:11434',
      model: 'mistral:7b',
      temperature: 0.7,
      max_tokens: 2048,
      autoStart: false,
      keep_alive: '5m'
    }
  });

  // Charger les paramètres depuis la configuration
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const configResponse = await window.electronAPI.config.get();
        if (configResponse.success) {
          setSettings(prev => ({
            ...prev,
            theme: configResponse.data.theme || 'system',
            language: configResponse.data.language || 'fr',
            database: {
              ...prev.database,
              ...configResponse.data.backup
            },
            externalStorage: {
              ...prev.externalStorage,
              ...configResponse.data.sync
            },
            recognition: {
              ...prev.recognition,
              ...configResponse.data.recognition
            },
            api: {
              ...prev.api,
              ...configResponse.data.api
            },
            ai: {
              ...prev.ai,
              ...configResponse.data.ai
            }
          }));
        }
      } catch (err) {
        console.error('Erreur lors du chargement des paramètres:', err);
      }
    };

    loadSettings();
  }, []);

  // Sauvegarder les paramètres
  const saveSettings = useCallback(async () => {
    try {
      // Sauvegarder le thème
      setThemeContext(settings.theme);

      // Sauvegarder la configuration
      const configResponse = await window.electronAPI.config.update({
        theme: settings.theme,
        language: settings.language,
        backup: settings.database,
        sync: settings.externalStorage,
        recognition: settings.recognition,
        api: settings.api,
        ai: settings.ai
      });

      if (configResponse.success) {
        success('Paramètres sauvegardés avec succès');
      } else {
        showError(configResponse.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      showError(`Erreur lors de la sauvegarde: ${err.message}`);
    }
  }, [settings, setThemeContext, success, showError]);

  // Gérer le changement des paramètres
  const handleChange = useCallback((section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  }, []);

  // Gérer le changement des paramètres imbriqués
  const handleNestedChange = useCallback((section, subSection, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subSection]: {
          ...prev[section][subSection],
          [field]: value
        }
      }
    }));
  }, []);

  // Tester les notifications
  const testNotification = useCallback(() => {
    if (Notification.permission === 'granted') {
      new Notification('Test de notification', {
        body: 'Ceci est un test de notification de Médiathèque NATAN'
      });
      success('Notification de test envoyée');
    } else {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Test de notification', {
            body: 'Ceci est un test de notification de Médiathèque NATAN'
          });
          success('Notification de test envoyée');
        } else {
          showError('Les notifications sont bloquées');
        }
      });
    }
  }, [success, showError]);

  // Demander les permissions de notification
  const requestNotificationPermission = useCallback(() => {
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        success('Permissions de notification accordées');
        handleChange('notifications', 'enabled', true);
      } else {
        showError('Permissions de notification refusées');
        handleChange('notifications', 'enabled', false);
      }
    });
  }, [success, showError, handleChange]);

  // Créer une sauvegarde manuelle
  const createBackup = useCallback(async () => {
    try {
      const response = await window.electronAPI.backup.create();
      if (response.success) {
        success(`Sauvegarde créée: ${response.path}`);
      } else {
        showError(response.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err) {
      showError(`Erreur lors de la sauvegarde: ${err.message}`);
    }
  }, [success, showError]);

  // Détecter les disques externes
  const detectExternalDrives = useCallback(async () => {
    try {
      const response = await window.electronAPI.external.detectDrives();
      if (response.success) {
        if (response.data.length > 0) {
          success(`${response.data.length} disque(s) externe(s) détecté(s)`);
        } else {
          showError('Aucun disque externe détecté');
        }
      }
    } catch (err) {
      showError(`Erreur lors de la détection: ${err.message}`);
    }
  }, [success, showError]);

  // Synchroniser avec un disque externe
  const syncWithExternal = useCallback(async () => {
    try {
      const drives = await window.electronAPI.external.detectDrives();
      if (drives.success && drives.data.length > 0) {
        // Pour l'instant, synchroniser avec le premier disque
        const response = await window.electronAPI.external.syncWithExternal(drives.data[0].path);
        if (response.success) {
          success('Synchronisation terminée');
        } else {
          showError(response.error || 'Erreur lors de la synchronisation');
        }
      } else {
        showError('Aucun disque externe détecté');
      }
    } catch (err) {
      showError(`Erreur lors de la synchronisation: ${err.message}`);
    }
  }, [success, showError]);

  // Formatage de la taille
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 octets';
    const k = 1024;
    const sizes = ['octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Obtenir la taille de la base de données
  const [dbSize, setDbSize] = useState('');
  useEffect(() => {
    const getDbSize = async () => {
      try {
        const response = await window.electronAPI.db.queryOne({
          sql: "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
        });
        if (response.success) {
          setDbSize(formatSize(response.data.size));
        }
      } catch (err) {
        console.error('Erreur lors de la récupération de la taille de la base:', err);
      }
    };
    getDbSize();
  }, []);

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
          <h1 className="text-2xl font-bold">Paramètres</h1>
          <p className="text-tertiary mt-xs">Personnalisez votre expérience</p>
        </div>
      </div>

      {/* Onglets */}
      <div className="bg-secondary rounded-xl p-lg">
        <div className="border-b mb-lg">
          <nav className="flex gap-lg overflow-x-auto">
            <TabButton
              icon={<Palette className="w-5 h-5" />}
              label="Général"
              isActive={activeTab === 'general'}
              onClick={() => setActiveTab('general')}
            />
            <TabButton
              icon={<Bell className="w-5 h-5" />}
              label="Notifications"
              isActive={activeTab === 'notifications'}
              onClick={() => setActiveTab('notifications')}
            />
            <TabButton
              icon={<Database className="w-5 h-5" />}
              label="Base de données"
              isActive={activeTab === 'database'}
              onClick={() => setActiveTab('database')}
            />
            <TabButton
              icon={<HardDrive className="w-5 h-5" />}
              label="Stockage externe"
              isActive={activeTab === 'external'}
              onClick={() => setActiveTab('external')}
            />
            <TabButton
              icon={<Globe className="w-5 h-5" />}
              label="APIs externes"
              isActive={activeTab === 'api'}
              onClick={() => setActiveTab('api')}
            />
            <TabButton
              icon={<Shield className="w-5 h-5" />}
              label="Confidentialité"
              isActive={activeTab === 'privacy'}
              onClick={() => setActiveTab('privacy')}
            />
            <TabButton
              icon={<HelpCircle className="w-5 h-5" />}
              label="Aide"
              isActive={activeTab === 'help'}
              onClick={() => setActiveTab('help')}
            />
            <TabButton
              icon={<Bot className="w-5 h-5" />}
              label="Intelligence Artificielle"
              isActive={activeTab === 'ai'}
              onClick={() => setActiveTab('ai')}
            />
          </nav>
        </div>

        {/* Contenu des onglets */}
        <div className="min-h-96">
          {activeTab === 'general' && (
            <GeneralSettings
              settings={settings}
              onChange={handleChange}
              onNestedChange={handleNestedChange}
              user={user}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationsSettings
              settings={settings.notifications}
              onChange={(field, value) => handleChange('notifications', field, value)}
              onNestedChange={(subSection, field, value) => handleNestedChange('notifications', subSection, field, value)}
              onTestNotification={testNotification}
              onRequestPermission={requestNotificationPermission}
            />
          )}

          {activeTab === 'database' && (
            <DatabaseSettings
              settings={settings.database}
              onChange={(field, value) => handleChange('database', field, value)}
              dbSize={dbSize}
              onCreateBackup={createBackup}
            />
          )}

          {activeTab === 'external' && (
            <ExternalStorageSettings
              settings={settings.externalStorage}
              onChange={(field, value) => handleChange('externalStorage', field, value)}
              onDetectDrives={detectExternalDrives}
              onSync={syncWithExternal}
            />
          )}

          {activeTab === 'api' && (
            <ApiSettings
              settings={settings.api}
              onChange={(subSection, field, value) => handleNestedChange('api', subSection, field, value)}
            />
          )}

          {activeTab === 'privacy' && (
            <PrivacySettings
              settings={settings.privacy}
              onChange={(field, value) => handleChange('privacy', field, value)}
            />
          )}

          {activeTab === 'help' && (
            <HelpSettings />
          )}
          
          {activeTab === 'ai' && (
            <AiSettings
              settings={settings.ai}
              onChange={(field, value) => handleChange('ai', field, value)}
            />
          )}
        </div>

        {/* Bouton de sauvegarde */}
        <div className="mt-lg pt-lg border-t flex items-center justify-end">
          <button
            onClick={saveSettings}
            className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors flex items-center gap-sm"
          >
            <Save className="w-5 h-5" />
            <span>Sauvegarder les paramètres</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant TabButton
const TabButton = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-sm pb-sm border-b-2 transition-colors ${
      isActive 
        ? 'border-accent text-accent font-medium' 
        : 'border-transparent text-tertiary hover:text-primary'
    }`}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);

// Onglet Général
const GeneralSettings = ({ settings, onChange, onNestedChange, user }) => (
  <div className="space-y-lg">
    {/* Thème */}
    <SettingSection title="Apparence" icon={<Palette className="w-5 h-5" />}>
      <div className="space-y-md">
        <RadioGroup
          label="Thème"
          value={settings.theme}
          options={[
            { value: 'light', label: 'Clair', icon: <Sun className="w-5 h-5" /> },
            { value: 'dark', label: 'Sombre', icon: <Moon className="w-5 h-5" /> },
            { value: 'system', label: 'Système', icon: <Monitor className="w-5 h-5" /> }
          ]}
          onChange={(value) => onChange('theme', value)}
        />
      </div>
    </SettingSection>

    {/* Langue */}
    <SettingSection title="Langue" icon={<Languages className="w-5 h-5" />}>
      <div className="space-y-md">
        <Select
          label="Langue de l'application"
          value={settings.language}
          options={[
            { value: 'fr', label: 'Français' },
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Español' }
          ]}
          onChange={(value) => onChange('language', value)}
        />
      </div>
    </SettingSection>

    {/* Profil utilisateur */}
    <SettingSection title="Profil utilisateur" icon={<User className="w-5 h-5" />}>
      <div className="space-y-md">
        <div className="flex items-center gap-md p-md bg-tertiary rounded-lg">
          <div className="w-16 h-16 bg-accent bg-opacity-10 rounded-full flex items-center justify-center">
            <span className="text-accent text-2xl font-bold">
              {user?.firstName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm text-tertiary">{user?.email}</p>
            <p className="text-xs text-secondary mt-xs">
              {user?.accessLevel === 3 ? 'Administrateur' : user?.accessLevel === 2 ? 'Membre' : 'Invité'}
            </p>
          </div>
        </div>
        <div className="flex gap-md">
          <Link to="/users">
            <button className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors">
              Gérer les utilisateurs
            </button>
          </Link>
          <Link to="/settings/profile">
            <button className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors">
              Modifier le profil
            </button>
          </Link>
        </div>
      </div>
    </SettingSection>
  </div>
);

// Onglet Notifications
const NotificationsSettings = ({ settings, onChange, onNestedChange, onTestNotification, onRequestPermission }) => (
  <div className="space-y-lg">
    <SettingSection title="Paramètres des notifications" icon={<Bell className="w-5 h-5" />}>
      <div className="space-y-md">
        <Toggle
          label="Activer les notifications"
          value={settings.enabled}
          onChange={(value) => onChange('enabled', value)}
          description="Recevez des notifications pour les événements importants"
        />
        
        {settings.enabled && (
          <>
            <Toggle
              label="Son des notifications"
              value={settings.sound}
              onChange={(value) => onChange('sound', value)}
              description="Jouer un son lors de la réception d'une notification"
            />

            <div className="mt-md">
              <h4 className="font-medium mb-md">Types de notifications</h4>
              <div className="space-y-sm">
                <Toggle
                  label="Recommandations"
                  value={settings.types.recommendations}
                  onChange={(value) => onNestedChange('types', 'recommendations', value)}
                  description="Notifications pour les nouvelles recommandations"
                />
                <Toggle
                  label="Emprunts"
                  value={settings.types.loans}
                  onChange={(value) => onNestedChange('types', 'loans', value)}
                  description="Notifications pour les emprunts et retours"
                />
                <Toggle
                  label="Sauvegardes"
                  value={settings.types.backups}
                  onChange={(value) => onNestedChange('types', 'backups', value)}
                  description="Notifications pour les sauvegardes automatiques"
                />
                <Toggle
                  label="Mises à jour"
                  value={settings.types.updates}
                  onChange={(value) => onNestedChange('types', 'updates', value)}
                  description="Notifications pour les mises à jour de l'application"
                />
              </div>
            </div>

            <div className="mt-md flex gap-md">
              <button
                onClick={onTestNotification}
                className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors"
              >
                Tester les notifications
              </button>
              {Notification.permission !== 'granted' && (
                <button
                  onClick={onRequestPermission}
                  className="bg-accent text-white px-md py-sm rounded hover:bg-accent-light transition-colors"
                >
                  Activer les notifications
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </SettingSection>
  </div>
);

// Onglet Base de données
const DatabaseSettings = ({ settings, onChange, dbSize, onCreateBackup }) => (
  <div className="space-y-lg">
    <SettingSection title="Sauvegardes" icon={<Database className="w-5 h-5" />}>
      <div className="space-y-md">
        <Toggle
          label="Sauvegardes automatiques"
          value={settings.autoBackup}
          onChange={(value) => onChange('autoBackup', value)}
          description={`Sauvegardez automatiquement votre base de données (taille actuelle: ${dbSize})`}
        />

        {settings.autoBackup && (
          <>
            <Select
              label="Fréquence des sauvegardes"
              value={settings.backupFrequency}
              options={[
                { value: 'hourly', label: 'Toutes les heures' },
                { value: 'daily', label: 'Quotidiennes' },
                { value: 'weekly', label: 'Hebdomadaires' },
                { value: 'monthly', label: 'Mensuelles' }
              ]}
              onChange={(value) => onChange('backupFrequency', value)}
            />

            <Input
              label="Nombre maximum de sauvegardes"
              type="number"
              value={settings.maxBackups}
              onChange={(value) => onChange('maxBackups', parseInt(value) || 0)}
              min="1"
              max="100"
            />

            <Toggle
              label="Inclure les fichiers médias"
              value={settings.includeMedia}
              onChange={(value) => onChange('includeMedia', value)}
              description="Inclure les images des jaquettes dans les sauvegardes"
            />
          </>
        )}

        <div className="mt-md flex gap-md">
          <button
            onClick={onCreateBackup}
            className="bg-accent text-white px-md py-sm rounded hover:bg-accent-light transition-colors"
          >
            Créer une sauvegarde maintenant
          </button>
          <Link to="/backup">
            <button className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors">
              Gérer les sauvegardes
            </button>
          </Link>
        </div>
      </div>
    </SettingSection>
  </div>
);

// Onglet Stockage externe
const ExternalStorageSettings = ({ settings, onChange, onDetectDrives, onSync }) => (
  <div className="space-y-lg">
    <SettingSection title="Stockage externe" icon={<HardDrive className="w-5 h-5" />}>
      <div className="space-y-md">
        <Toggle
          label="Activer le stockage externe"
          value={settings.enabled}
          onChange={(value) => onChange('enabled', value)}
          description="Utiliser un disque externe pour stocker et synchroniser vos données"
        />

        {settings.enabled && (
          <>
            <Toggle
              label="Synchronisation automatique"
              value={settings.autoSync}
              onChange={(value) => onChange('autoSync', value)}
              description="Synchroniser automatiquement avec le disque externe"
            />

            {settings.autoSync && (
              <Select
                label="Fréquence de synchronisation"
                value={settings.syncFrequency}
                options={[
                  { value: 'daily', label: 'Quotidienne' },
                  { value: 'weekly', label: 'Hebdomadaire' },
                  { value: 'monthly', label: 'Mensuelle' }
                ]}
                onChange={(value) => onChange('syncFrequency', value)}
              />
            )}

            <div className="mt-md flex gap-md">
              <button
                onClick={onDetectDrives}
                className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors"
              >
                Détecter les disques
              </button>
              <button
                onClick={onSync}
                className="bg-accent text-white px-md py-sm rounded hover:bg-accent-light transition-colors"
              >
                Synchroniser maintenant
              </button>
            </div>
          </>
        )}
      </div>
    </SettingSection>
  </div>
);

// Onglet APIs externes
const ApiSettings = ({ settings, onChange }) => (
  <div className="space-y-lg">
    <SettingSection title="APIs externes" icon={<Globe className="w-5 h-5" />}>
      <div className="space-y-md">
        <p className="text-sm text-tertiary mb-md">
          Configurez les clés API pour les services externes. Ces services permettent d'importer automatiquement les métadonnées des médias.
        </p>

        {/* TMDB */}
        <div className="bg-tertiary rounded-lg p-md">
          <div className="flex items-center justify-between mb-md">
            <div className="flex items-center gap-md">
              <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <div>
                <h4 className="font-medium">The Movie Database (TMDB)</h4>
                <p className="text-sm text-tertiary">Métadonnées pour les films et séries</p>
              </div>
            </div>
            <Toggle
              value={settings.tmdb.enabled}
              onChange={(value) => onChange('tmdb', 'enabled', value)}
            />
          </div>

          {settings.tmdb.enabled && (
            <div className="space-y-md">
              <Input
                label="Clé API TMDB"
                type="password"
                value={settings.tmdb.apiKey}
                onChange={(value) => onChange('tmdb', 'apiKey', value)}
                placeholder="Entrez votre clé API TMDB"
                description="Obtenez une clé API gratuite sur https://www.themoviedb.org/settings/api"
              />
            </div>
          )}
        </div>

        {/* MusicBrainz */}
        <div className="bg-tertiary rounded-lg p-md">
          <div className="flex items-center justify-between mb-md">
            <div className="flex items-center gap-md">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <div>
                <h4 className="font-medium">MusicBrainz</h4>
                <p className="text-sm text-tertiary">Métadonnées pour la musique</p>
              </div>
            </div>
            <Toggle
              value={settings.musicBrainz.enabled}
              onChange={(value) => onChange('musicBrainz', 'enabled', value)}
            />
          </div>

          {settings.musicBrainz.enabled && (
            <div className="space-y-md">
              <Input
                label="Clé API MusicBrainz"
                type="password"
                value={settings.musicBrainz.apiKey}
                onChange={(value) => onChange('musicBrainz', 'apiKey', value)}
                placeholder="Entrez votre clé API MusicBrainz"
                description="MusicBrainz n'a pas besoin de clé API pour les requêtes de base"
              />
            </div>
          )}
        </div>
      </div>
    </SettingSection>
  </div>
);

// Onglet Confidentialité
const PrivacySettings = ({ settings, onChange }) => (
  <div className="space-y-lg">
    <SettingSection title="Confidentialité" icon={<Shield className="w-5 h-5" />}>
      <div className="space-y-md">
        <p className="text-sm text-tertiary mb-md">
          Contrôlez comment vos données sont utilisées pour améliorer l'expérience.
        </p>

        <Toggle
          label="Rapports de plantage"
          value={settings.crashReports}
          onChange={(value) => onChange('crashReports', value)}
          description="Envoyer des rapports anonymes en cas de plantage pour aider à améliorer l'application"
        />

        <Toggle
          label="Analytiques d'utilisation"
          value={settings.analytics}
          onChange={(value) => onChange('analytics', value)}
          description="Partager des données d'utilisation anonymes pour améliorer les fonctionnalités"
        />

        <div className="mt-md p-md bg-tertiary rounded-lg">
          <h4 className="font-medium mb-md">Vos données</h4>
          <p className="text-sm text-secondary mb-md">
            Toutes vos données sont stockées localement sur votre appareil. 
            Aucune information personnelle n'est envoyée à nos serveurs sans votre consentement.
          </p>
          <div className="flex gap-md">
            <button className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors">
              Exporter mes données
            </button>
            <button className="bg-danger text-white px-md py-sm rounded hover:bg-danger-light transition-colors">
              Supprimer mes données
            </button>
          </div>
        </div>
      </div>
    </SettingSection>
  </div>
);

// Onglet Intelligence Artificielle
const AiSettings = ({ settings, onChange }) => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [availableModels, setAvailableModels] = useState([]);
  const [isOllamaRunning, setIsOllamaRunning] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  // Vérifier l'état d'Ollama
  const checkOllamaStatus = useCallback(async () => {
    try {
      setIsChecking(true);
      const { getAiService } = await import('../services');
      const aiService = getAiService();
      const status = await aiService.checkOllamaStatus();
      setIsOllamaRunning(status.running);
      if (status.models) {
        setAvailableModels(status.models);
      }
    } catch (err) {
      setIsOllamaRunning(false);
      showError(err.message || 'Erreur lors de la vérification d\'Ollama');
    } finally {
      setIsChecking(false);
    }
  }, [showError]);

  // Charger les modèles
  const loadModels = useCallback(async () => {
    try {
      const { getAiService } = await import('../services');
      const aiService = getAiService();
      const response = await aiService.listModels();
      if (response.success) {
        setAvailableModels(response.models);
      }
    } catch (err) {
      showError(err.message || 'Erreur lors du chargement des modèles');
    }
  }, [showError]);

  // Démarrer Ollama
  const startOllama = useCallback(async () => {
    try {
      // Cela devrait être géré par le processus principal
      const response = await window.electronAPI.ai.startOllama();
      if (response.success) {
        success('Ollama démarré avec succès');
        checkOllamaStatus();
      } else {
        showError(response.error || 'Échec du démarrage d\'Ollama');
      }
    } catch (err) {
      showError(err.message || 'Erreur lors du démarrage d\'Ollama');
    }
  }, [checkOllamaStatus, success, showError]);

  // Arrêter Ollama
  const stopOllama = useCallback(async () => {
    try {
      const response = await window.electronAPI.ai.stopOllama();
      if (response.success) {
        success('Ollama arrêté');
        setIsOllamaRunning(false);
      } else {
        showError(response.error || 'Échec de l\'arrêt d\'Ollama');
      }
    } catch (err) {
      showError(err.message || 'Erreur lors de l\'arrêt d\'Ollama');
    }
  }, [success, showError]);

  // Installer un modèle
  const installModel = useCallback(async (modelName) => {
    try {
      const { getAiService } = await import('../services');
      const aiService = getAiService();
      const response = await aiService.pullModel(modelName);
      if (response.success) {
        success(`Modèle ${modelName} installé avec succès`);
        loadModels();
      } else {
        showError(response.error || `Échec de l'installation du modèle ${modelName}`);
      }
    } catch (err) {
      showError(err.message || 'Erreur lors de l\'installation du modèle');
    }
  }, [loadModels, success, showError]);

  // Supprimer un modèle
  const deleteModel = useCallback(async (modelName) => {
    try {
      const { getAiService } = await import('../services');
      const aiService = getAiService();
      const response = await aiService.deleteModel(modelName);
      if (response.success) {
        success(`Modèle ${modelName} supprimé`);
        loadModels();
      } else {
        showError(response.error || `Échec de la suppression du modèle ${modelName}`);
      }
    } catch (err) {
      showError(err.message || 'Erreur lors de la suppression du modèle');
    }
  }, [loadModels, success, showError]);

  // Vérifier au montage
  useEffect(() => {
    checkOllamaStatus();
  }, [checkOllamaStatus]);

  return (
    <div className="space-y-lg">
      <SettingSection title="Configuration de l'IA" icon={<Cpu className="w-5 h-5" />}>
        <div className="space-y-md">
          <p className="text-sm text-tertiary mb-md">
            Configurez l'intégration avec Ollama pour les fonctionnalités d'intelligence artificielle locale.
            Tous les traitements sont effectués sur votre machine, aucune donnée ne quitte votre appareil.
          </p>

          {/* Statut d'Ollama */}
          <div className="bg-tertiary rounded-lg p-md">
            <div className="flex items-center justify-between mb-md">
              <div>
                <h4 className="font-medium">Statut d'Ollama</h4>
                <p className="text-sm text-tertiary">Serveur d'inférence LLM local</p>
              </div>
              <div className="flex items-center gap-md">
                {isChecking ? (
                  <span className="text-sm text-tertiary">Vérification...</span>
                ) : (
                  <>
                    <span className={`status-dot ${isOllamaRunning ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">{isOllamaRunning ? 'En ligne' : 'Hors ligne'}</span>
                  </>
                )}
              </div>
            </div>

            {isOllamaRunning === false && (
              <div className="flex gap-md">
                <button
                  onClick={checkOllamaStatus}
                  className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4 inline mr-sm" />
                  Vérifier à nouveau
                </button>
                <button
                  onClick={() => window.electronAPI.app.openUrl('http://localhost:11434')}
                  className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors text-sm"
                >
                  Ouvrir Ollama
                </button>
              </div>
            )}

            {isOllamaRunning && (
              <div className="flex gap-md">
                <button
                  onClick={stopOllama}
                  className="bg-danger text-white px-md py-sm rounded hover:bg-danger-light transition-colors text-sm"
                >
                  <Square className="w-4 h-4 inline mr-sm" />
                  Arrêter Ollama
                </button>
              </div>
            )}
          </div>

          {/* Configuration du serveur */}
          <div className="bg-tertiary rounded-lg p-md">
            <h4 className="font-medium mb-md">Configuration du serveur</h4>
            
            <div className="space-y-md">
              <Input
                label="URL du serveur Ollama"
                value={settings.baseUrl}
                onChange={(value) => onChange('baseUrl', value)}
                placeholder="http://localhost:11434"
                description="URL où Ollama écoute (par défaut: http://localhost:11434)"
              />

              <Toggle
                label="Démarrage automatique"
                value={settings.autoStart}
                onChange={(value) => onChange('autoStart', value)}
                description="Démarrer automatiquement Ollama avec l'application"
              />

              <Input
                label="Keep-alive"
                value={settings.keep_alive}
                onChange={(value) => onChange('keep_alive', value)}
                placeholder="5m"
                description="Durée de maintien du modèle en mémoire après inactivité"
              />
            </div>
          </div>

          {/* Configuration du modèle */}
          <div className="bg-tertiary rounded-lg p-md">
            <div className="flex items-center justify-between mb-md">
              <div>
                <h4 className="font-medium">Modèle par défaut</h4>
                <p className="text-sm text-tertiary">Sélectionnez le modèle à utiliser pour l'assistant IA</p>
              </div>
              <button
                onClick={loadModels}
                className="bg-primary border rounded px-sm py-xs hover:bg-tertiary transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-md">
              <Select
                label="Modèle"
                value={settings.model}
                onChange={(value) => onChange('model', value)}
                options={[
                  { value: 'mistral:7b', label: 'Mistral 7B (Recommandé pour le français)' },
                  { value: 'llama3:8b', label: 'Llama 3 8B' },
                  { value: 'llama2:7b', label: 'Llama 2 7B' },
                  { value: 'phi3:3.8b', label: 'Phi 3 3.8B (Léger)' },
                  ...availableModels.map(m => ({ value: m.name, label: `${m.name} (${m.size})` }))
                ]}
              />

              <p className="text-xs text-tertiary mt-sm">
                Les modèles doivent être téléchargés avant utilisation. Utilisez la commande : <code className="bg-primary px-xs rounded">ollama pull nom-du-modèle</code>
              </p>
            </div>

            {/* Gestion des modèles */}
            <div className="mt-md pt-md border-t">
              <h4 className="font-medium mb-md">Modèles installés</h4>
              
              {availableModels.length > 0 ? (
                <div className="space-y-sm">
                  {availableModels.map(model => (
                    <div
                      key={model.name}
                      className="flex items-center justify-between p-sm bg-secondary rounded"
                    >
                      <div>
                        <p className="font-medium text-sm">{model.name}</p>
                        <p className="text-xs text-tertiary">{model.size}</p>
                      </div>
                      <div className="flex gap-sm">
                        {settings.model !== model.name && (
                          <button
                            onClick={() => onChange('model', model.name)}
                            className="text-xs bg-primary border rounded px-sm py-xs hover:bg-tertiary transition-colors"
                          >
                            Définir par défaut
                          </button>
                        )}
                        <button
                          onClick={() => deleteModel(model.name)}
                          className="text-xs bg-danger text-white px-sm py-xs rounded hover:bg-danger-light transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-tertiary">Aucun modèle installé. Installez-en un avec Ollama CLI.</p>
              )}
            </div>
          </div>

          {/* Paramètres de génération */}
          <div className="bg-tertiary rounded-lg p-md">
            <h4 className="font-medium mb-md">Paramètres de génération</h4>
            
            <div className="space-y-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Température</p>
                  <p className="text-sm text-tertiary">Contrôle la créativité (0.0 = déterministe, 1.0 = aléatoire)</p>
                </div>
                <div className="flex items-center gap-md">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature}
                    onChange={(e) => onChange('temperature', parseFloat(e.target.value))}
                    className="w-48"
                  />
                  <span className="text-sm w-12 text-right">{settings.temperature}</span>
                </div>
              </div>

              <Input
                label="Tokens maximum"
                type="number"
                value={settings.max_tokens}
                onChange={(value) => onChange('max_tokens', parseInt(value) || 2048)}
                min="256"
                max="4096"
                description="Nombre maximum de tokens à générer par réponse"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-md">
            <button
              onClick={checkOllamaStatus}
              className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors"
            >
              <RefreshCw className="w-4 h-4 inline mr-sm" />
              Rafraîchir
            </button>
            <button
              onClick={() => navigate('/ai')}
              className="bg-accent text-white px-md py-sm rounded hover:bg-accent-light transition-colors"
            >
              <Bot className="w-4 h-4 inline mr-sm" />
              Ouvrir l'assistant IA
            </button>
          </div>
        </div>
      </SettingSection>
    </div>
  );
};

// Onglet Aide
const HelpSettings = () => (
  <div className="space-y-lg">
    <SettingSection title="Aide et support" icon={<HelpCircle className="w-5 h-5" />}>
      <div className="space-y-md">
        <p className="text-secondary mb-md">
          Bienvenue dans la section d'aide de Médiathèque NATAN. Vous y trouverez des réponses aux questions fréquentes et des ressources pour vous aider à utiliser l'application.
        </p>

        <div className="space-y-lg">
          <HelpCard
            title="Premiers pas"
            description="Découvrez comment commencer à utiliser Médiathèque NATAN"
            actions={[
              { label: 'Lire le guide', onClick: () => window.electronAPI.app.onOpenDocs() },
              { label: 'Tutoriel vidéo', onClick: () => window.open('https://youtube.com', '_blank') }
            ]}
          />

          <HelpCard
            title="Gestion des médias"
            description="Apprenez à ajouter, modifier et organiser vos médias"
            actions={[
              { label: 'Ajouter un média', onClick: () => {} },
              { label: 'Importer depuis CSV', onClick: () => {} }
            ]}
          />

          <HelpCard
            title="Dépannage"
            description="Résolvez les problèmes courants"
            actions={[
              { label: 'Problèmes de scan', onClick: () => {} },
              { label: 'Problèmes de synchronisation', onClick: () => {} }
            ]}
          />
        </div>

        <div className="mt-lg p-md bg-tertiary rounded-lg">
          <h4 className="font-medium mb-md">Contact</h4>
          <p className="text-sm text-secondary mb-md">
            Si vous avez besoin d'aide supplémentaire, n'hésitez pas à nous contacter.
          </p>
          <div className="flex flex-col sm:flex-row gap-md">
            <button className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors">
              Envoyer un email
            </button>
            <button className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors">
              Visiter notre site
            </button>
          </div>
        </div>

        <div className="mt-lg p-md bg-tertiary rounded-lg text-center">
          <p className="text-sm text-tertiary">
            Version 1.0.0 • © {new Date().getFullYear()} NATAN Consulting
          </p>
        </div>
      </div>
    </SettingSection>
  </div>
);

// Composants réutilisables

const SettingSection = ({ title, icon, children }) => (
  <div className="space-y-md">
    <div className="flex items-center gap-md">
      <span className="text-tertiary">{icon}</span>
      <h2 className="text-lg font-semibold">{title}</h2>
    </div>
    {children}
  </div>
);

const Toggle = ({ label, value, onChange, description }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="font-medium">{label}</p>
      {description && <p className="text-sm text-tertiary">{description}</p>}
    </div>
    <label className="relative inline-flex items-center cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-tertiary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-accent rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
    </label>
  </div>
);

const RadioGroup = ({ label, value, options, onChange }) => (
  <div className="space-y-md">
    <p className="font-medium">{label}</p>
    <div className="flex flex-wrap gap-md">
      {options.map(option => (
        <label
          key={option.value}
          className={`flex items-center gap-sm p-md rounded-lg cursor-pointer transition-colors ${
            value === option.value ? 'bg-tertiary ring-2 ring-accent' : 'hover:bg-tertiary'
          }`}
        >
          <input
            type="radio"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          <span>{option.icon}</span>
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  </div>
);

const Select = ({ label, value, options, onChange, description }) => (
  <div className="space-y-sm">
    <p className="font-medium">{label}</p>
    {description && <p className="text-sm text-tertiary">{description}</p>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const Input = ({ label, type = 'text', value, onChange, min, max, placeholder, description }) => (
  <div className="space-y-sm">
    <p className="font-medium">{label}</p>
    {description && <p className="text-sm text-tertiary">{description}</p>}
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      min={min}
      max={max}
      placeholder={placeholder}
      className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
    />
  </div>
);

const HelpCard = ({ title, description, actions }) => (
  <div className="bg-tertiary rounded-lg p-md">
    <h3 className="font-medium mb-sm">{title}</h3>
    <p className="text-sm text-secondary mb-md">{description}</p>
    <div className="flex flex-wrap gap-sm">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className="bg-primary border rounded px-md py-sm hover:bg-secondary transition-colors text-sm"
        >
          {action.label}
        </button>
      ))}
    </div>
  </div>
);

export default Settings;
