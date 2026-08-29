#!/usr/bin/env node

/**
 * Script de synchronisation avec disques externes pour Médiathèque NATAN
 * 
 * Ce script permet de :
 * - Détecter les disques externes
 * - Synchroniser les données avec les disques
 * - Résoudre les conflits de synchronisation
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');

class ExternalSyncScript {
  constructor() {
    this.config = {
      dbPath: path.join(__dirname, '..', 'data', 'mediatheque.db'),
      backupDir: path.join(__dirname, '..', 'backups'),
      syncLogDir: path.join(__dirname, '..', 'data', 'sync-logs'),
      conflictResolution: 'manual' // manual, newest, oldest
    };
    
    this.db = null;
    this.Database = sqlite3.Database;
    this.drives = [];
  }

  /**
   * Initialiser le service
   */
  initialize(config = {}) {
    this.config = { ...this.config, ...config };
    
    // Créer les dossiers nécessaires
    if (!fs.existsSync(this.config.syncLogDir)) {
      fs.mkdirSync(this.config.syncLogDir, { recursive: true });
    }
    
    // Ouvrir la base de données
    this.db = new this.Database(this.config.dbPath);
    this.db.pragma('foreign_keys = ON');
    
    console.log('✅ Service de synchronisation initialisé');
  }

  /**
   * Détecter les disques externes
   */
  detectExternalDrives() {
    try {
      this.drives = [];
      
      // Méthode selon le système d'exploitation
      switch (os.platform()) {
        case 'win32':
          this.detectWindowsDrives();
          break;
        case 'darwin':
          this.detectMacDrives();
          break;
        case 'linux':
          this.detectLinuxDrives();
          break;
        default:
          console.warn('⚠️  Plateforme non supportée pour la détection automatique');
      }
      
      // Ajouter les disques manuellement spécifiés
      this.addManualDrives();
      
      console.log(`✅ ${this.drives.length} disque(s) externe(s) détecté(s)`);
      return {
        success: true,
        data: this.drives
      };

    } catch (error) {
      console.error('❌ Erreur lors de la détection des disques:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Détecter les disques sous Windows
   */
  detectWindowsDrives() {
    try {
      // Sous Windows, les disques sont de A: à Z:
      for (let i = 65; i <= 90; i++) {
        const driveLetter = String.fromCharCode(i);
        const drivePath = `${driveLetter}:\\`;
        
        try {
          const stats = fs.statSync(drivePath);
          if (stats.isDirectory()) {
            // Vérifier si c'est un disque amovible
            const isRemovable = this.isRemovableDriveWindows(drivePath);
            
            this.drives.push({
              path: drivePath,
              name: `${driveLetter}:`,
              type: isRemovable ? 'removable' : 'fixed',
              isRemovable,
              isAvailable: true
            });
          }
        } catch (error) {
          // Disque non disponible
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la détection Windows:', error.message);
    }
  }

  /**
   * Vérifier si un disque est amovible sous Windows
   */
  isRemovableDriveWindows(drivePath) {
    try {
      // Méthode simple: vérifier si le disque contient un fichier de marqueur
      const markerFile = path.join(drivePath, '.natan_removable');
      return fs.existsSync(markerFile);
    } catch (error) {
      return false;
    }
  }

  /**
   * Détecter les disques sous macOS
   */
  detectMacDrives() {
    try {
      // Sous macOS, les disques sont dans /Volumes
      const volumesPath = '/Volumes';
      
      if (fs.existsSync(volumesPath)) {
        const volumes = fs.readdirSync(volumesPath);
        
        for (const volume of volumes) {
          // Ignorer les dossiers système
          if (volume === 'Macintosh HD' || volume.startsWith('.')) {
            continue;
          }
          
          const volumePath = path.join(volumesPath, volume);
          
          try {
            const stats = fs.statSync(volumePath);
            if (stats.isDirectory()) {
              this.drives.push({
                path: volumePath,
                name: volume,
                type: 'removable',
                isRemovable: true,
                isAvailable: true
              });
            }
          } catch (error) {
            // Disque non disponible
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la détection macOS:', error.message);
    }
  }

  /**
   * Détecter les disques sous Linux
   */
  detectLinuxDrives() {
    try {
      // Sous Linux, les disques sont dans /media ou /mnt
      const mountPoints = ['/media', '/mnt'];
      
      for (const mountPoint of mountPoints) {
        if (fs.existsSync(mountPoint)) {
          const mounts = fs.readdirSync(mountPoint);
          
          for (const mount of mounts) {
            const mountPath = path.join(mountPoint, mount);
            
            try {
              const stats = fs.statSync(mountPath);
              if (stats.isDirectory()) {
                // Vérifier si c'est un point de montage
                const isMountPoint = this.isMountPointLinux(mountPath);
                
                if (isMountPoint) {
                  this.drives.push({
                    path: mountPath,
                    name: mount,
                    type: 'removable',
                    isRemovable: true,
                    isAvailable: true
                  });
                }
              }
            } catch (error) {
              // Disque non disponible
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la détection Linux:', error.message);
    }
  }

  /**
   * Vérifier si un chemin est un point de montage sous Linux
   */
  isMountPointLinux(mountPath) {
    try {
      // Lire /proc/mounts pour vérifier si c'est un point de montage
      const mounts = fs.readFileSync('/proc/mounts', 'utf8');
      return mounts.includes(mountPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Ajouter des disques manuellement
   */
  addManualDrives() {
    // Ajouter des chemins manuellement si spécifiés dans la configuration
    // Cela peut être utile pour les chemins réseau ou spécifiques
  }

  /**
   * Synchroniser avec un disque externe
   */
  async syncWithExternal(drivePath, options = {}) {
    const {
      direction = 'both', // both, to_external, from_external
      resolveConflicts = 'manual'
    } = options;

    try {
      console.log(`🔄 Synchronisation avec: ${drivePath}`);
      
      if (!fs.existsSync(drivePath)) {
        throw new Error(`Disque introuvable: ${drivePath}`);
      }

      // Créer le dossier NATAN sur le disque externe
      const externalNatanDir = path.join(drivePath, 'Mediatheque-NATAN');
      if (!fs.existsSync(externalNatanDir)) {
        fs.mkdirSync(externalNatanDir, { recursive: true });
      }

      // Vérifier s'il y a une base de données sur le disque externe
      const externalDbPath = path.join(externalNatanDir, 'mediatheque.db');
      const hasExternalDb = fs.existsSync(externalDbPath);

      // Créer un log de synchronisation
      const syncId = this.generateId();
      const syncLog = {
        id: syncId,
        source_path: this.config.dbPath,
        destination_path: externalDbPath,
        sync_date: new Date().toISOString(),
        media_count: 0,
        success_count: 0,
        error_count: 0,
        status: 'in_progress'
      };

      // Insérer le log
      this.db.prepare(`
        INSERT INTO sync_logs (id, source_path, destination_path, sync_date, media_count, success_count, error_count, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        syncLog.id,
        syncLog.source_path,
        syncLog.destination_path,
        syncLog.sync_date,
        syncLog.media_count,
        syncLog.success_count,
        syncLog.error_count,
        syncLog.status
      );

      // Synchroniser selon la direction
      switch (direction) {
        case 'to_external':
          await this.syncToExternal(externalDbPath, syncLog);
          break;
        case 'from_external':
          await this.syncFromExternal(externalDbPath, syncLog);
          break;
        case 'both':
        default:
          // Synchronisation bidirectionnelle
          if (hasExternalDb) {
            // Comparer les dates de modification
            const localStats = fs.statSync(this.config.dbPath);
            const externalStats = fs.statSync(externalDbPath);
            
            if (localStats.mtime > externalStats.mtime) {
              // La base locale est plus récente
              await this.syncToExternal(externalDbPath, syncLog);
            } else if (externalStats.mtime > localStats.mtime) {
              // La base externe est plus récente
              await this.syncFromExternal(externalDbPath, syncLog);
            } else {
              // Même date, synchronisation bidirectionnelle
              await this.syncBothWays(externalDbPath, syncLog);
            }
          } else {
            // Pas de base externe, copier la locale
            await this.syncToExternal(externalDbPath, syncLog);
          }
          break;
      }

      // Mettre à jour le log
      this.db.prepare(`
        UPDATE sync_logs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run('completed', syncLog.id);

      console.log('✅ Synchronisation terminée');
      
      return {
        success: true,
        syncId
      };

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error.message);
      
      // Mettre à jour le log avec l'erreur
      this.db.prepare(`
        UPDATE sync_logs SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run('failed', error.message, syncId);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Synchroniser vers le disque externe
   */
  async syncToExternal(externalDbPath, syncLog) {
    console.log('📤 Synchronisation vers le disque externe');
    
    try {
      // Copier la base de données locale vers le disque externe
      fs.copyFileSync(this.config.dbPath, externalDbPath);
      
      // Mettre à jour le log
      const mediaCount = this.db.prepare('SELECT COUNT(*) as count FROM media').get().count;
      this.db.prepare(`
        UPDATE sync_logs SET 
          media_count = ?,
          success_count = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(mediaCount, mediaCount, 'to_external', syncLog.id);
      
      console.log(`✅ ${mediaCount} médias copiés vers le disque externe`);

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation vers le disque externe:', error.message);
      throw error;
    }
  }

  /**
   * Synchroniser depuis le disque externe
   */
  async syncFromExternal(externalDbPath, syncLog) {
    console.log('📥 Synchronisation depuis le disque externe');
    
    try {
      // Copier la base de données externe vers la locale
      fs.copyFileSync(externalDbPath, this.config.dbPath);
      
      // Réouvrir la base de données
      this.db.close();
      this.db = new this.Database(this.config.dbPath);
      this.db.pragma('foreign_keys = ON');
      
      // Mettre à jour le log
      const mediaCount = this.db.prepare('SELECT COUNT(*) as count FROM media').get().count;
      this.db.prepare(`
        UPDATE sync_logs SET 
          media_count = ?,
          success_count = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(mediaCount, mediaCount, 'from_external', syncLog.id);
      
      console.log(`✅ ${mediaCount} médias copiés depuis le disque externe`);

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation depuis le disque externe:', error.message);
      // Réouvrir la base de données locale
      if (!this.db) {
        this.db = new this.Database(this.config.dbPath);
      }
      throw error;
    }
  }

  /**
   * Synchronisation bidirectionnelle
   */
  async syncBothWays(externalDbPath, syncLog) {
    console.log('🔄 Synchronisation bidirectionnelle');
    
    try {
      // Ouvrir les deux bases de données
      const externalDb = new this.Database(externalDbPath);
      
      // Obtenir les médias de chaque base
      const localMedia = this.db.prepare('SELECT * FROM media').all();
      const externalMedia = externalDb.prepare('SELECT * FROM media').all();
      
      // Trouver les différences
      const localBarcodeSet = new Set(localMedia.map(m => m.barcode).filter(b => b));
      const externalBarcodeSet = new Set(externalMedia.map(m => m.barcode).filter(b => b));
      
      // Médias uniquement dans la base locale
      const onlyLocal = localMedia.filter(m => m.barcode && !externalBarcodeSet.has(m.barcode));
      
      // Médias uniquement dans la base externe
      const onlyExternal = externalMedia.filter(m => m.barcode && !localBarcodeSet.has(m.barcode));
      
      // Médias dans les deux bases (potentiels conflits)
      const inBoth = localMedia.filter(m => m.barcode && externalBarcodeSet.has(m.barcode));
      
      console.log(`📊 Statistiques:`);
      console.log(`   Uniquement local: ${onlyLocal.length}`);
      console.log(`   Uniquement externe: ${onlyExternal.length}`);
      console.log(`   Dans les deux: ${inBoth.length}`);

      // Résoudre les conflits selon la stratégie
      let resolvedConflicts = 0;
      let conflictErrors = 0;
      
      for (const media of inBoth) {
        const externalMedia = externalMedia.find(m => m.barcode === media.barcode);
        
        if (externalMedia) {
          // Comparer les dates de modification
          const localUpdated = new Date(media.updated_at || media.added_date);
          const externalUpdated = new Date(externalMedia.updated_at || externalMedia.added_date);
          
          switch (this.config.conflictResolution) {
            case 'newest':
              // Garder la version la plus récente
              if (localUpdated > externalUpdated) {
                // La version locale est plus récente, mettre à jour l'externe
                this.copyMediaToExternal(media, externalDb);
              } else if (externalUpdated > localUpdated) {
                // La version externe est plus récente, mettre à jour la locale
                this.copyMediaToLocal(externalMedia);
              }
              resolvedConflicts++;
              break;
              
            case 'oldest':
              // Garder la version la plus ancienne
              if (localUpdated < externalUpdated) {
                this.copyMediaToExternal(media, externalDb);
              } else if (externalUpdated < localUpdated) {
                this.copyMediaToLocal(externalMedia);
              }
              resolvedConflicts++;
              break;
              
            case 'manual':
            default:
              // Résolution manuelle - pour l'instant, on ignore
              conflictErrors++;
              console.warn(`⚠️  Conflit manuel requis pour: ${media.title} (${media.barcode})`);
              break;
          }
        }
      }

      // Copier les médias uniquement locaux vers l'externe
      for (const media of onlyLocal) {
        this.copyMediaToExternal(media, externalDb);
      }

      // Copier les médias uniquement externes vers la locale
      for (const media of onlyExternal) {
        this.copyMediaToLocal(media);
      }

      externalDb.close();

      // Mettre à jour le log
      const totalMedia = onlyLocal.length + onlyExternal.length + inBoth.length;
      this.db.prepare(`
        UPDATE sync_logs SET 
          media_count = ?,
          success_count = ?,
          error_count = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(totalMedia, resolvedConflicts, conflictErrors, 'both_ways', syncLog.id);
      
      console.log(`✅ Synchronisation bidirectionnelle terminée`);
      console.log(`   Résolus: ${resolvedConflicts}, Conflits: ${conflictErrors}`);

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation bidirectionnelle:', error.message);
      throw error;
    }
  }

  /**
   * Copier un média vers la base externe
   */
  copyMediaToExternal(media, externalDb) {
    try {
      // Vérifier si le média existe déjà
      const existing = externalDb.prepare('SELECT * FROM media WHERE id = ?').get(media.id);
      
      if (existing) {
        // Mettre à jour
        externalDb.prepare(`
          UPDATE media SET 
            barcode = ?,
            title = ?,
            original_title = ?,
            release_year = ?,
            release_date = ?,
            duration_minutes = ?,
            synopsis = ?,
            description = ?,
            average_rating = ?,
            user_rating = ?,
            media_type_id = ?,
            media_state_id = ?,
            location_id = ?,
            jacket_image_url = ?,
            backdrop_image_url = ?,
            added_date = ?,
            updated_at = ?,
            is_active = ?
          WHERE id = ?
        `).run(
          media.barcode,
          media.title,
          media.original_title,
          media.release_year,
          media.release_date,
          media.duration_minutes,
          media.synopsis,
          media.description,
          media.average_rating,
          media.user_rating,
          media.media_type_id,
          media.media_state_id,
          media.location_id,
          media.jacket_image_url,
          media.backdrop_image_url,
          media.added_date,
          media.updated_at,
          media.is_active,
          media.id
        );
      } else {
        // Insérer
        externalDb.prepare(`
          INSERT INTO media (
            id, barcode, title, original_title, release_year, release_date,
            duration_minutes, synopsis, description, average_rating, user_rating,
            media_type_id, media_state_id, location_id, jacket_image_url,
            backdrop_image_url, added_date, updated_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          media.id,
          media.barcode,
          media.title,
          media.original_title,
          media.release_year,
          media.release_date,
          media.duration_minutes,
          media.synopsis,
          media.description,
          media.average_rating,
          media.user_rating,
          media.media_type_id,
          media.media_state_id,
          media.location_id,
          media.jacket_image_url,
          media.backdrop_image_url,
          media.added_date,
          media.updated_at,
          media.is_active
        );
      }

      // Copier les catégories
      this.copyMediaCategories(media.id, externalDb);
      
      // Copier les personnes
      this.copyMediaPersons(media.id, externalDb);

    } catch (error) {
      console.error(`❌ Erreur lors de la copie de ${media.title} vers l'externe:`, error.message);
      throw error;
    }
  }

  /**
   * Copier un média vers la base locale
   */
  copyMediaToLocal(media) {
    try {
      // Vérifier si le média existe déjà
      const existing = this.db.prepare('SELECT * FROM media WHERE id = ?').get(media.id);
      
      if (existing) {
        // Mettre à jour
        this.db.prepare(`
          UPDATE media SET 
            barcode = ?,
            title = ?,
            original_title = ?,
            release_year = ?,
            release_date = ?,
            duration_minutes = ?,
            synopsis = ?,
            description = ?,
            average_rating = ?,
            user_rating = ?,
            media_type_id = ?,
            media_state_id = ?,
            location_id = ?,
            jacket_image_url = ?,
            backdrop_image_url = ?,
            added_date = ?,
            updated_at = ?,
            is_active = ?
          WHERE id = ?
        `).run(
          media.barcode,
          media.title,
          media.original_title,
          media.release_year,
          media.release_date,
          media.duration_minutes,
          media.synopsis,
          media.description,
          media.average_rating,
          media.user_rating,
          media.media_type_id,
          media.media_state_id,
          media.location_id,
          media.jacket_image_url,
          media.backdrop_image_url,
          media.added_date,
          media.updated_at,
          media.is_active,
          media.id
        );
      } else {
        // Insérer
        this.db.prepare(`
          INSERT INTO media (
            id, barcode, title, original_title, release_year, release_date,
            duration_minutes, synopsis, description, average_rating, user_rating,
            media_type_id, media_state_id, location_id, jacket_image_url,
            backdrop_image_url, added_date, updated_at, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          media.id,
          media.barcode,
          media.title,
          media.original_title,
          media.release_year,
          media.release_date,
          media.duration_minutes,
          media.synopsis,
          media.description,
          media.average_rating,
          media.user_rating,
          media.media_type_id,
          media.media_state_id,
          media.location_id,
          media.jacket_image_url,
          media.backdrop_image_url,
          media.added_date,
          media.updated_at,
          media.is_active
        );
      }

      // Copier les catégories
      this.copyMediaCategories(media.id, this.db);
      
      // Copier les personnes
      this.copyMediaPersons(media.id, this.db);

    } catch (error) {
      console.error(`❌ Erreur lors de la copie de ${media.title} vers la locale:`, error.message);
      throw error;
    }
  }

  /**
   * Copier les catégories d'un média
   */
  copyMediaCategories(mediaId, targetDb) {
    try {
      const categories = this.db.prepare(`
        SELECT * FROM media_categories WHERE media_id = ?
      `).all(mediaId);
      
      for (const cat of categories) {
        // Vérifier si la catégorie existe dans la cible
        const existingCat = targetDb.prepare('SELECT * FROM categories WHERE id = ?').get(cat.category_id);
        
        if (!existingCat) {
          // Copier la catégorie
          const sourceCat = this.db.prepare('SELECT * FROM categories WHERE id = ?').get(cat.category_id);
          if (sourceCat) {
            targetDb.prepare(`
              INSERT OR IGNORE INTO categories (id, name, description, parent_category_id, is_active)
              VALUES (?, ?, ?, ?, ?)
            `).run(
              sourceCat.id,
              sourceCat.name,
              sourceCat.description,
              sourceCat.parent_category_id,
              sourceCat.is_active
            );
          }
        }
        
        // Insérer la relation
        targetDb.prepare(`
          INSERT OR IGNORE INTO media_categories (media_id, category_id) VALUES (?, ?)
        `).run(mediaId, cat.category_id);
      }

    } catch (error) {
      console.error('❌ Erreur lors de la copie des catégories:', error.message);
    }
  }

  /**
   * Copier les personnes d'un média
   */
  copyMediaPersons(mediaId, targetDb) {
    try {
      const persons = this.db.prepare(`
        SELECT * FROM media_persons WHERE media_id = ?
      `).all(mediaId);
      
      for (const mp of persons) {
        // Vérifier si la personne existe dans la cible
        const existingPerson = targetDb.prepare('SELECT * FROM persons WHERE id = ?').get(mp.person_id);
        
        if (!existingPerson) {
          // Copier la personne
          const sourcePerson = this.db.prepare('SELECT * FROM persons WHERE id = ?').get(mp.person_id);
          if (sourcePerson) {
            targetDb.prepare(`
              INSERT OR IGNORE INTO persons (
                id, first_name, last_name, full_name, person_type_id, biography,
                birth_date, death_date, image_url, is_active
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              sourcePerson.id,
              sourcePerson.first_name,
              sourcePerson.last_name,
              sourcePerson.full_name,
              sourcePerson.person_type_id,
              sourcePerson.biography,
              sourcePerson.birth_date,
              sourcePerson.death_date,
              sourcePerson.image_url,
              sourcePerson.is_active
            );
          }
        }
        
        // Insérer la relation
        targetDb.prepare(`
          INSERT OR IGNORE INTO media_persons (media_id, person_id, role) VALUES (?, ?, ?)
        `).run(mediaId, mp.person_id, mp.role);
      }

    } catch (error) {
      console.error('❌ Erreur lors de la copie des personnes:', error.message);
    }
  }

  /**
   * Obtenir l'historique des synchronisations
   */
  getSyncHistory() {
    try {
      const history = this.db.prepare(`
        SELECT * FROM sync_logs 
        ORDER BY sync_date DESC
      `).all();
      
      return {
        success: true,
        data: history
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'historique:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
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
   * Fermer la base de données
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Service de synchronisation fermé');
    }
  }
}

// Exécuter le script
async function runSync() {
  const syncScript = new ExternalSyncScript();
  
  try {
    // Initialiser
    syncScript.initialize();

    // Analyser les arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('\n📋 Utilisation:');
      console.log('  npm run sync-external -- <command> [options]');
      console.log('\n📌 Commandes:');
      console.log('  detect              Détecter les disques externes');
      console.log('  list                Lister les disques détectés');
      console.log('  sync <path>         Synchroniser avec un disque');
      console.log('  sync-both <path>    Synchronisation bidirectionnelle');
      console.log('  sync-to <path>      Synchroniser vers un disque');
      console.log('  sync-from <path>    Synchroniser depuis un disque');
      console.log('  history             Afficher l\'historique des synchronisations');
      console.log('  config <key> <val>  Configurer les paramètres');
      console.log('\n📌 Exemples:');
      console.log('  npm run sync-external -- detect');
      console.log('  npm run sync-external -- sync /mnt/external-drive');
      console.log('  npm run sync-external -- history');
      
      syncScript.close();
      process.exit(0);
    }

    const command = args[0];

    switch (command) {
      case 'detect':
        const detection = syncScript.detectExternalDrives();
        if (detection.success) {
          console.log('\n📋 Disques détectés:');
          detection.data.forEach(drive => {
            console.log(`\n  Chemin: ${drive.path}`);
            console.log(`  Nom: ${drive.name}`);
            console.log(`  Type: ${drive.type}`);
            console.log(`  Amovible: ${drive.isRemovable ? 'Oui' : 'Non'}`);
          });
        } else {
          console.error('❌ Erreur:', detection.error);
          process.exit(1);
        }
        break;

      case 'list':
        // Afficher la liste des disques déjà détectés
        if (syncScript.drives.length > 0) {
          console.log('\n📋 Disques disponibles:');
          syncScript.drives.forEach(drive => {
            console.log(`\n  Chemin: ${drive.path}`);
            console.log(`  Nom: ${drive.name}`);
            console.log(`  Type: ${drive.type}`);
          });
        } else {
          console.log('⚠️  Aucun disque détecté. Utilisez la commande "detect" d\'abord.');
        }
        break;

      case 'sync':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le chemin du disque');
          process.exit(1);
        }
        const result = await syncScript.syncWithExternal(args[1], { direction: 'both' });
        if (!result.success) {
          console.error('❌ Échec de la synchronisation:', result.error);
          process.exit(1);
        }
        break;

      case 'sync-both':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le chemin du disque');
          process.exit(1);
        }
        const resultBoth = await syncScript.syncWithExternal(args[1], { direction: 'both' });
        if (!resultBoth.success) {
          console.error('❌ Échec de la synchronisation:', resultBoth.error);
          process.exit(1);
        }
        break;

      case 'sync-to':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le chemin du disque');
          process.exit(1);
        }
        const resultTo = await syncScript.syncWithExternal(args[1], { direction: 'to_external' });
        if (!resultTo.success) {
          console.error('❌ Échec de la synchronisation:', resultTo.error);
          process.exit(1);
        }
        break;

      case 'sync-from':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le chemin du disque');
          process.exit(1);
        }
        const resultFrom = await syncScript.syncWithExternal(args[1], { direction: 'from_external' });
        if (!resultFrom.success) {
          console.error('❌ Échec de la synchronisation:', resultFrom.error);
          process.exit(1);
        }
        break;

      case 'history':
        const history = syncScript.getSyncHistory();
        if (history.success) {
          console.log('\n📋 Historique des synchronisations:');
          history.data.forEach(log => {
            console.log(`\nID: ${log.id}`);
            console.log(`  Date: ${new Date(log.sync_date).toLocaleString('fr-FR')}`);
            console.log(`  Source: ${log.source_path}`);
            console.log(`  Destination: ${log.destination_path}`);
            console.log(`  Statut: ${log.status}`);
            console.log(`  Médias: ${log.media_count}, Succès: ${log.success_count}, Erreurs: ${log.error_count}`);
          });
        } else {
          console.error('❌ Erreur:', history.error);
          process.exit(1);
        }
        break;

      case 'config':
        if (args.length < 3) {
          console.error('❌ Veuillez spécifier la clé et la valeur');
          process.exit(1);
        }
        syncScript.config[args[1]] = args[2];
        console.log(`✅ Configuration mise à jour: ${args[1]}=${args[2]}`);
        break;

      default:
        console.error(`❌ Commande inconnue: ${command}`);
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  } finally {
    syncScript.close();
  }
}

// Démarrer le script
runSync();
