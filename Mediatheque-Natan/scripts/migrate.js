#!/usr/bin/env node

/**
 * Script de migration pour Médiathèque NATAN
 *
 * Ce script permet d'importer des données depuis :
 * - Movie Buddy (CSV)
 * - Fichiers CSV personnalisés
 * - D'autres bases de données NATAN
 *
 * La base de données ciblée est celle de l'application Electron (même
 * schéma, même emplacement par défaut) afin que les données importées
 * apparaissent directement dans l'app. Utiliser la variable
 * d'environnement MEDIATHEQUE_DB_PATH pour cibler un autre fichier
 * (utile pour un essai avant import réel).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();
const { SCHEMA_SQL } = require('../app/db-schema');
const { importMovieBuddyRows } = require('../app/importers/movieBuddy');

const DEFAULT_MEDIA_STATE_ID = 2; // 'Bon' — état par défaut pour une collection existante importée

/**
 * Reproduit le chemin `app.getPath('userData')` d'Electron sans dépendre
 * d'Electron (ce script tourne en Node pur). Le nom d'application par
 * défaut d'Electron est le champ "name" du package.json le plus proche.
 */
function getElectronUserDataPath(appName) {
  const home = os.homedir();
  switch (process.platform) {
    case 'win32':
      return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), appName);
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', appName);
    default:
      return path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), appName);
  }
}

function defaultDbPath() {
  if (process.env.MEDIATHEQUE_DB_PATH) {
    return process.env.MEDIATHEQUE_DB_PATH;
  }
  const userDataPath = getElectronUserDataPath('mediatheque-natan');
  return path.join(userDataPath, 'data', 'mediatheque.db');
}

// --- Petits utilitaires promisifiés pour le pilote sqlite3 (asynchrone) ---
function dbRun(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function dbAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function dbExec(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => (err ? reject(err) : resolve()));
  });
}

function dbClose(db) {
  return new Promise((resolve, reject) => {
    db.close((err) => (err ? reject(err) : resolve()));
  });
}

const DEFAULT_LOCATION_TYPE_ID = 3; // 'Archivage' — type par défaut pour une location créée à la volée (import CSV personnalisé)

class MigrationScript {
  constructor() {
    this.config = {
      dbPath: defaultDbPath(),
      backupDir: path.join(__dirname, '..', 'backups'),
      importDir: path.join(__dirname, '..', 'imports')
    };

    this.db = null;
    this.results = {
      imported: 0,
      skipped: 0,
      errors: 0
    };
  }

