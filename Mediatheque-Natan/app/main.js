const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const uuid = require('uuid');
const { SCHEMA_SQL } = require('./db-schema');
const { importMovieBuddyRows } = require('./importers/movieBuddy');
const csvParser = require('csv-parser');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const mobileScanServer = require('./mobileScanServer');

// Configuration du logging (remplace electronLog par console)
const log = console;

// Variables globales
let mainWindow;
let db;
let config = {};

// Chemins par défaut
const DEFAULT_PATHS = {
  data: path.join(app.getPath('userData'), 'data'),
  media: path.join(app.getPath('userData'), 'media'),
  backups: path.join(app.getPath('userData'), 'backups'),
  external: null
};

// Charger la configuration
function loadConfig() {
  try {
    const configPath = path.join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      // Compatibilité avec une config.json créée avant l'ajout de cette section
      if (!config.api) {
        config.api = { tmdb: { enabled: false, apiKey: '' }, musicBrainz: { enabled: true, apiKey: '' } };
      }
      log.log('Configuration chargée depuis', configPath);
    } else {
      // Configuration par défaut
      config = {
        paths: { ...DEFAULT_PATHS },
        database: {
          name: 'mediatheque.db',
          encrypt: false,
          encryptionKey: null
        },
        backup: {
          enabled: true,
          frequency: 'daily',
          maxBackups: 30
        },
        recognition: {
          enabled: true,
          useCloud: false,
          confidenceThreshold: 0.85
        },
        api: {
          tmdb: { enabled: false, apiKey: '' },
          musicBrainz: { enabled: true, apiKey: '' }
        },
        recommendations: {
          enabled: true,
          weights: {
            historySimilarity: 0.4,
            categoryPopularity: 0.2,
            trend: 0.15,
            seasonality: 0.1,
            diversity: 0.1,
            newArrivals: 0.05
          }
        },
        language: 'fr',
        theme: 'system'
      };
      
      // Créer les répertoires par défaut
      Object.values(config.paths).forEach(p => {
        if (p && !fs.existsSync(p)) {
          fs.mkdirSync(p, { recursive: true });
        }
      });
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      log.log('Configuration par défaut créée');
    }
    
    // Vérifier et créer les répertoires nécessaires
    Object.values(config.paths).forEach(p => {
      if (p && !fs.existsSync(p)) {
        fs.mkdirSync(p, { recursive: true });
      }
    });
    
    return config;
  } catch (error) {
    log.error('Erreur lors du chargement de la configuration:', error);
    throw error;
  }
}

// Initialiser la base de données
function initDatabase() {
  try {
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = path.join(config.paths.data, config.database.name);
    
    // Vérifier si la base existe déjà
    const dbExists = fs.existsSync(dbPath);
    
    // Initialiser la connexion
    db = new sqlite3.Database(dbPath);
    
    if (!dbExists) {
      log.log('Création d\'une nouvelle base de données');
      createDatabaseSchema();
    } else {
      log.log('Connexion à la base de données existante');
      // Vérifier la version du schéma
      checkDatabaseSchema();
    }
    
    return db;
  } catch (error) {
    log.error('Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
}

// Créer le schéma de la base de données
function createDatabaseSchema() {
  const schema = SCHEMA_SQL;

  db.exec(schema, (err) => {
    if (err) {
      log.error('Erreur lors de la création du schéma:', err);
      throw err;
    }
    log.log('Schéma de la base de données créé');
  });
}

// Vérifier la version du schéma
function checkDatabaseSchema() {
  try {
    const sql = 'SELECT schema_version FROM version_info ORDER BY schema_version DESC LIMIT 1';
    
    db.get(sql, (err, version) => {
      if (err) {
        log.error('Erreur lors de la vérification du schéma:', err);
        createDatabaseSchema();
        return;
      }
      
      const currentVersion = version ? version.schema_version : 0;
      log.log(`Version du schéma actuelle: ${currentVersion}`);
      
      if (currentVersion < 1) {
        createDatabaseSchema();
        db.run('INSERT OR REPLACE INTO version_info (schema_version, description) VALUES (1, ?)', ['Migration vers version 1']);
      }
    });
  } catch (error) {
    log.error('Erreur lors de la vérification du schéma:', error);
    createDatabaseSchema();
  }
}

// Importer une collection depuis un export CSV Movie Buddy
async function importFromMovieBuddyDialog() {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Importer depuis Movie Buddy',
    filters: [{ name: 'Fichiers CSV', extensions: ['csv'] }],
    properties: ['openFile']
  });

  if (canceled || filePaths.length === 0) return;

  try {
    const rows = await new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePaths[0])
        .pipe(csvParser())
        .on('data', (row) => results.push(row))
        .on('end', () => resolve(results))
        .on('error', reject);
    });

    const { imported, errors } = await importMovieBuddyRows(db, rows);

    mainWindow.webContents.send('import-movie-buddy-result', { imported, errors, total: rows.length });

    await dialog.showMessageBox(mainWindow, {
      type: errors > 0 ? 'warning' : 'info',
      title: 'Import Movie Buddy',
      message: `${imported} média(s) importé(s) sur ${rows.length}.` + (errors > 0 ? `\n${errors} erreur(s) — voir la console pour le détail.` : '')
    });
  } catch (error) {
    log.error('Erreur lors de l\'import Movie Buddy:', error);
    await dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Import Movie Buddy',
      message: `Échec de l'import: ${error.message}`
    });
  }
}

