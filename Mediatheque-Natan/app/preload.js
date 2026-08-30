const { contextBridge, ipcRenderer } = require('electron');

// Certains appels dans le code du renderer passent { sql, params } en premier
// argument au lieu de (sql, params) positionnels. Un objet atterrissant à la
// place d'une chaîne SQL dans le binding natif sqlite3 provoque un crash du
// processus (pas une simple erreur JS) : on normalise donc les deux formes
// ici plutôt que de compter sur chaque appelant.
const normalizeSqlArgs = (sqlOrOptions, maybeParams) => {
  if (sqlOrOptions && typeof sqlOrOptions === 'object') {
    return { sql: sqlOrOptions.sql, params: sqlOrOptions.params || [] };
  }
  return { sql: sqlOrOptions, params: maybeParams || [] };
};

// Exposer des APIs sécurisées au renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Méthodes pour la base de données
  db: {
    query: (sql, params) => ipcRenderer.invoke('db-query', normalizeSqlArgs(sql, params)),
    queryOne: (sql, params) => ipcRenderer.invoke('db-query-one', normalizeSqlArgs(sql, params)),
    execute: (sql, params) => ipcRenderer.invoke('db-execute', normalizeSqlArgs(sql, params)),
    
    // Méthodes utilitaires pour la base de données
    getMedia: (filters = {}) => {
      let sql = 'SELECT * FROM media WHERE 1=1';
      const params = [];
      
      if (filters.title) {
        sql += ' AND title LIKE ?';
        params.push(`%${filters.title}%`);
      }
      if (filters.type) {
        sql += ' AND type_id = ?';
        params.push(filters.type);
      }
      if (filters.year) {
        sql += ' AND release_year = ?';
        params.push(filters.year);
      }
      if (filters.barcode) {
        sql += ' AND barcode = ?';
        params.push(filters.barcode);
      }
      if (filters.location) {
        sql += ' AND location_id = ?';
        params.push(filters.location);
      }
      // Le filtre "par défaut" (aucun filtre choisi) vaut `null` partout dans
      // l'app (état initial de DatabaseContext, réinitialisation des
      // filtres...), jamais `undefined`. Une vérification sur `undefined`
      // uniquement était donc TOUJOURS vraie, forçant has_jacket = 0 sur
      // toutes les recherches par défaut - masquant silencieusement tous les
      // médias enregistrés avec jaquette (l'option cochée par défaut à
      // l'ajout), y compris dans les statistiques du tableau de bord.
      if (filters.hasJacket !== null && filters.hasJacket !== undefined) {
        sql += ' AND has_jacket = ?';
        params.push(filters.hasJacket ? 1 : 0);
      }
      
      sql += ' ORDER BY title';
      
      return ipcRenderer.invoke('db-query', { sql, params });
    },
    
    getMediaById: (id) => {
      return ipcRenderer.invoke('db-query-one', {
        sql: 'SELECT * FROM media WHERE id = ?',
        params: [id]
      });
    },
    
    searchMedia: (query) => {
      return ipcRenderer.invoke('db-query', {
        sql: `SELECT * FROM media 
               WHERE title LIKE ? OR original_title LIKE ? OR synopsis LIKE ?
               ORDER BY title`,
        params: [`%${query}%`, `%${query}%`, `%${query}%`]
      });
    },
    
    getLocations: () => {
      return ipcRenderer.invoke('db-query', {
        sql: 'SELECT * FROM locations ORDER BY name'
      });
    },

    getLocationTypes: () => {
      return ipcRenderer.invoke('db-query', {
        sql: 'SELECT * FROM location_types ORDER BY name'
      });
    },

    addLocation: (location) => {
      return ipcRenderer.invoke('db-execute', {
        sql: `INSERT INTO locations (id, name, type_id, capacity_max, description)
              VALUES (?, ?, ?, ?, ?)`,
        params: [
          location.id, location.name, location.type_id,
          location.capacity_max || null, location.description || null
        ]
      });
    },


    getCategories: () => {
      return ipcRenderer.invoke('db-query', {
        sql: 'SELECT * FROM categories ORDER BY name'
      });
    },
    
    getPersons: (filters = {}) => {
      let sql = 'SELECT * FROM persons WHERE 1=1';
      const params = [];
      
      if (filters.name) {
        sql += ' AND (first_name LIKE ? OR last_name LIKE ?)';
        params.push(`%${filters.name}%`, `%${filters.name}%`);
      }
      if (filters.type) {
        sql += ' AND type_id = ?';
        params.push(filters.type);
      }
      
      sql += ' ORDER BY last_name, first_name';
      
      return ipcRenderer.invoke('db-query', { sql, params });
    },
    
    getUsers: () => {
      return ipcRenderer.invoke('db-query', {
        sql: 'SELECT * FROM users ORDER BY last_name, first_name'
      });
    },
    
    getLoans: (filters = {}) => {
      let sql = 'SELECT * FROM loans WHERE 1=1';
      const params = [];
      
      if (filters.userId) {
        sql += ' AND user_id = ?';
        params.push(filters.userId);
      }
      if (filters.mediaId) {
        sql += ' AND media_id = ?';
        params.push(filters.mediaId);
      }
      if (filters.returned !== undefined) {
        if (filters.returned) {
          sql += ' AND return_date IS NOT NULL';
        } else {
          sql += ' AND return_date IS NULL';
        }
      }
      
      sql += ' ORDER BY loan_date DESC';
      
      return ipcRenderer.invoke('db-query', { sql, params });
    },
    
    addMedia: (media) => {
      return ipcRenderer.invoke('db-execute', {
        sql: `INSERT INTO media (
          id, title, original_title, type_id, release_year, duration_minutes, 
          synopsis, average_rating, state_id, location_id, has_jacket, 
          barcode, jacket_image_url, imdb_id, tmdb_id, musicbrainz_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        // Le formulaire (AddMedia.jsx) et le schéma SQL utilisent tous les
        // deux le snake_case (type_id, original_title...) : lire ici des
        // clés camelCase (typeId...) revenait à envoyer `undefined` pour
        // chaque colonne, d'où le NOT NULL constraint failed sur type_id.
        params: [
          media.id, media.title, media.original_title, media.type_id,
          media.release_year, media.duration_minutes, media.synopsis,
          media.average_rating, media.state_id, media.location_id,
          media.has_jacket ? 1 : 0, media.barcode, media.jacket_image_url,
          media.imdb_id, media.tmdb_id, media.musicbrainz_id
        ]
      });
    },

    updateMedia: (media) => {
      return ipcRenderer.invoke('db-execute', {
        sql: `UPDATE media SET
          title = ?, original_title = ?, type_id = ?, release_year = ?,
          duration_minutes = ?, synopsis = ?, average_rating = ?,
          state_id = ?, location_id = ?, has_jacket = ?, barcode = ?,
          jacket_image_url = ?, imdb_id = ?, tmdb_id = ?, musicbrainz_id = ?,
          updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
        params: [
          media.title, media.original_title, media.type_id, media.release_year,
          media.duration_minutes, media.synopsis, media.average_rating,
          media.state_id, media.location_id, media.has_jacket ? 1 : 0,
          media.barcode, media.jacket_image_url, media.imdb_id,
          media.tmdb_id, media.musicbrainz_id, media.id
        ]
      });
    },
    
    deleteMedia: (id) => {
      return ipcRenderer.invoke('db-execute', {
        sql: 'DELETE FROM media WHERE id = ?',
        params: [id]
      });
    },

    saveMediaPersons: (mediaId, persons) => ipcRenderer.invoke('save-media-persons', { mediaId, persons }),
    getMediaPersons: (mediaId) => ipcRenderer.invoke('get-media-persons', mediaId)
  },
  
  // Méthodes pour la configuration
  config: {
    get: () => ipcRenderer.invoke('get-config'),
    update: (newConfig) => ipcRenderer.invoke('update-config', newConfig)
  },
  
  // Méthodes pour les disques externes
  external: {
    detectDrives: () => ipcRenderer.invoke('detect-external-drives'),
    importFromExternal: (drivePath, merge) => ipcRenderer.invoke('import-from-external', { drivePath, merge }),
    exportToExternal: (drivePath) => ipcRenderer.invoke('export-to-external', { drivePath }),
    syncWithExternal: (drivePath) => ipcRenderer.invoke('sync-with-external', { drivePath })
  },
  
  // Méthodes pour les sauvegardes
  backup: {
    create: (backupPath) => ipcRenderer.invoke('create-backup', { backupPath }),
    restore: (backupPath) => ipcRenderer.invoke('restore-backup', { backupPath }),
    getBackups: () => ipcRenderer.invoke('get-backups'),
    getBackupList: () => {
      return ipcRenderer.invoke('get-backups').then(result => {
        if (result.success) {
          return result.data;
        }
        return [];
      });
    }
  },
  
  // Méthodes pour le scan et la reconnaissance
  scanner: {
    scanBarcode: (imagePath) => ipcRenderer.invoke('scan-barcode', { imagePath }),
    visualRecognition: (imagePath) => ipcRenderer.invoke('visual-recognition', { imagePath })
  },
  
  // Méthodes pour les APIs externes
  api: {
    searchTMDB: (query, type) => ipcRenderer.invoke('search-tmdb', { query, type }),
    getTmdbCredits: (id, type) => ipcRenderer.invoke('get-tmdb-credits', { id, type }),
    searchMusicBrainz: (query) => ipcRenderer.invoke('search-musicbrainz', { query })
  },

  // Méthodes pour les profils (façon Netflix)
  profiles: {
    list: () => ipcRenderer.invoke('list-profiles'),
    create: (profile) => ipcRenderer.invoke('create-profile', profile),
    update: (update) => ipcRenderer.invoke('update-profile-details', update),
    delete: (profileId) => ipcRenderer.invoke('delete-profile', { profileId }),
    verifyPin: (profileId, pin) => ipcRenderer.invoke('verify-profile-pin', { profileId, pin })
  },

  // Méthodes pour le scan de code-barres depuis le mobile (QR code)
  mobileScan: {
    startSession: () => ipcRenderer.invoke('start-mobile-scan-session'),
    onResult: (callback) => ipcRenderer.on('mobile-scan-result', callback),
    removeResultListener: (callback) => ipcRenderer.removeListener('mobile-scan-result', callback)
  },
  
  // Méthodes pour les notifications
  notify: {
    show: (title, message) => {
      // Utiliser l'API de notification du navigateur
      if (Notification.permission === 'granted') {
        new Notification(title, { body: message });
      }
    },
    requestPermission: () => {
      return Notification.requestPermission();
    }
  },
  
  // Méthodes pour les dialogues
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options)
  },
  
  // Méthodes pour les actions de l'application
  app: {
    onNewMedia: (callback) => ipcRenderer.on('new-media', callback),
    onFocusSearch: (callback) => ipcRenderer.on('focus-search', callback),
    onImportCSV: (callback) => ipcRenderer.on('import-csv', callback),
    onImportExternal: (callback) => ipcRenderer.on('import-external', callback),
    onExportCSV: (callback) => ipcRenderer.on('export-csv', callback),
    onExportExternal: (callback) => ipcRenderer.on('export-external', callback),
    onBackupNow: (callback) => ipcRenderer.on('backup-now', callback),
    onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
    onOpenBarcodeScanner: (callback) => ipcRenderer.on('open-barcode-scanner', callback),
    onOpenVisualRecognition: (callback) => ipcRenderer.on('open-visual-recognition', callback),
    onOpenStats: (callback) => ipcRenderer.on('open-stats', callback),
    onOpenDashboard: (callback) => ipcRenderer.on('open-dashboard', callback),
    onOpenDocs: (callback) => ipcRenderer.on('open-docs', callback),
    onOpenAbout: (callback) => ipcRenderer.on('open-about', callback),
    onSyncExternal: (callback) => ipcRenderer.on('sync-external', callback)
  },
  
  // Méthodes utilitaires
  utils: {
    generateId: () => {
      // Générer un UUID v4
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },
    
    formatDate: (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    },
    
    formatDuration: (minutes) => {
      if (!minutes) return '';
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    },
    
    getMediaTypeLabel: (typeId) => {
      const types = {
        1: 'DVD',
        2: 'Blu-ray',
        3: 'CD',
        4: 'Vinyl'
      };
      return types[typeId] || 'Inconnu';
    },
    
    getMediaStateLabel: (stateId) => {
      const states = {
        1: 'Neuf',
        2: 'Bon',
        3: 'Moyen',
        4: 'Usagé'
      };
      return states[stateId] || 'Inconnu';
    }
  }
});

// Exporter pour les tests
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    electronAPI
  };
}
