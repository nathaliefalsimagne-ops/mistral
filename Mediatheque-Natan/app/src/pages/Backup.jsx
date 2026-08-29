import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import { useModal } from '../contexts/ModalContext';
import {
  ArrowLeft,
  Save,
  Clock,
  Calendar,
  HardDrive,
  Database,
  RefreshCw,
  Trash2,
  Download,
  Upload,
  X,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

const Backup = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { openModal } = useModal();

  const [backups, setBackups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupName, setBackupName] = useState('');
  const [externalDrives, setExternalDrives] = useState([]);
  const [selectedDrive, setSelectedDrive] = useState(null);

  // Charger les sauvegardes
  const loadBackups = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await window.electronAPI.backup.getBackupList();
      
      if (response.success) {
        setBackups(response.data);
      } else {
        showError(response.error || 'Erreur lors du chargement des sauvegardes');
      }
    } catch (err) {
      console.error('Erreur lors du chargement des sauvegardes:', err);
      showError(`Erreur lors du chargement: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  // Charger les disques externes
  const loadExternalDrives = useCallback(async () => {
    try {
      const response = await window.electronAPI.external.detectDrives();
      if (response.success) {
        setExternalDrives(response.data);
      }
    } catch (err) {
      console.error('Erreur lors de la détection des disques:', err);
    }
  }, []);

  // Créer une sauvegarde
  const createBackup = useCallback(async (toExternal = false) => {
    try {
      setIsCreating(true);
      
      let response;
      if (toExternal && selectedDrive) {
        response = await window.electronAPI.backup.create({ 
          backupPath: selectedDrive.path,
          isManual: true 
        });
      } else {
        response = await window.electronAPI.backup.create({ isManual: true });
      }
      
      if (response.success) {
        success(`Sauvegarde créée avec succès${toExternal ? ` vers ${selectedDrive.name}` : ''}`);
        loadBackups();
        setBackupName('');
      } else {
        showError(response.error || 'Erreur lors de la création de la sauvegarde');
      }
    } catch (err) {
      console.error('Erreur lors de la création de la sauvegarde:', err);
      showError(`Erreur lors de la sauvegarde: ${err.message}`);
    } finally {
      setIsCreating(false);
    }
  }, [success, showError, loadBackups, selectedDrive]);

  // Restaurer une sauvegarde
  const restoreBackup = useCallback(async (backup) => {
    if (!backup) return;
    
    if (window.confirm(`Voulez-vous vraiment restaurer la sauvegarde du ${new Date(backup.created_at).toLocaleString('fr-FR')} ?`)) {
      try {
        setIsRestoring(true);
        setSelectedBackup(backup);
        
        const response = await window.electronAPI.backup.restore(backup.backup_path);
        
        if (response.success) {
          success('Sauvegarde restaurée avec succès. L\'application va redémarrer.');
          // Dans une vraie implémentation, on redémarrerait l'application
          setTimeout(() => {
            window.location.reload();
          }, 2000);
        } else {
          showError(response.error || 'Erreur lors de la restauration');
        }
      } catch (err) {
        console.error('Erreur lors de la restauration:', err);
        showError(`Erreur lors de la restauration: ${err.message}`);
      } finally {
        setIsRestoring(false);
        setSelectedBackup(null);
      }
    }
  }, [success, showError]);

  // Supprimer une sauvegarde
  const deleteBackup = useCallback(async (backup) => {
    if (window.confirm(`Voulez-vous vraiment supprimer la sauvegarde du ${new Date(backup.created_at).toLocaleString('fr-FR')} ?`)) {
      try {
        // Supprimer le fichier de sauvegarde
        // Cela serait implémenté avec un appel système
        // Pour l'instant, on simule
        const response = await window.electronAPI.db.execute({
          sql: 'DELETE FROM backups WHERE id = ?',
          params: [backup.id]
        });
        
        if (response.success) {
          success('Sauvegarde supprimée avec succès');
          loadBackups();
        } else {
          showError(response.error || 'Erreur lors de la suppression');
        }
      } catch (err) {
        console.error('Erreur lors de la suppression:', err);
        showError(`Erreur lors de la suppression: ${err.message}`);
      }
    }
  }, [success, showError, loadBackups]);

  // Exporter vers un disque externe
  const exportToExternal = useCallback(async () => {
    if (!selectedDrive) {
      showError('Aucun disque externe sélectionné');
      return;
    }

    try {
      const response = await window.electronAPI.backup.create({
        backupPath: selectedDrive.path,
        isManual: true
      });
      
      if (response.success) {
        success(`Export vers ${selectedDrive.name} terminé`);
        loadBackups();
      } else {
        showError(response.error || 'Erreur lors de l\'export');
      }
    } catch (err) {
      showError(`Erreur lors de l'export: ${err.message}`);
    }
  }, [selectedDrive, success, showError, loadBackups]);

  // Importer depuis un disque externe
  const importFromExternal = useCallback(async () => {
    if (!selectedDrive) {
      showError('Aucun disque externe sélectionné');
      return;
    }

    try {
      const response = await window.electronAPI.external.importFromExternal(selectedDrive.path);
      
      if (response.success) {
        success('Import depuis le disque externe terminé');
        loadBackups();
      } else {
        showError(response.error || 'Erreur lors de l\'import');
      }
    } catch (err) {
      showError(`Erreur lors de l'import: ${err.message}`);
    }
  }, [selectedDrive, success, showError, loadBackups]);

  // Charger les données au montage
  useEffect(() => {
    loadBackups();
    loadExternalDrives();
  }, [loadBackups, loadExternalDrives]);

  // Vérifier une sauvegarde
  const verifyBackup = useCallback(async (backup) => {
    try {
      const response = await window.electronAPI.backup.verifyBackup(backup.backup_path);
      
      if (response.valid) {
        success(`Sauvegarde valide: ${response.size} octets, ${response.tables?.length || 0} tables`);
      } else {
        showError(`Sauvegarde invalide: ${response.error}`);
      }
    } catch (err) {
      showError(`Erreur lors de la vérification: ${err.message}`);
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

  // Formatage de la date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <h1 className="text-2xl font-bold">Gestion des sauvegardes</h1>
          <p className="text-tertiary mt-xs">
            Sauvegardez et restaurez vos données
          </p>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        <StatCard
          icon={<Database className="w-6 h-6" />}
          label="Total sauvegardes"
          value={backups.length}
          color="bg-info"
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          label="Dernière sauvegarde"
          value={backups.length > 0 ? formatDate(backups[0]?.created_at) : 'Aucune'}
          color="bg-success"
        />
        <StatCard
          icon={<Calendar className="w-6 h-6" />}
          label="Sauvegardes récentes"
          value={backups.filter(b => {
            const date = new Date(b.created_at);
            const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return date >= weekAgo;
          }).length}
          color="bg-warning"
          subtitle="cette semaine"
        />
        <StatCard
          icon={<HardDrive className="w-6 h-6" />}
          label="Disques externes"
          value={externalDrives.length}
          color="bg-secondary"
        />
      </div>

      {/* Actions principales */}
      <div className="bg-secondary rounded-xl p-lg">
        <h2 className="text-xl font-semibold mb-md">Actions</h2>
        
        <div className="grid md:grid-cols-2 gap-lg">
          {/* Créer une sauvegarde */}
          <div className="space-y-md">
            <h3 className="font-medium">Créer une sauvegarde</h3>
            <p className="text-sm text-tertiary">
              Sauvegardez votre base de données actuelle et vos fichiers médias.
            </p>
            
            <div className="flex gap-md">
              <button
                onClick={() => createBackup(false)}
                disabled={isCreating}
                className="bg-accent text-white px-md py-sm rounded hover:bg-accent-light transition-colors flex items-center gap-sm disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Sauvegarder maintenant</span>
                  </>
                )}
              </button>
              
              <button
                onClick={loadExternalDrives}
                className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors flex items-center gap-sm"
              >
                <HardDrive className="w-5 h-5" />
                <span>Vers disque externe</span>
              </button>
            </div>
          </div>

          {/* Restaurer une sauvegarde */}
          <div className="space-y-md">
            <h3 className="font-medium">Restaurer une sauvegarde</h3>
            <p className="text-sm text-tertiary">
              Restaurez votre base de données à partir d'une sauvegarde existante.
            </p>
            
            <div className="flex gap-md">
              <button
                onClick={() => {
                  if (backups.length > 0) {
                    openModal({
                      component: RestoreModal,
                      props: {
                        backups,
                        onRestore: restoreBackup,
                        onClose: () => {}
                      }
                    });
                  } else {
                    showError('Aucune sauvegarde disponible');
                  }
                }}
                disabled={backups.length === 0 || isRestoring}
                className="bg-accent text-white px-md py-sm rounded hover:bg-accent-light transition-colors flex items-center gap-sm disabled:opacity-50"
              >
                {isRestoring ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Restauration...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Restaurer une sauvegarde</span>
                  </>
                )}
              </button>
              
              <button
                onClick={loadExternalDrives}
                className="bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors flex items-center gap-sm"
              >
                <Upload className="w-5 h-5" />
                <span>Depuis disque externe</span>
              </button>
            </div>
          </div>
        </div>

        {/* Synchronisation avec disque externe */}
        {externalDrives.length > 0 && (
          <div className="mt-lg pt-lg border-t space-y-md">
            <h3 className="font-medium">Synchronisation avec disque externe</h3>
            
            <div className="flex flex-wrap gap-md">
              {externalDrives.map(drive => (
                <div
                  key={drive.path}
                  onClick={() => setSelectedDrive(drive)}
                  className={`flex items-center gap-md p-md rounded-lg cursor-pointer transition-colors ${
                    selectedDrive?.path === drive.path 
                      ? 'bg-tertiary ring-2 ring-accent' 
                      : 'hover:bg-tertiary'
                  }`}
                >
                  <HardDrive className="w-5 h-5 text-accent" />
                  <div>
                    <p className="font-medium">{drive.name}</p>
                    <p className="text-xs text-tertiary">{drive.path}</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedDrive && (
              <div className="mt-md flex gap-md">
                <button
                  onClick={exportToExternal}
                  className="bg-success text-white px-md py-sm rounded hover:bg-success-light transition-colors flex items-center gap-sm"
                >
                  <Download className="w-5 h-5" />
                  <span>Exporter vers {selectedDrive.name}</span>
                </button>
                <button
                  onClick={importFromExternal}
                  className="bg-info text-white px-md py-sm rounded hover:bg-info-light transition-colors flex items-center gap-sm"
                >
                  <Upload className="w-5 h-5" />
                  <span>Importer depuis {selectedDrive.name}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Liste des sauvegardes */}
      <div className="bg-secondary rounded-xl p-lg">
        <div className="flex items-center justify-between mb-md">
          <h2 className="text-xl font-semibold">Historique des sauvegardes</h2>
          <button
            onClick={loadBackups}
            className="text-sm text-tertiary hover:text-primary transition-colors flex items-center gap-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Actualiser</span>
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mx-auto" />
            <p className="mt-md text-tertiary">Chargement...</p>
          </div>
        ) : backups.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-sm px-md font-medium">Date</th>
                  <th className="text-left py-sm px-md font-medium">Taille</th>
                  <th className="text-left py-sm px-md font-medium">Médias</th>
                  <th className="text-left py-sm px-md font-medium">Utilisateurs</th>
                  <th className="text-left py-sm px-md font-medium">Emplacement</th>
                  <th className="text-left py-sm px-md font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map(backup => (
                  <tr
                    key={backup.id}
                    className="border-b last:border-0 hover:bg-tertiary transition-colors"
                  >
                    <td className="py-sm px-md">
                      <div>
                        <p className="font-medium">{formatDate(backup.created_at)}</p>
                        <p className="text-xs text-tertiary">
                          {backup.is_external ? 'Externe' : 'Local'}
                        </p>
                      </div>
                    </td>
                    <td className="py-sm px-md">{formatSize(backup.size_bytes)}</td>
                    <td className="py-sm px-md">{backup.media_count}</td>
                    <td className="py-sm px-md">{backup.user_count}</td>
                    <td className="py-sm px-md">
                      {backup.is_external ? (
                        <span className="text-xs bg-info text-white px-sm py-xs rounded">
                          Disque externe
                        </span>
                      ) : (
                        <span className="text-xs bg-success text-white px-sm py-xs rounded">
                          Local
                        </span>
                      )}
                    </td>
                    <td className="py-sm px-md">
                      <div className="flex items-center gap-sm">
                        <button
                          onClick={() => verifyBackup(backup)}
                          className="text-secondary hover:text-primary transition-colors"
                          title="Vérifier"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => restoreBackup(backup)}
                          className="text-info hover:text-info-light transition-colors"
                          title="Restaurer"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteBackup(backup)}
                          className="text-danger hover:text-danger-light transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-lg">
            <p className="text-tertiary mb-md">Aucune sauvegarde disponible</p>
            <button
              onClick={() => createBackup(false)}
              className="bg-accent text-white px-md py-sm rounded hover:bg-accent-light transition-colors"
            >
              Créer la première sauvegarde
            </button>
          </div>
        )}
      </div>

      {/* Conseils */}
      <div className="bg-tertiary rounded-xl p-lg">
        <h2 className="text-lg font-semibold mb-md">Conseils pour les sauvegardes</h2>
        <div className="grid md:grid-cols-3 gap-lg">
          <TipCard
            icon={<Clock className="w-6 h-6" />}
            title="Sauvegardes automatiques"
            description="Activez les sauvegardes automatiques dans les paramètres pour ne jamais perdre vos données."
          />
          <TipCard
            icon={<HardDrive className="w-6 h-6" />}
            title="Stockage externe"
            description="Utilisez un disque externe pour stocker vos sauvegardes et les protéger contre les pannes de disque."
          />
          <TipCard
            icon={<Database className="w-6 h-6" />}
            title="Vérification régulière"
            description="Vérifiez régulièrement l'intégrité de vos sauvegardes pour vous assurer qu'elles sont valides."
          />
        </div>
      </div>
    </div>
  );
};