  /**
   * Initialiser la base de données
   */
  async initializeDatabase() {
    try {
      const dataDir = path.dirname(this.config.dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.config.dbPath);
      await dbRun(this.db, 'PRAGMA foreign_keys = ON');

      console.log(`✅ Base de données ouverte avec succès (${this.config.dbPath})`);
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de l\'ouverture de la base de données:', error.message);
      return false;
    }
  }

  /**
   * Créer les tables si elles n'existent pas (même schéma que l'application Electron)
   */
  async createTables() {
    try {
      await dbExec(this.db, SCHEMA_SQL);
      console.log('✅ Tables créées avec succès');
      return true;
    } catch (error) {
      console.error('❌ Erreur lors de la création des tables:', error.message);
      return false;
    }
  }

  /**
   * Lire un fichier CSV en tableau d'objets
   */
  readCsv(csvFilePath) {
    if (!fs.existsSync(csvFilePath)) {
      throw new Error(`Fichier introuvable: ${csvFilePath}`);
    }

    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  /**
   * Importer depuis un fichier CSV Movie Buddy
   *
   * Le format exact exporté par Movie Buddy (Kimico) n'a pas pu être
   * vérifié : les en-têtes du fichier sont détectées automatiquement et
   * plusieurs variantes de noms de colonnes usuelles sont reconnues.
   * Vérifiez le résultat sur un petit échantillon avant un import complet.
   */
  async importFromMovieBuddy(csvFilePath) {
    console.log(`\n📥 Import depuis Movie Buddy: ${csvFilePath}`);
    try {
      const results = await this.readCsv(csvFilePath);
      console.log(`✅ ${results.length} entrées lues depuis le CSV`);
      if (results.length > 0) {
        console.log(`ℹ️  Colonnes détectées: ${Object.keys(results[0]).join(', ')}`);
      }
      await this.processMovieBuddyData(results);
      return results.length;
    } catch (error) {
      console.error('❌ Erreur lors de l\'import Movie Buddy:', error.message);
      throw error;
    }
  }

  /**
   * Traiter les données Movie Buddy et les insérer dans le schéma réel de l'application
   * (logique partagée avec l'import depuis le menu de l'application Electron)
   */
  async processMovieBuddyData(data) {
    console.log('🔄 Traitement des données Movie Buddy...');

    const { imported, errors, errorDetails } = await importMovieBuddyRows(this.db, data);

    for (const detail of errorDetails) {
      console.error(`❌ Erreur lors du traitement de l'item ${detail}`);
    }

    this.results.imported += imported;
    this.results.errors += errors;
    console.log(`✅ ${imported} médias importés avec succès`);
  }

  /**
   * Importer depuis un CSV personnalisé (mapping colonne CSV -> champ média)
   */
  async importFromCSV(csvFilePath, mapping) {
    console.log(`\n📥 Import depuis CSV: ${csvFilePath}`);
    try {
      const results = await this.readCsv(csvFilePath);
      console.log(`✅ ${results.length} entrées lues depuis le CSV`);
      await this.processCustomCSVData(results, mapping);
      return results.length;
    } catch (error) {
      console.error('❌ Erreur lors de l\'import CSV:', error.message);
      throw error;
    }
  }

  /**
   * Traiter les données d'un CSV personnalisé
   */
  async processCustomCSVData(data, mapping) {
    console.log('🔄 Traitement des données CSV personnalisées...');

    let importedCount = 0;

    for (const item of data) {
      try {
        const mediaId = this.generateId();
        const barcode = mapping.barcode ? item[mapping.barcode] : null;
        const title = (mapping.title ? item[mapping.title] : null) || 'Inconnu';
        const year = mapping.year ? parseInt(item[mapping.year], 10) || null : null;
        const mediaTypeId = mapping.media_type ? await this.getMediaTypeId(item[mapping.media_type]) : 1;
        const locationId = mapping.location ? await this.getOrCreateLocation(item[mapping.location]) : null;

        await dbRun(
          this.db,
          `INSERT OR IGNORE INTO media (
            id, title, original_title, type_id, release_year, duration_minutes,
            synopsis, state_id, location_id, barcode, jacket_image_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            mediaId,
            title,
            mapping.original_title ? item[mapping.original_title] : null,
            mediaTypeId,
            year,
            mapping.duration ? parseInt(item[mapping.duration], 10) || null : null,
            mapping.synopsis ? item[mapping.synopsis] : null,
            DEFAULT_MEDIA_STATE_ID,
            locationId,
            barcode,
            mapping.image_url ? item[mapping.image_url] : null
          ]
        );

        importedCount++;
      } catch (error) {
        console.error('❌ Erreur lors du traitement de l\'item:', error.message);
        this.results.errors++;
      }
    }

    this.results.imported += importedCount;
    console.log(`✅ ${importedCount} médias importés avec succès`);
  }

  /**
   * Obtenir ou créer une location
   */
  async getOrCreateLocation(name, cache) {
    if (!name) return null;
    if (cache && cache.has(name)) return cache.get(name);

    const existing = await dbGet(this.db, 'SELECT id FROM locations WHERE name = ?', [name]);
    if (existing) {
      if (cache) cache.set(name, existing.id);
      return existing.id;
    }

    const locationId = this.generateId();
    await dbRun(
      this.db,
      'INSERT INTO locations (id, name, type_id) VALUES (?, ?, ?)',
      [locationId, name, DEFAULT_LOCATION_TYPE_ID]
    );
    if (cache) cache.set(name, locationId);
    return locationId;
  }

  /**
   * Obtenir l'ID du type de média (DVD par défaut si non reconnu)
   */
  async getMediaTypeId(typeName) {
    if (!typeName) return 1;
    const type = await dbGet(this.db, 'SELECT id FROM media_types WHERE name = ?', [typeName]);
    return type ? type.id : 1;
  }

  /**
   * Générer un ID unique
   */
  generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Importer depuis une autre base de données NATAN
   */
  async importFromDatabase(sourceDbPath) {
    console.log(`\n📥 Import depuis base de données: ${sourceDbPath}`);

    if (!fs.existsSync(sourceDbPath)) {
      throw new Error(`Base de données introuvable: ${sourceDbPath}`);
    }

    const sourceDb = new sqlite3.Database(sourceDbPath, sqlite3.OPEN_READONLY);

    try {
      const tables = [
        'media_types', 'media_states', 'person_types', 'location_types',
        'user_access_levels', 'locations', 'categories', 'persons',
        'users', 'media', 'loans'
      ];

      for (const table of tables) {
        try {
          const rows = await dbAll(sourceDb, `SELECT * FROM ${table}`);
          if (rows.length > 0) {
            if (table === 'media' || table === 'users' || table === 'loans') {
              await this.copyDataWithConflictCheck(table, rows);
            } else {
              await this.copyData(table, rows);
            }
          }
        } catch (error) {
          console.error(`⚠️  Erreur lors de la copie de la table ${table}:`, error.message);
        }
      }

      await this.copyJunctionTables(sourceDb);

      console.log('✅ Import depuis base de données terminé');
    } catch (error) {
      console.error('❌ Erreur lors de l\'import depuis la base de données:', error.message);
      throw error;
    } finally {
      await dbClose(sourceDb);
    }
  }

  /**
   * Copier des données avec vérification des conflits (INSERT OR IGNORE)
   */
  async copyDataWithConflictCheck(table, rows) {
    const columns = Object.keys(rows[0]);
    const sql = `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;

    let imported = 0;
    for (const row of rows) {
      try {
        const values = columns.map((k) => row[k]);
        const result = await dbRun(this.db, sql, values);
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
  async copyData(table, rows) {
    const columns = Object.keys(rows[0]);
    const sql = `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;

    for (const row of rows) {
      const values = columns.map((k) => row[k]);
      await dbRun(this.db, sql, values);
    }

    this.results.imported += rows.length;
    console.log(`✅ ${rows.length} lignes importées dans ${table}`);
  }

  /**
   * Copier les tables de junction
   */
  async copyJunctionTables(sourceDb) {
    const junctionTables = ['media_categories', 'media_persons'];

    for (const table of junctionTables) {
      try {
        const rows = await dbAll(sourceDb, `SELECT * FROM ${table}`);
        if (rows.length > 0) {
          const columns = Object.keys(rows[0]);
          const sql = `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`;
          for (const row of rows) {
            await dbRun(this.db, sql, columns.map((k) => row[k]));
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
  async exportToCSV(outputPath, tableName) {
    console.log(`\n📤 Export vers CSV: ${outputPath}`);
    try {
      const rows = await dbAll(this.db, `SELECT * FROM ${tableName}`);

      if (rows.length === 0) {
        console.log(`⚠️  Aucune donnée dans la table ${tableName}`);
        return 0;
      }

      const headers = Object.keys(rows[0]);
      const csvContent = [
        headers.join(','),
        ...rows.map((row) => headers.map((h) => this.escapeCSV(row[h])).join(','))
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
  async close() {
    if (this.db) {
      await dbClose(this.db);
      console.log('✅ Base de données fermée');
    }
  }
}

// Exécuter le script
async function runMigration() {
  const migrator = new MigrationScript();

  try {
    if (!(await migrator.initializeDatabase())) {
      process.exit(1);
    }

    if (!(await migrator.createTables())) {
      process.exit(1);
    }

    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log('\n📋 Utilisation:');
      console.log('  npm run migrate -- <command> [options]');
      console.log('\n📌 Commandes:');
      console.log('  movie-buddy <file>    Importer depuis Movie Buddy');
      console.log('  csv <file>            Importer depuis CSV personnalisé (mapping par défaut)');
      console.log('  database <file>       Importer depuis une base de données');
      console.log('  export <table> <file> Exporter une table vers CSV');
      console.log('\n📌 Exemples:');
      console.log('  npm run migrate -- movie-buddy ./imports/movie-buddy.csv');
      console.log('  npm run migrate -- export media ./exports/media.csv');
      console.log('\n📌 Astuce: définir MEDIATHEQUE_DB_PATH pour cibler une autre base (essai avant import réel).');

      await migrator.close();
      process.exit(0);
    }

    const command = args[0];

    switch (command) {
      case 'movie-buddy': {
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le fichier Movie Buddy');
          process.exit(1);
        }
        await migrator.importFromMovieBuddy(args[1]);
        break;
      }

      case 'csv': {
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le fichier CSV');
          process.exit(1);
        }
        const defaultMapping = {
          title: 'title',
          year: 'year',
          media_type: 'media_type',
          barcode: 'barcode',
          location: 'location'
        };
        await migrator.importFromCSV(args[1], defaultMapping);
        break;
      }

      case 'database': {
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le fichier de la base de données');
          process.exit(1);
        }
        await migrator.importFromDatabase(args[1]);
        break;
      }

      case 'export': {
        if (args.length < 3) {
          console.error('❌ Veuillez spécifier la table et le fichier de sortie');
          process.exit(1);
        }
        await migrator.exportToCSV(args[2], args[1]);
        break;
      }

      default:
        console.error(`❌ Commande inconnue: ${command}`);
        process.exit(1);
    }

    migrator.printSummary();
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exitCode = 1;
  } finally {
    await migrator.close();
  }
}

// Démarrer la migration
if (require.main === module) {
  runMigration();
}

module.exports = { MigrationScript, getElectronUserDataPath, defaultDbPath };
