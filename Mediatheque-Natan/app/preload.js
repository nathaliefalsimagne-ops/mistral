const { contextBridge, ipcRenderer } = require('electron');

// Exposer des APIs sécurisées au renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Méthodes pour la base de données
  db: {
    query: (sql, params) => ipcRenderer.invoke('db-query', { sql, params }),
    queryOne: (sql, params) => ipcRenderer.invoke('db-query-one', { sql, params }),
    execute: (sql, params) => ipcRenderer.invoke('db-execute', { sql, params }),
    
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
      if (filters.hasJacket !== undefined) {
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
        params: [
          media.id, media.title, media.originalTitle, media.typeId, 
          media.releaseYear, media.durationMinutes, media.synopsis, 
          media.averageRating, media.stateId, media.locationId, 
          media.hasJacket ? 1 : 0, media.barcode, media.jacketImageUrl, 
          media.imdbId, media.tmdbId, media.musicbrainzId
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
          media.title, media.originalTitle, media.typeId, media.releaseYear, 
          media.durationMinutes, media.synopsis, media.averageRating, 
          media.stateId, media.locationId, media.hasJacket ? 1 : 0, 
          media.barcode, media.jacketImageUrl, media.imdbId, 
          media.tmdbId, media.musicbrainzId, media.id
        ]
      });
    },
    
    deleteMedia: (id) => {
      return ipcRenderer.invoke('db-execute', {
        sql: 'DELETE FROM media WHERE id = ?',
        params: [id]
      });
    }
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