// Composant StatCard
const StatCard = ({ icon, label, value, color, subtitle }) => (
  <div className="bg-secondary rounded-xl p-lg">
    <div className="flex items-center gap-md">
      <div className={`p-sm rounded-lg ${color}`}>
        <span className="text-white">{icon}</span>
      </div>
      <div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-sm text-tertiary">{label}</p>
        {subtitle && <p className="text-xs text-secondary mt-xs">{subtitle}</p>}
      </div>
    </div>
  </div>
);

// Composant TipCard
const TipCard = ({ icon, title, description }) => (
  <div className="space-y-sm">
    <div className="flex items-center gap-md">
      <div className="p-sm rounded-lg bg-primary">
        <span className="text-accent">{icon}</span>
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-secondary">{description}</p>
      </div>
    </div>
  </div>
);

// Modal de restauration
const RestoreModal = ({ backups, onRestore, onClose }) => {
  const [selectedBackup, setSelectedBackup] = useState(null);

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Restaurer une sauvegarde</h2>
        <button
          onClick={onClose}
          className="text-tertiary hover:text-primary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p className="text-secondary text-sm">
        Sélectionnez une sauvegarde à restaurer. Cette opération remplacera votre base de données actuelle.
      </p>

      <div className="space-y-sm max-h-80 overflow-y-auto">
        {backups.map(backup => (
          <button
            key={backup.id}
            onClick={() => setSelectedBackup(backup)}
            className={`w-full flex items-center gap-md p-md rounded-lg text-left transition-colors ${
              selectedBackup?.id === backup.id 
                ? 'bg-tertiary ring-2 ring-accent' 
                : 'hover:bg-tertiary'
            }`}
          >
            <div className="flex-1">
              <p className="font-medium">
                {new Date(backup.created_at).toLocaleString('fr-FR')}
              </p>
              <p className="text-xs text-tertiary">
                {backup.media_count} médias • {backup.user_count} utilisateurs • {backup.size_bytes} octets
              </p>
            </div>
            {selectedBackup?.id === backup.id && (
              <CheckCircle className="w-5 h-5 text-accent" />
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-end gap-md pt-md border-t">
        <button
          onClick={onClose}
          className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
        >
          Annuler
        </button>
        <button
          onClick={() => selectedBackup && onRestore(selectedBackup)}
          disabled={!selectedBackup}
          className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors disabled:opacity-50"
        >
          Restaurer
        </button>
      </div>
    </div>
  );
};

export default Backup;
