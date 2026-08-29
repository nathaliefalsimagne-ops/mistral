#!/usr/bin/env node

/**
 * Script de migration pour Médiathèque NATAN
 * 
 * Ce script permet d'importer des données depuis :
 * - Movie Buddy (CSV)
 * - Fichiers CSV personnalisés
 * - D'autres bases de données NATAN
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();
const readline = require('readline');

class MigrationScript {
  constructor() {
    this.config = {
      dbPath: path.join(__dirname, '..', 'data', 'mediatheque.db'),
      backupDir: path.join(__dirname, '..', 'backups'),
      importDir: path.join(__dirname, '..', 'imports')
    };
    
    this.db = null;
    this.Database = sqlite3.Database;
    this.results = {
      imported: 0,
      skipped: 0,
      errors: 0
    };
  }

  /**
   * Initialiser la base de données
   */
  initializeDatabase() {
    try {
      // Créer le dossier data s'il n'existe pas
      const dataDir = path.dirname(this.config.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Ouvrir la base de données
      this.db = new this.Database(this.config.dbPath);
      
      // Activer les foreign keys
      this.db.pragma('foreign_keys = ON');
      
      console.log('✅ Base de données ouverte avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'ouverture de la base de données:', error.message);
      return false;
    }
  }

  /**
   * Créer les tables si elles n'existent pas
   */
  createTables() {
    try {
      const createTablesSql = `
        -- Types de médias
        CREATE TABLE IF NOT EXISTS media_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT
        );

        -- États des médias
        CREATE TABLE IF NOT EXISTS media_states (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT
        );

        -- Types de personnes
        CREATE TABLE IF NOT EXISTS person_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT
        );

        -- Types de locations
        CREATE TABLE IF NOT EXISTS location_types (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT
        );

        -- Niveaux d'accès
        CREATE TABLE IF NOT EXISTS access_levels (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          description TEXT
        );

        -- Locations
        CREATE TABLE IF NOT EXISTS locations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          location_type_id INTEGER DEFAULT 1,
          parent_location_id TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (location_type_id) REFERENCES location_types(id)
        );

        -- Catégories
        CREATE TABLE IF NOT EXISTS categories (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          parent_category_id TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- Personnes
        CREATE TABLE IF NOT EXISTS persons (
          id TEXT PRIMARY KEY,
          first_name TEXT,
          last_name TEXT NOT NULL,
          full_name TEXT,
          person_type_id INTEGER DEFAULT 1,
          biography TEXT,
          birth_date TEXT,
          death_date TEXT,
          image_url TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (person_type_id) REFERENCES person_types(id)
        );

        -- Médias
        CREATE TABLE IF NOT EXISTS media (
          id TEXT PRIMARY KEY,
          barcode TEXT UNIQUE,
          title TEXT NOT NULL,
          original_title TEXT,
          release_year INTEGER,
          release_date TEXT,
          duration_minutes INTEGER,
          synopsis TEXT,
          description TEXT,
          average_rating REAL DEFAULT 0,
          user_rating REAL,
          media_type_id INTEGER DEFAULT 1,
          media_state_id INTEGER DEFAULT 1,
          location_id TEXT,
          jacket_image_url TEXT,
          backdrop_image_url TEXT,
          added_date TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          is_active INTEGER DEFAULT 1,
          FOREIGN KEY (media_type_id) REFERENCES media_types(id),
          FOREIGN KEY (media_state_id) REFERENCES media_states(id),
          FOREIGN KEY (location_id) REFERENCES locations(id)
        );

        -- Utilisateurs
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT,
          password_hash TEXT,
          access_level_id INTEGER DEFAULT 2,
          is_active INTEGER DEFAULT 1,
          registration_date TEXT DEFAULT CURRENT_TIMESTAMP,
          last_login_date TEXT,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (access_level_id) REFERENCES access_levels(id)
        );

        -- Emprunts
        CREATE TABLE IF NOT EXISTS loans (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          media_id TEXT NOT NULL,
          loan_date TEXT DEFAULT CURRENT_TIMESTAMP,
          due_date TEXT,
          return_date TEXT,
          return_state TEXT,
          user_note TEXT,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (media_id) REFERENCES media(id)
        );

        -- Sauvegardes
        CREATE TABLE IF NOT EXISTS backups (
          id TEXT PRIMARY KEY,
          backup_path TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          size_bytes INTEGER,
          media_count INTEGER,
          user_count INTEGER,
          is_external INTEGER DEFAULT 0
        );

        -- Logs de synchronisation
        CREATE TABLE IF NOT EXISTS sync_logs (
          id TEXT PRIMARY KEY,
          source_path TEXT,
          destination_path TEXT,
          sync_date TEXT DEFAULT CURRENT_TIMESTAMP,
          media_count INTEGER,
          success_count INTEGER,
          error_count INTEGER,
          status TEXT
        );

        -- Junction table médias-catégories
        CREATE TABLE IF NOT EXISTS media_categories (
          media_id TEXT NOT NULL,
          category_id TEXT NOT NULL,
          PRIMARY KEY (media_id, category_id),
          FOREIGN KEY (media_id) REFERENCES media(id),
          FOREIGN KEY (category_id) REFERENCES categories(id)
        );

        -- Junction table médias-personnes
        CREATE TABLE IF NOT EXISTS media_persons (
          media_id TEXT NOT NULL,
          person_id TEXT NOT NULL,
          role TEXT,
          PRIMARY KEY (media_id, person_id),
          FOREIGN KEY (media_id) REFERENCES media(id),
          FOREIGN KEY (person_id) REFERENCES persons(id)
        );

        -- Configuration
        CREATE TABLE IF NOT EXISTS config (
          id TEXT PRIMARY KEY,
          value TEXT
        );
      `;

      this.db.exec(createTablesSql);
      
      // Insérer les données de référence si elles n'existent pas
      this.insertReferenceData();
      
      console.log('✅ Tables créées avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la création des tables:', error.message);
      return false;
    }
  }

  /**
   * Insérer les données de référence
   */
  insertReferenceData() {
    try {
      // Types de médias
      const mediaTypes = [
        { id: 1, name: 'DVD', description: 'Digital Versatile Disc' },
        { id: 2, name: 'Blu-ray', description: 'Blu-ray Disc' },
        { id: 3, name: 'CD', description: 'Compact Disc' },
        { id: 4, name: 'Vinyl', description: 'Disque vinyle' }
      ];

      const existingTypes = this.db.prepare('SELECT id FROM media_types WHERE id = ?').all(mediaTypes.map(t => t.id));
      const existingTypeIds = existingTypes.map(t => t.id);
      
      for (const type of mediaTypes) {
        if (!existingTypeIds.includes(type.id)) {
          this.db.prepare('INSERT INTO media_types (id, name, description) VALUES (?, ?, ?)')
            .run(type.id, type.name, type.description);
        }
      }

      // États des médias
      const mediaStates = [
        { id: 1, name: 'Bon', description: 'En bon état' },
        { id: 2, name: 'Rayé', description: 'Rayures légères' },
        { id: 3, name: 'Abîmé', description: 'État moyen' },
        { id: 4, name: 'Perdu', description: 'Média perdu' }
      ];

      const existingStates = this.db.prepare('SELECT id FROM media_states WHERE id = ?').all(mediaStates.map(s => s.id));
      const existingStateIds = existingStates.map(s => s.id);
      
      for (const state of mediaStates) {
        if (!existingStateIds.includes(state.id)) {
          this.db.prepare('INSERT INTO media_states (id, name, description) VALUES (?, ?, ?)')
            .run(state.id, state.name, state.description);
        }
      }

      // Types de personnes
      const personTypes = [
        { id: 1, name: 'Acteur', description: 'Acteur/Actrice' },
        { id: 2, name: 'Réalisateur', description: 'Réalisateur/Réalisatrice' },
        { id: 3, name: 'Artiste', description: 'Artiste musical' },
        { id: 4, name: 'Compositeur', description: 'Compositeur de musique' },
        { id: 5, name: 'Scénariste', description: 'Scénariste' }
      ];

      const existingPersonTypes = this.db.prepare('SELECT id FROM person_types WHERE id = ?').all(personTypes.map(p => p.id));
      const existingPersonTypeIds = existingPersonTypes.map(p => p.id);
      
      for (const type of personTypes) {
        if (!existingPersonTypeIds.includes(type.id)) {
          this.db.prepare('INSERT INTO person_types (id, name, description) VALUES (?, ?, ?)')
            .run(type.id, type.name, type.description);
        }
      }

      // Types de locations
      const locationTypes = [
        { id: 1, name: 'Étagère', description: 'Étagère standard' },
        { id: 2, name: 'Boîte', description: 'Boîte de stockage' },
        { id: 3, name: 'Armoire', description: 'Armoire de rangement' },
        { id: 4, name: 'Externe', description: 'Stockage externe' }
      ];

      const existingLocationTypes = this.db.prepare('SELECT id FROM location_types WHERE id = ?').all(locationTypes.map(l => l.id));
      const existingLocationTypeIds = existingLocationTypes.map(l => l.id);
      
      for (const type of locationTypes) {
        if (!existingLocationTypeIds.includes(type.id)) {
          this.db.prepare('INSERT INTO location_types (id, name, description) VALUES (?, ?, ?)')
            .run(type.id, type.name, type.description);
        }
      }

      // Niveaux d'accès
      const accessLevels = [
        { id: 1, name: 'Invité', description: 'Accès limité' },
        { id: 2, name: 'Membre', description: 'Accès standard' },
        { id: 3, name: 'Administrateur', description: 'Accès complet' }
      ];

      const existingAccessLevels = this.db.prepare('SELECT id FROM access_levels WHERE id = ?').all(accessLevels.map(a => a.id));
      const existingAccessLevelIds = existingAccessLevels.map(a => a.id);
      
      for (const level of accessLevels) {
        if (!existingAccessLevelIds.includes(level.id)) {
          this.db.prepare('INSERT INTO access_levels (id, name, description) VALUES (?, ?, ?)')
            .run(level.id, level.name, level.description);
        }
      }

      console.log('✅ Données de référence insérées');
    } catch (error) {
      console.error('❌ Erreur lors de l\'insertion des données de référence:', error.message);
    }
  }

  /**
   * Importer depuis un fichier CSV Movie Buddy
   */
  async importFromMovieBuddy(csvFilePath) {
    console.log(`\n📥 Import depuis Movie Buddy: ${csvFilePath}`);
    
    try {
      if (!fs.existsSync(csvFilePath)) {
        throw new Error(`Fichier introuvable: ${csvFilePath}`);
      }

      const results = [];
      
      return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
          .pipe(csv({ headers: this.getMovieBuddyHeaders() }))
          .on('data', (data) => results.push(data))
          .on('end', () => {
            console.log(`✅ ${results.length} entrées lues depuis le CSV`);
            this.processMovieBuddyData(results);
            resolve(results.length);
          })
          .on('error', (error) => {
            console.error('❌ Erreur lors de la lecture du CSV:', error.message);
            reject(error);
          });
      });

    } catch (error) {
      console.error('❌ Erreur lors de l\'import Movie Buddy:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir les en-têtes Movie Buddy
   */
  getMovieBuddyHeaders() {
    return [
      'id',
      'title',
      'original_title',
      'year',
      'rating',
      'release_date',
      'runtime',
      'genres',
      'director',
      'writer',
      'actors',
      'plot',
      'awards',
      'poster_url',
      'imdb_id',
      'tmdb_id',
      'media_type',
      'location',
      'notes',
      'tags',
      'loaned_to',
      'loan_date',
      'due_date',
      'barcode',
      'date_added',
      'last_modified'
    ];
  }

  /**
   * Traiter les données Movie Buddy
   */
  processMovieBuddyData(data) {
    console.log('🔄 Traitement des données Movie Buddy...');
    
    const insertMedia = this.db.prepare(`
      INSERT OR IGNORE INTO media (
        id, barcode, title, original_title, release_year, release_date,
        duration_minutes, synopsis, jacket_image_url, media_type_id,
        added_date, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    const insertPerson = this.db.prepare(`
      INSERT OR IGNORE INTO persons (id, first_name, last_name, full_name, person_type_id) 
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertCategory = this.db.prepare(`
      INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)
    `);

    const insertLocation = this.db.prepare(`
      INSERT OR IGNORE INTO locations (id, name) VALUES (?, ?)
    `);

    const insertMediaCategory = this.db.prepare(`
      INSERT OR IGNORE INTO media_categories (media_id, category_id) VALUES (?, ?)
    `);

    const insertMediaPerson = this.db.prepare(`
      INSERT OR IGNORE INTO media_persons (media_id, person_id, role) VALUES (?, ?, ?)
    `);

    const insertUser = this.db.prepare(`
      INSERT OR IGNORE INTO users (id, first_name, last_name, access_level_id) 
      VALUES (?, ?, ?, ?)
    `);

    const insertLoan = this.db.prepare(`
      INSERT OR IGNORE INTO loans (id, user_id, media_id, loan_date, due_date) 
      VALUES (?, ?, ?, ?, ?)
    `);

    let importedCount = 0;
    const personMap = new Map();
    const categoryMap = new Map();
    const locationMap = new Map();
    const userMap = new Map();

    for (const item of data) {
      try {
        // Générer un ID unique
        const mediaId = item.id || this.generateId();
        const barcode = item.barcode || null;

        // Déterminer le type de média
        const mediaTypeId = this.getMediaTypeId(item.media_type);

        // Insérer le média
        insertMedia.run(
          mediaId,
          barcode,
          item.title,
          item.original_title,
          parseInt(item.year) || null,
          item.release_date || null,
          parseInt(item.runtime) || null,
          item.plot || null,
          item.poster_url || null,
          mediaTypeId
        );

        // Traiter les catégories
        if (item.genres) {
          const genres = item.genres.split(',').map(g => g.trim());
          for (const genre of genres) {
            if (!categoryMap.has(genre)) {
              const categoryId = this.generateId();
              insertCategory.run(categoryId, genre);
              categoryMap.set(genre, categoryId);
            }
            insertMediaCategory.run(mediaId, categoryMap.get(genre));
          }
        }

        // Traiter les personnes
        this.processPerson(item.director, 2, personMap, insertPerson);
        this.processPerson(item.writer, 5, personMap, insertPerson);
        
        if (item.actors) {
          const actors = item.actors.split(',').map(a => a.trim());
          for (const actor of actors) {
            this.processPerson(actor, 1, personMap, insertPerson);
          }
        }

        // Traiter la location
        if (item.location) {
          if (!locationMap.has(item.location)) {
            const locationId = this.generateId();
            insertLocation.run(locationId, item.location);
            locationMap.set(item.location, locationId);
          }
          // Mettre à jour le média avec la location
          this.db.prepare('UPDATE media SET location_id = ? WHERE id = ?')
            .run(locationMap.get(item.location), mediaId);
        }

        // Traiter l'emprunt
        if (item.loaned_to) {
          if (!userMap.has(item.loaned_to)) {
            const userId = this.generateId();
            const [firstName, ...lastNameParts] = item.loaned_to.split(' ');
            const lastName = lastNameParts.join(' ') || 'Unknown';
            insertUser.run(userId, firstName, lastName, 2);
            userMap.set(item.loaned_to, userId);
          }

          const loanId = this.generateId();
          insertLoan.run(
            loanId,
            userMap.get(item.loaned_to),
            mediaId,
            item.loan_date || null,
            item.due_date || null
          );
        }

        importedCount++;

      } catch (error) {
        console.error(`❌ Erreur lors du traitement de l'item ${item.title}:`, error.message);
        this.results.errors++;
      }
    }

    this.results.imported += importedCount;
    console.log(`✅ ${importedCount} médias importés avec succès`);
  }

  /**
   * Traiter une personne
   */
  processPerson(fullName, personTypeId, map, insertStmt) {
    if (!fullName) return;

    const names = fullName.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || 'Unknown';

    if (!map.has(fullName)) {
      const personId = this.generateId();
      insertStmt.run(personId, firstName, lastName, fullName, personTypeId);
      map.set(fullName, { id: personId, typeId: personTypeId });
    }
  }

  /**
   * Importer depuis un CSV personnalisé
   */
  async importFromCSV(csvFilePath, mapping) {
    console.log(`\n📥 Import depuis CSV: ${csvFilePath}`);
    
    try {
      if (!fs.existsSync(csvFilePath)) {
        throw new Error(`Fichier introuvable: ${csvFilePath}`);
      }

      const results = [];
      
      return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
          .pipe(csv({ headers: Object.keys(mapping) }))
          .on('data', (data) => results.push(data))
          .on('end', () => {
            console.log(`✅ ${results.length} entrées lues depuis le CSV`);
            this.processCustomCSVData(results, mapping);
            resolve(results.length);
          })
          .on('error', (error) => {
            console.error('❌ Erreur lors de la lecture du CSV:', error.message);
            reject(error);
          });
      });

    } catch (error) {
      console.error('❌ Erreur lors de l\'import CSV:', error.message);
      throw error;
    }
  }

  /**
   * Traiter les données d'un CSV personnalisé
   */
  processCustomCSVData(data, mapping) {
    console.log('🔄 Traitement des données CSV personnalisées...');
    
    const insertMedia = this.db.prepare(`
      INSERT OR IGNORE INTO media (
        id, barcode, title, original_title, release_year, release_date,
        duration_minutes, synopsis, jacket_image_url, media_type_id,
        location_id, added_date, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);

    let importedCount = 0;

    for (const item of data) {
      try {
        const mediaId = this.generateId();
        const barcode = mapping.barcode ? item[mapping.barcode] : null;
        const title = mapping.title ? item[mapping.title] : 'Inconnu';
        const year = mapping.year ? parseInt(item[mapping.year]) : null;
        const mediaTypeId = mapping.media_type ? this.getMediaTypeId(item[mapping.media_type]) : 1;
        const locationId = mapping.location ? this.getOrCreateLocation(item[mapping.location]) : null;

        insertMedia.run(
          mediaId,
          barcode,
          title,
          mapping.original_title ? item[mapping.original_title] : null,
          year,
          mapping.release_date ? item[mapping.release_date] : null,
          mapping.duration ? parseInt(item[mapping.duration]) : null,
          mapping.synopsis ? item[mapping.synopsis] : null,
          mapping.image_url ? item[mapping.image_url] : null,
          mediaTypeId,
          locationId
        );

        importedCount++;

      } catch (error) {
        console.error(`❌ Erreur lors du traitement de l'item:`, error.message);
        this.results.errors++;
      }
    }

    this.results.imported += importedCount;
    console.log(`✅ ${importedCount} médias importés avec succès`);
  }

  /**
   * Obtenir ou créer une location
   */
  getOrCreateLocation(name) {
    if (!name) return null;

    const existing = this.db.prepare('SELECT id FROM locations WHERE name = ?').get(name);
    if (existing) {
      return existing.id;
    }

    const locationId = this.generateId();
    this.db.prepare('INSERT INTO locations (id, name) VALUES (?, ?)').run(locationId, name);
    return locationId;
  }

  /**
   * Obtenir l'ID du type de média
   */
  getMediaTypeId(typeName) {
    if (!typeName) return 1; // DVD par défaut

    const type = this.db.prepare('SELECT id FROM media_types WHERE name = ?').get(typeName);
    return type ? type.id : 1;
  }

  /**
   * Générer un ID unique
   */
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Importer depuis une autre base de données NATAN
   */
  async importFromDatabase(sourceDbPath) {
    console.log(`\n📥 Import depuis base de données: ${sourceDbPath}`);
    
    try {
      if (!fs.existsSync(sourceDbPath)) {
        throw new Error(`Base de données introuvable: ${sourceDbPath}`);
      }

      const sourceDb = new this.Database(sourceDbPath);
      
      // Copier les données table par table
      const tables = ['media_types', 'media_states', 'person_types', 'location_types', 
                     'access_levels', 'locations', 'categories', 'persons', 
                     'users', 'media', 'loans'];
      
      for (const table of tables) {
        try {
          const rows = sourceDb.prepare(`SELECT * FROM ${table}`).all();
          
          if (rows.length > 0) {
            // Pour les tables avec des IDs, on vérifie les conflits
            if (table === 'media' || table === 'users' || table === 'loans') {
              this.copyDataWithConflictCheck(table, rows);
            } else {
              this.copyData(table, rows);
            }
          }
        } catch (error) {
          console.error(`⚠️  Erreur lors de la copie de la table ${table}:`, error.message);
        }
      }

      // Copier les tables de junction
      this.copyJunctionTables(sourceDb);

      console.log('✅ Import depuis base de données terminé');
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'import depuis la base de données:', error.message);
      throw error;
    }
  }

  /**
   * Copier des données avec vérification des conflits
   */
  copyDataWithConflictCheck(table, rows) {
    const primaryKey = table === 'media' ? 'id' : 
                     table === 'users' ? 'id' : 
                     table === 'loans' ? 'id' : 'id';

    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO ${table} (${Object.keys(rows[0]).join(', ')})
      VALUES (${Object.keys(rows[0]).map(() => '?').join(', ')})
    `);

    let imported = 0;
    for (const row of rows) {
      try {
        const values = Object.keys(row).map(k => row[k]);
        const result = insertStmt.run(...values);
        
        if (result.changes > 0) {
          imported++;
        } else {
          this.results.skipped++;
        }
      } catch (error) {
        console.error(`❌ Conflit lors de l'insertion dans ${table}:`, error.message);
        this.results.errors++;
      }
    }

    this.results.imported += imported;
    console.log(`✅ ${imported} lignes importées dans ${table}`);
  }

  /**
   * Copier des données simples
   */
  copyData(table, rows) {
    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO ${table} (${Object.keys(rows[0]).join(', ')})
      VALUES (${Object.keys(rows[0]).map(() => '?').join(', ')})
    `);

    for (const row of rows) {
      const values = Object.keys(row).map(k => row[k]);
      insertStmt.run(...values);
    }

    this.results.imported += rows.length;
    console.log(`✅ ${rows.length} lignes importées dans ${table}`);
  }

  /**
   * Copier les tables de junction
   */
  copyJunctionTables(sourceDb) {
    const junctionTables = ['media_categories', 'media_persons'];
    
    for (const table of junctionTables) {
      try {
        const rows = sourceDb.prepare(`SELECT * FROM ${table}`).all();
        
        if (rows.length > 0) {
          const insertStmt = this.db.prepare(`
            INSERT OR IGNORE INTO ${table} (${Object.keys(rows[0]).join(', ')})
            VALUES (${Object.keys(rows[0]).map(() => '?').join(', ')})
          `);

          for (const row of rows) {
            const values = Object.keys(row).map(k => row[k]);
            insertStmt.run(...values);
          }

          console.log(`✅ ${rows.length} lignes importées dans ${table}`);
        }
      } catch (error) {
        console.error(`⚠️  Erreur lors de la copie de la table ${table}:`, error.message);
      }
    }
  }

  /**
   * Exporter vers CSV
   */
  exportToCSV(outputPath, tableName) {
    console.log(`\n📤 Export vers CSV: ${outputPath}`);
    
    try {
      const rows = this.db.prepare(`SELECT * FROM ${tableName}`).all();
      
      if (rows.length === 0) {
        console.log(`⚠️  Aucune donnée dans la table ${tableName}`);
        return 0;
      }

      const headers = Object.keys(rows[0]);
      const csvContent = [
        headers.join(','),
        ...rows.map(row => headers.map(h => this.escapeCSV(row[h])).join(','))
      ].join('\n');

      fs.writeFileSync(outputPath, csvContent);
      console.log(`✅ ${rows.length} lignes exportées vers ${outputPath}`);
      
      return rows.length;

    } catch (error) {
      console.error('❌ Erreur lors de l\'export CSV:', error.message);
      throw error;
    }
  }

  /**
   * Échapper les valeurs pour CSV
   */
  escapeCSV(value) {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // Si la valeur contient des guillemets ou des virgules, l'entourer de guillemets
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  /**
   * Afficher le résumé
   */
  printSummary() {
    console.log('\n📊 Résumé de la migration:');
    console.log(`✅ Importés: ${this.results.imported}`);
    console.log(`⏭️  Ignorés: ${this.results.skipped}`);
    console.log(`❌ Erreurs: ${this.results.errors}`);
  }

  /**
   * Fermer la base de données
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Base de données fermée');
    }
  }
}

// Exécuter le script
async function runMigration() {
  const migrator = new MigrationScript();
  
  try {
    // Initialiser
    if (!migrator.initializeDatabase()) {
      process.exit(1);
    }
    
    // Créer les tables
    if (!migrator.createTables()) {
      process.exit(1);
    }

    // Analyser les arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('\n📋 Utilisation:');
      console.log('  npm run migrate -- <command> [options]');
      console.log('\n📌 Commandes:');
      console.log('  movie-buddy <file>    Importer depuis Movie Buddy');
      console.log('  csv <file> <mapping>  Importer depuis CSV personnalisé');
      console.log('  database <file>       Importer depuis une base de données');
      console.log('  export <table> <file> Exporter une table vers CSV');
      console.log('\n📌 Exemples:');
      console.log('  npm run migrate -- movie-buddy ./imports/movie-buddy.csv');
      console.log('  npm run migrate -- export media ./exports/media.csv');
      
      migrator.close();
      process.exit(0);
    }

    const command = args[0];

    switch (command) {
      case 'movie-buddy':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le fichier Movie Buddy');
          process.exit(1);
        }
        await migrator.importFromMovieBuddy(args[1]);
        break;

      case 'csv':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le fichier CSV et le mapping');
          process.exit(1);
        }
        // Pour l'instant, utiliser un mapping par défaut
        const defaultMapping = {
          title: 'title',
          year: 'year',
          media_type: 'media_type',
          barcode: 'barcode',
          location: 'location'
        };
        await migrator.importFromCSV(args[1], defaultMapping);
        break;

      case 'database':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le fichier de la base de données');
          process.exit(1);
        }
        await migrator.importFromDatabase(args[1]);
        break;

      case 'export':
        if (args.length < 3) {
          console.error('❌ Veuillez spécifier la table et le fichier de sortie');
          process.exit(1);
        }
        migrator.exportToCSV(args[2], args[1]);
        break;

      default:
        console.error(`❌ Commande inconnue: ${command}`);
        process.exit(1);
    }

    // Afficher le résumé
    migrator.printSummary();
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  } finally {
    migrator.close();
  }
}

// Démarrer la migration
runMigration();