// Créer la fenêtre principale
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'Médiathèque NATAN',
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true
    }
  });

  // Charger l'interface
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  // Gérer la fermeture
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Menu personnalisé
  createMenu();
}

// Créer le menu
function createMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Nouveau média', accelerator: 'CmdOrCtrl+N', click: () => mainWindow.webContents.send('new-media') },
        { label: 'Rechercher', accelerator: 'CmdOrCtrl+F', click: () => mainWindow.webContents.send('focus-search') },
        { type: 'separator' },
        { label: 'Importer depuis...', submenu: [
          { label: 'Fichier CSV', click: () => mainWindow.webContents.send('import-csv') },
          { label: 'Disque externe', click: () => mainWindow.webContents.send('import-external') },
          { label: 'Movie Buddy', click: () => importFromMovieBuddyDialog() }
        ] },
        { label: 'Exporter...', submenu: [
          { label: 'Vers CSV', click: () => mainWindow.webContents.send('export-csv') },
          { label: 'Vers disque externe', click: () => mainWindow.webContents.send('export-external') }
        ] },
        { type: 'separator' },
        { label: 'Sauvegarder maintenant', click: () => mainWindow.webContents.send('backup-now') },
        { type: 'separator' },
        { label: 'Quitter', accelerator: 'CmdOrCtrl+Q', role: 'quit' }
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Rétablir', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Préférences', click: () => mainWindow.webContents.send('open-settings') }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Actualiser', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Zoom avant', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Zoom arrière', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { label: 'Réinitialiser le zoom', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Plein écran', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Outils',
      submenu: [
        { label: 'Scanner code-barres', click: () => mainWindow.webContents.send('open-barcode-scanner') },
        { label: 'Reconnaissance visuelle', click: () => mainWindow.webContents.send('open-visual-recognition') },
        { label: 'Synchroniser avec disque externe', click: () => mainWindow.webContents.send('sync-external') },
        { type: 'separator' },
        { label: 'Statistiques', click: () => mainWindow.webContents.send('open-stats') },
        { label: 'Tableau de bord', click: () => mainWindow.webContents.send('open-dashboard') }
      ]
    },
    {
      label: 'Aide',
      submenu: [
        { label: 'Documentation', click: () => mainWindow.webContents.send('open-docs') },
        { label: 'À propos', click: () => mainWindow.webContents.send('open-about') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Détecter les disques externes
function detectExternalDrives() {
  try {
    let drives = [];
    
    if (process.platform === 'win32') {
      // Windows
      const output = execSync('wmic logicaldisk get deviceid,volumename,description').toString();
      const lines = output.split('\n');
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s{2,}/);
        if (parts.length >= 2 && parts[0] && parts[0].match(/^[A-Za-z]:$/)) {
          drives.push({
            path: parts[0],
            name: parts[1] || 'Disque amovible',
            type: 'external'
          });
        }
      }
    } else if (process.platform === 'darwin') {
      // macOS
      const output = execSync('diskutil list').toString();
      const lines = output.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('/dev/disk') && !lines[i].includes('synthesized')) {
          const match = lines[i].match(/\/dev\/disk(\d+)/);
          if (match) {
            const diskNumber = match[1];
            const mountPointMatch = lines[i + 1]?.match(/\/Volumes\/([^\s]+)/);
            if (mountPointMatch) {
              drives.push({
                path: `/Volumes/${mountPointMatch[1]}`,
                name: mountPointMatch[1],
                type: 'external'
              });
            }
          }
        }
      }
    } else {
      // Linux
      const output = execSync('lsblk -o NAME,MOUNTPOINT,LABEL').toString();
      const lines = output.split('\n');
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 2 && parts[1] && parts[1].startsWith('/')) {
          drives.push({
            path: parts[1],
            name: parts[2] || 'Disque amovible',
            type: 'external'
          });
        }
      }
    }
    
    // Vérifier si un disque contient une base de données NATAN
    const natanDrives = [];
    for (const drive of drives) {
      try {
        const dbPath = path.join(drive.path, 'Mediatheque-Natan', 'data', 'mediatheque.db');
        const oldDbPath = path.join(drive.path, 'mediatheque.db');
        
        if (fs.existsSync(dbPath) || fs.existsSync(oldDbPath)) {
          natanDrives.push({
            ...drive,
            hasNatanDb: true,
            dbPath: fs.existsSync(dbPath) ? dbPath : oldDbPath
          });
        }
      } catch (error) {
        log.error(`Erreur lors de la vérification du disque ${drive.path}:`, error);
      }
    }
    
    log.log('Disques externes détectés:', natanDrives);
    return natanDrives;
  } catch (error) {
    log.error('Erreur lors de la détection des disques externes:', error);
    return [];
  }
}

// Gérer les erreurs non capturées
process.on('uncaughtException', (error) => {
  log.error('Erreur non capturée:', error);
  dialog.showErrorBox('Erreur critique', `Une erreur inattendue est survenue: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Rejet non géré:', reason);
  dialog.showErrorBox('Erreur', `Un rejet de promesse n'a pas été géré: ${reason}`);
});

// Initialisation de l'application
app.whenReady().then(() => {
  try {
    // Charger la configuration
    config = loadConfig();
    
    // Initialiser la base de données
    db = initDatabase();
    
    // Détecter les disques externes
    const externalDrives = detectExternalDrives();
    
    // Créer la fenêtre principale
    createWindow();
    
    // Configurer les canaux IPC
    setupIPC();

    // Transmettre au renderer les codes-barres scannés depuis le mobile
    mobileScanServer.on('result', ({ barcode }) => {
      if (mainWindow) {
        mainWindow.webContents.send('mobile-scan-result', { barcode });
      }
    });

    log.log('Application initialisée avec succès');
  } catch (error) {
    log.error('Erreur lors de l\'initialisation:', error);
    dialog.showErrorBox('Erreur', `Impossible de démarrer l'application: ${error.message}`);
    app.quit();
  }
});

// Fermeture de l'application
app.on('window-all-closed', () => {
  mobileScanServer.stop();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Configuration des canaux IPC
function setupIPC() {
  // Canal pour exécuter des requêtes sur la base de données
  ipcMain.handle('db-query', (event, { sql, params = [] }) => {
    return new Promise((resolve) => {
      db.all(sql, params, (err, rows) => {
        if (err) {
          log.error('Erreur lors de l\'exécution de la requête:', err);
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true, data: rows });
        }
      });
    });
  });

  // Canal pour exécuter des requêtes avec retour unique
  ipcMain.handle('db-query-one', (event, { sql, params = [] }) => {
    return new Promise((resolve) => {
      db.get(sql, params, (err, row) => {
        if (err) {
          log.error('Erreur lors de l\'exécution de la requête:', err);
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true, data: row });
        }
      });
    });
  });

  // Canal pour exécuter des requêtes d'insertion/mise à jour
  ipcMain.handle('db-execute', (event, { sql, params = [] }) => {
    return new Promise((resolve) => {
      db.run(sql, params, function(err) {
        if (err) {
          log.error('Erreur lors de l\'exécution:', err);
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true, data: { lastID: this.lastID, changes: this.changes } });
        }
      });
    });
  });

  // Canal pour obtenir la configuration
  ipcMain.handle('get-config', () => {
    return { success: true, data: config };
  });

  // Canal pour mettre à jour la configuration
  ipcMain.handle('update-config', (event, newConfig) => {
    try {
      config = { ...config, ...newConfig };
      const configPath = path.join(app.getPath('userData'), 'config.json');
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      return { success: true, data: config };
    } catch (error) {
      log.error('Erreur lors de la mise à jour de la configuration:', error);
      return { success: false, error: error.message };
    }
  });

  // Canal pour détecter les disques externes
  ipcMain.handle('detect-external-drives', async () => {
    return { success: true, data: detectExternalDrives() };
  });

  // Canal pour importer depuis un disque externe
  ipcMain.handle('import-from-external', async (event, { drivePath, merge = true }) => {
    try {
      return { success: true, message: 'Import en cours...' };
    } catch (error) {
      log.error('Erreur lors de l\'import:', error);
      return { success: false, error: error.message };
    }
  });

  // Canal pour exporter vers un disque externe
  ipcMain.handle('export-to-external', async (event, { drivePath }) => {
    try {
      return { success: true, message: 'Export en cours...' };
    } catch (error) {
      log.error('Erreur lors de l\'export:', error);
      return { success: false, error: error.message };
    }
  });

  // Canal pour créer une sauvegarde
  ipcMain.handle('create-backup', async (event, { backupPath }) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(
        backupPath || config.paths.backups,
        `mediatheque_backup_${timestamp}.db`
      );
      
      // Copier la base de données
      const dbPath = path.join(config.paths.data, config.database.name);
      fs.copyFileSync(dbPath, backupFile);
      
      // Enregistrer dans la table backups
      const size = fs.statSync(backupFile).size;
      const mediaCount = 0; // À implémenter avec une requête asynchrone si nécessaire
      const userCount = 0; // À implémenter avec une requête asynchrone si nécessaire
      
      db.run(
        `INSERT INTO backups (id, backup_path, size_bytes, media_count, user_count) VALUES (?, ?, ?, ?, ?)`,
        [uuid.v4(), backupFile, size, mediaCount, userCount],
        function(err) {
          if (err) {
            log.error('Erreur lors de la sauvegarde:', err);
          }
        }
      );
      
      return { success: true, path: backupFile };
    } catch (error) {
      log.error('Erreur lors de la sauvegarde:', error);
      return { success: false, error: error.message };
    }
  });

  // Canal pour restaurer une sauvegarde
  ipcMain.handle('restore-backup', async (event, { backupPath }) => {
    try {
      // Fermer la connexion à la base actuelle
      db.close();
      
      // Copier la sauvegarde
      const dbPath = path.join(config.paths.data, config.database.name);
      fs.copyFileSync(backupPath, dbPath);
      
      // Réinitialiser la connexion
      db = new sqlite3.Database(dbPath);
      
      return { success: true, message: 'Sauvegarde restaurée avec succès' };
    } catch (error) {
      log.error('Erreur lors de la restauration:', error);
      // Réouvrir la base d'origine si possible
      try {
        db = new sqlite3.Database(path.join(config.paths.data, config.database.name));
      } catch (e) {
        log.error('Erreur critique lors de la réouverture de la base:', e);
      }
      return { success: false, error: error.message };
    }
  });

  // Canal pour obtenir la liste des sauvegardes
  ipcMain.handle('get-backups', () => {
    return new Promise((resolve) => {
      db.all('SELECT * FROM backups ORDER BY created_at DESC', (err, backups) => {
        if (err) {
          log.error('Erreur lors de la récupération des sauvegardes:', err);
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true, data: backups });
        }
      });
    });
  });

  // Canal pour scanner un code-barres
  ipcMain.handle('scan-barcode', async (event, { imagePath }) => {
    try {
      return { success: true, barcode: '1234567890' }; // Exemple
    } catch (error) {
      log.error('Erreur lors du scan:', error);
      return { success: false, error: error.message };
    }
  });

  // Canal pour la reconnaissance visuelle
  ipcMain.handle('visual-recognition', async (event, { imagePath }) => {
    try {
      return { success: true, matches: [] };
    } catch (error) {
      log.error('Erreur lors de la reconnaissance visuelle:', error);
      return { success: false, error: error.message };
    }
  });

  // Canal pour rechercher dans TMDB
  ipcMain.handle('search-tmdb', async (event, { query, type = 'movie' }) => {
    try {
      const tmdbConfig = config.api?.tmdb;
      if (!tmdbConfig?.enabled || !tmdbConfig?.apiKey) {
        return { success: false, error: 'Configurez votre clé API TMDB dans Paramètres > APIs externes.' };
      }

      const searchResponse = await axios.get(`https://api.themoviedb.org/3/search/${type}`, {
        params: { api_key: tmdbConfig.apiKey, query, language: 'fr-FR' }
      });

      const topResults = (searchResponse.data.results || []).slice(0, 5);

      // Compléter avec la durée et l'ID IMDb (absents des résultats de recherche)
      const enriched = await Promise.all(
        topResults.map(async (item) => {
          try {
            const detail = await axios.get(`https://api.themoviedb.org/3/${type}/${item.id}`, {
              params: { api_key: tmdbConfig.apiKey, language: 'fr-FR' }
            });
            return {
              id: item.id,
              title: item.title || item.name,
              original_title: item.original_title || item.original_name,
              release_year: (item.release_date || item.first_air_date || '').slice(0, 4) || null,
              overview: item.overview,
              vote_average: item.vote_average,
              poster_path: item.poster_path,
              runtime: detail.data.runtime || (detail.data.episode_run_time || [])[0] || null,
              imdb_id: detail.data.imdb_id || null
            };
          } catch (detailError) {
            log.error('Erreur lors de la récupération des détails TMDB:', detailError.message);
            return {
              id: item.id,
              title: item.title || item.name,
              original_title: item.original_title || item.original_name,
              release_year: (item.release_date || item.first_air_date || '').slice(0, 4) || null,
              overview: item.overview,
              vote_average: item.vote_average,
              poster_path: item.poster_path,
              runtime: null,
              imdb_id: null
            };
          }
        })
      );

      return { success: true, results: enriched };
    } catch (error) {
      log.error('Erreur lors de la recherche TMDB:', error.message);
      const message = error.response?.status === 401
        ? 'Clé API TMDB invalide.'
        : 'Erreur lors de la recherche TMDB (vérifiez votre connexion internet).';
      return { success: false, error: message };
    }
  });

  // Canal pour rechercher dans MusicBrainz (pas de clé API nécessaire)
  ipcMain.handle('search-musicbrainz', async (event, { query }) => {
    try {
      const response = await axios.get('https://musicbrainz.org/ws/2/release/', {
        params: { query, fmt: 'json', limit: 5 },
        headers: { 'User-Agent': 'MediathequeNatan/1.0 (+https://github.com/nathaliefalsimagne-ops/mistral)' }
      });

      const results = (response.data.releases || []).map((release) => ({
        id: release.id,
        title: release.title,
        artist: (release['artist-credit'] || []).map((a) => a.name).join(', '),
        date: release.date || null,
        country: release.country || null
      }));

      return { success: true, results };
    } catch (error) {
      log.error('Erreur lors de la recherche MusicBrainz:', error.message);
      return { success: false, error: 'Erreur lors de la recherche MusicBrainz (vérifiez votre connexion internet).' };
    }
  });

  // --- Profils (façon Netflix) ---
  // Le PIN du profil est stocké dans la colonne `password_hash` de `users`
  // (haché avec bcrypt). Un profil sans PIN a `password_hash` à NULL.

  ipcMain.handle('list-profiles', () => {
    return new Promise((resolve) => {
      db.all(
        `SELECT id, first_name, last_name, avatar_url, access_level_id,
                (password_hash IS NOT NULL) AS has_pin
         FROM users WHERE is_active = 1 ORDER BY created_at ASC`,
        (err, rows) => {
          if (err) {
            log.error('Erreur lors du chargement des profils:', err);
            resolve({ success: false, error: err.message });
          } else {
            resolve({ success: true, data: rows.map((r) => ({ ...r, has_pin: !!r.has_pin })) });
          }
        }
      );
    });
  });

  ipcMain.handle('create-profile', async (event, { firstName, lastName, avatarUrl, pin, accessLevelId = 2 }) => {
    try {
      if (!firstName?.trim()) {
        return { success: false, error: 'Le prénom du profil est requis.' };
      }
      if (pin && !/^\d{4,6}$/.test(pin)) {
        return { success: false, error: 'Le code PIN doit contenir entre 4 et 6 chiffres.' };
      }

      const id = uuid.v4();
      const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (id, first_name, last_name, avatar_url, access_level_id, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
          [id, firstName.trim(), (lastName || '').trim(), avatarUrl || null, accessLevelId, pinHash],
          (err) => (err ? reject(err) : resolve())
        );
      });

      await new Promise((resolve, reject) => {
        db.run('INSERT OR IGNORE INTO user_profiles (user_id) VALUES (?)', [id], (err) => (err ? reject(err) : resolve()));
      });

      return { success: true, data: { id } };
    } catch (error) {
      log.error('Erreur lors de la création du profil:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-profile-details', async (event, { profileId, firstName, lastName, avatarUrl, pin, clearPin }) => {
    try {
      if (pin && !/^\d{4,6}$/.test(pin)) {
        return { success: false, error: 'Le code PIN doit contenir entre 4 et 6 chiffres.' };
      }

      const fields = [];
      const values = [];
      if (firstName !== undefined) { fields.push('first_name = ?'); values.push(firstName.trim()); }
      if (lastName !== undefined) { fields.push('last_name = ?'); values.push(lastName.trim()); }
      if (avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(avatarUrl); }
      if (pin) { fields.push('password_hash = ?'); values.push(await bcrypt.hash(pin, 10)); }
      if (clearPin) { fields.push('password_hash = NULL'); }

      if (fields.length === 0) return { success: true };

      values.push(profileId);
      await new Promise((resolve, reject) => {
        db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values, (err) => (err ? reject(err) : resolve()));
      });

      return { success: true };
    } catch (error) {
      log.error('Erreur lors de la mise à jour du profil:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('delete-profile', (event, { profileId }) => {
    return new Promise((resolve) => {
      // Suppression douce : préserve l'historique des emprunts liés à ce profil
      db.run('UPDATE users SET is_active = 0 WHERE id = ?', [profileId], (err) => {
        if (err) {
          log.error('Erreur lors de la suppression du profil:', err);
          resolve({ success: false, error: err.message });
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  ipcMain.handle('verify-profile-pin', (event, { profileId, pin }) => {
    return new Promise((resolve) => {
      db.get('SELECT password_hash FROM users WHERE id = ? AND is_active = 1', [profileId], async (err, row) => {
        if (err) {
          log.error('Erreur lors de la vérification du PIN:', err);
          resolve({ success: false, error: err.message });
          return;
        }
        if (!row) {
          resolve({ success: false, error: 'Profil introuvable.' });
          return;
        }
        if (!row.password_hash) {
          resolve({ success: true });
          return;
        }
        const match = await bcrypt.compare(pin || '', row.password_hash);
        resolve(match ? { success: true } : { success: false, error: 'Code PIN incorrect.' });
      });
    });
  });

  // Canal pour démarrer une session de scan depuis le mobile (QR code)
  ipcMain.handle('start-mobile-scan-session', async () => {
    try {
      const session = await mobileScanServer.createSession();
      return { success: true, data: session };
    } catch (error) {
      log.error('Erreur lors du démarrage de la session de scan mobile:', error);
      return { success: false, error: error.message };
    }
  });
}

// Exporter les modules pour les tests
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    loadConfig,
    initDatabase,
    createDatabaseSchema,
    checkDatabaseSchema,
    detectExternalDrives
  };
}
