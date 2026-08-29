#!/usr/bin/env node

/**
 * Script de gestion des sauvegardes pour Médiathèque NATAN
 * 
 * Ce script permet de :
 * - Créer des sauvegardes automatiques et manuelles
 * - Vérifier l'intégrité des sauvegardes
 * - Restaurer une sauvegarde
 * - Synchroniser avec des disques externes
 */

const fs = require('fs');
const path = require('path');
const { Database } = require('better-sqlite3');
const crypto = require('crypto');

class BackupScript {
  constructor() {
    this.config = {
      dbPath: path.join(__dirname, '..', 'data', 'mediatheque.db'),
      backupDir: path.join(__dirname, '..', 'backups'),
      maxBackups: 30,
      autoBackup: true,
      backupFrequency: 'daily', // hourly, daily, weekly
      includeMedia: true
    };
    
    this.db = null;
  }

  /**
   * Initialiser avec la configuration
   */
  initialize(config = {}) {
    this.config = { ...this.config, ...config };
    
    // Créer le dossier de sauvegarde s'il n'existe pas
    if (!fs.existsSync(this.config.backupDir)) {
      fs.mkdirSync(this.config.backupDir, { recursive: true });
    }
    
    // Ouvrir la base de données
    this.db = new Database(this.config.dbPath);
    this.db.pragma('foreign_keys = ON');
    
    console.log('✅ Service de sauvegarde initialisé');
  }

  /**
   * Créer une sauvegarde
   */
  async createBackup(options = {}) {
    const {
      backupPath = null,
      isManual = false,
      isExternal = false
    } = options;

    try {
      console.log('📦 Création de la sauvegarde...');
      
      // Générer un nom de fichier unique
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `backup-${timestamp}.sqlite`;
      const finalBackupPath = backupPath || path.join(this.config.backupDir, backupFileName);

      // Créer le dossier de destination s'il n'existe pas
      const backupDir = path.dirname(finalBackupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Copier la base de données
      fs.copyFileSync(this.config.dbPath, finalBackupPath);
      
      // Obtenir les statistiques de la base
      const stats = this.getDatabaseStats();
      
      // Enregistrer la sauvegarde dans la base
      const backupId = this.generateId();
      const backupRecord = {
        id: backupId,
        backup_path: finalBackupPath,
        created_at: new Date().toISOString(),
        size_bytes: fs.statSync(finalBackupPath).size,
        media_count: stats.mediaCount,
        user_count: stats.userCount,
        is_external: isExternal ? 1 : 0
      };
      
      this.db.prepare(`
        INSERT INTO backups (id, backup_path, created_at, size_bytes, media_count, user_count, is_external)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        backupRecord.id,
        backupRecord.backup_path,
        backupRecord.created_at,
        backupRecord.size_bytes,
        backupRecord.media_count,
        backupRecord.user_count,
        backupRecord.is_external
      );

      console.log(`✅ Sauvegarde créée: ${finalBackupPath}`);
      console.log(`   Taille: ${this.formatSize(backupRecord.size_bytes)}`);
      console.log(`   Médias: ${backupRecord.media_count}, Utilisateurs: ${backupRecord.user_count}`);

      // Nettoyer les anciennes sauvegardes
      this.cleanupOldBackups();

      return {
        success: true,
        path: finalBackupPath,
        ...backupRecord
      };

    } catch (error) {
      console.error('❌ Erreur lors de la création de la sauvegarde:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtenir les statistiques de la base de données
   */
  getDatabaseStats() {
    try {
      const mediaCount = this.db.prepare('SELECT COUNT(*) as count FROM media').get().count;
      const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
      const loanCount = this.db.prepare('SELECT COUNT(*) as count FROM loans').get().count;
      const activeLoanCount = this.db.prepare('SELECT COUNT(*) as count FROM loans WHERE return_date IS NULL').get().count;
      
      return {
        mediaCount,
        userCount,
        loanCount,
        activeLoanCount
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des statistiques:', error.message);
      return {
        mediaCount: 0,
        userCount: 0,
        loanCount: 0,
        activeLoanCount: 0
      };
    }
  }

  /**
   * Nettoyer les anciennes sauvegardes
   */
  cleanupOldBackups() {
    try {
      // Obtenir la liste des sauvegardes
      const backups = this.db.prepare(`
        SELECT * FROM backups 
        ORDER BY created_at DESC
      `).all();

      if (backups.length <= this.config.maxBackups) {
        return;
      }

      // Supprimer les sauvegardes les plus anciennes
      const backupsToDelete = backups.slice(this.config.maxBackups);
      
      for (const backup of backupsToDelete) {
        try {
          // Supprimer le fichier
          if (fs.existsSync(backup.backup_path)) {
            fs.unlinkSync(backup.backup_path);
          }
          
          // Supprimer l'enregistrement de la base
          this.db.prepare('DELETE FROM backups WHERE id = ?').run(backup.id);
          
          console.log(`🗑️  Sauvegarde supprimée: ${backup.backup_path}`);
        } catch (error) {
          console.error(`⚠️  Erreur lors de la suppression de ${backup.backup_path}:`, error.message);
        }
      }

    } catch (error) {
      console.error('❌ Erreur lors du nettoyage des sauvegardes:', error.message);
    }
  }

  /**
   * Restaurer une sauvegarde
   */
  async restoreBackup(backupPath) {
    try {
      console.log(`🔄 Restauration depuis: ${backupPath}`);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Fichier de sauvegarde introuvable: ${backupPath}`);
      }

      // Vérifier l'intégrité de la sauvegarde
      const isValid = await this.verifyBackup(backupPath);
      if (!isValid) {
        throw new Error('Sauvegarde invalide ou corrompue');
      }

      // Fermer la base de données actuelle
      this.db.close();

      // Copier la sauvegarde vers l'emplacement de la base
      fs.copyFileSync(backupPath, this.config.dbPath);

      // Réouvrir la base de données
      this.db = new Database(this.config.dbPath);
      this.db.pragma('foreign_keys = ON');

      console.log('✅ Restauration terminée avec succès');
      
      return {
        success: true,
        path: backupPath
      };

    } catch (error) {
      console.error('❌ Erreur lors de la restauration:', error.message);
      // Réouvrir la base de données en cas d'erreur
      if (!this.db) {
        this.db = new Database(this.config.dbPath);
      }
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Vérifier l'intégrité d'une sauvegarde
   */
  async verifyBackup(backupPath) {
    try {
      console.log(`🔍 Vérification de: ${backupPath}`);
      
      if (!fs.existsSync(backupPath)) {
        return false;
      }

      // Vérifier la taille
      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        console.log('❌ Sauvegarde vide');
        return false;
      }

      // Essayer d'ouvrir la base de données
      const tempDb = new Database(backupPath);
      
      // Vérifier les tables essentielles
      const requiredTables = ['media', 'users', 'loans', 'media_types', 'media_states'];
      
      for (const table of requiredTables) {
        try {
          tempDb.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
        } catch (error) {
          console.log(`❌ Table manquante: ${table}`);
          tempDb.close();
          return false;
        }
      }

      tempDb.close();
      console.log('✅ Sauvegarde valide');
      return true;

    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error.message);
      return false;
    }
  }

  /**
   * Obtenir la liste des sauvegardes
   */
  getBackupList() {
    try {
      const backups = this.db.prepare(`
        SELECT * FROM backups 
        ORDER BY created_at DESC
      `).all();
      
      return {
        success: true,
        data: backups
      };
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des sauvegardes:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Supprimer une sauvegarde
   */
  deleteBackup(backupId) {
    try {
      // Obtenir le chemin de la sauvegarde
      const backup = this.db.prepare('SELECT * FROM backups WHERE id = ?').get(backupId);
      
      if (!backup) {
        throw new Error(`Sauvegarde non trouvée: ${backupId}`);
      }

      // Supprimer le fichier
      if (fs.existsSync(backup.backup_path)) {
        fs.unlinkSync(backup.backup_path);
      }

      // Supprimer l'enregistrement
      this.db.prepare('DELETE FROM backups WHERE id = ?').run(backupId);

      console.log(`✅ Sauvegarde supprimée: ${backup.backup_path}`);
      
      return {
        success: true
      };

    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Sauvegarder vers un disque externe
   */
  async backupToExternal(drivePath) {
    try {
      console.log(`📦 Sauvegarde vers disque externe: ${drivePath}`);
      
      if (!fs.existsSync(drivePath)) {
        throw new Error(`Disque externe introuvable: ${drivePath}`);
      }

      // Créer un dossier pour les sauvegardes sur le disque externe
      const externalBackupDir = path.join(drivePath, 'Mediatheque-NATAN-Backups');
      if (!fs.existsSync(externalBackupDir)) {
        fs.mkdirSync(externalBackupDir, { recursive: true });
      }

      // Créer la sauvegarde
      const result = await this.createBackup({
        backupPath: path.join(externalBackupDir, `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`),
        isExternal: true
      });

      return result;

    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde externe:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Importer depuis un disque externe
   */
  async importFromExternal(drivePath) {
    try {
      console.log(`📥 Import depuis disque externe: ${drivePath}`);
      
      if (!fs.existsSync(drivePath)) {
        throw new Error(`Disque externe introuvable: ${drivePath}`);
      }

      // Chercher les sauvegardes sur le disque externe
      const externalBackupDir = path.join(drivePath, 'Mediatheque-NATAN-Backups');
      
      if (!fs.existsSync(externalBackupDir)) {
        throw new Error('Aucun dossier de sauvegarde trouvé sur le disque externe');
      }

      // Obtenir la sauvegarde la plus récente
      const files = fs.readdirSync(externalBackupDir)
        .filter(f => f.endsWith('.sqlite'))
        .map(f => ({
          name: f,
          path: path.join(externalBackupDir, f),
          time: fs.statSync(path.join(externalBackupDir, f)).mtime
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length === 0) {
        throw new Error('Aucune sauvegarde trouvée sur le disque externe');
      }

      // Copier la sauvegarde vers le dossier local
      const latestBackup = files[0];
      const localBackupPath = path.join(this.config.backupDir, latestBackup.name);
      
      fs.copyFileSync(latestBackup.path, localBackupPath);

      // Enregistrer dans la base
      const stats = this.getDatabaseStats();
      const backupId = this.generateId();
      
      this.db.prepare(`
        INSERT INTO backups (id, backup_path, created_at, size_bytes, media_count, user_count, is_external)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        backupId,
        localBackupPath,
        new Date().toISOString(),
        fs.statSync(localBackupPath).size,
        stats.mediaCount,
        stats.userCount,
        0
      );

      console.log(`✅ Sauvegarde importée depuis le disque externe: ${latestBackup.name}`);
      
      return {
        success: true,
        path: localBackupPath
      };

    } catch (error) {
      console.error('❌ Erreur lors de l\'import depuis le disque externe:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Synchroniser avec un disque externe
   */
  async syncWithExternal(drivePath) {
    try {
      console.log(`🔄 Synchronisation avec disque externe: ${drivePath}`);
      
      // Vérifier si le disque contient des sauvegardes
      const externalBackupDir = path.join(drivePath, 'Mediatheque-NATAN-Backups');
      
      if (fs.existsSync(externalBackupDir)) {
        // Il y a des sauvegardes sur le disque, vérifier si elles sont plus récentes
        const externalFiles = fs.readdirSync(externalBackupDir)
          .filter(f => f.endsWith('.sqlite'))
          .map(f => ({
            name: f,
            path: path.join(externalBackupDir, f),
            time: fs.statSync(path.join(externalBackupDir, f)).mtime
          }))
          .sort((a, b) => b.time - a.time);

        const localBackups = this.db.prepare(`
          SELECT * FROM backups 
          ORDER BY created_at DESC
        `).all();

        if (externalFiles.length > 0 && (
          localBackups.length === 0 || 
          new Date(externalFiles[0].time) > new Date(localBackups[0].created_at)
        )) {
          // La sauvegarde externe est plus récente, l'importer
          console.log('📥 Import de la sauvegarde externe (plus récente)');
          await this.importFromExternal(drivePath);
        } else {
          // La sauvegarde locale est plus récente, l'exporter
          console.log('📤 Export vers le disque externe');
          await this.backupToExternal(drivePath);
        }
      } else {
        // Pas de sauvegarde sur le disque, créer une sauvegarde externe
        await this.backupToExternal(drivePath);
      }

      console.log('✅ Synchronisation terminée');
      
      return {
        success: true
      };

    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Configurer la sauvegarde automatique
   */
  configureAutoBackup(config) {
    this.config = { ...this.config, ...config };
    
    // Sauvegarder la configuration dans la base
    this.db.prepare(`
      INSERT OR REPLACE INTO config (id, value) 
      VALUES ('autoBackup', ?)
    `).run(JSON.stringify(this.config));

    console.log('✅ Configuration de sauvegarde automatique mise à jour');
    
    return {
      success: true,
      config: this.config
    };
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
   * Formater la taille en octets
   */
  formatSize(bytes) {
    if (bytes === 0) return '0 octets';
    const k = 1024;
    const sizes = ['octets', 'Ko', 'Mo', 'Go'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Fermer la base de données
   */
  close() {
    if (this.db) {
      this.db.close();
      console.log('✅ Service de sauvegarde fermé');
    }
  }
}

// Exécuter le script
async function runBackup() {
  const backupScript = new BackupScript();
  
  try {
    // Initialiser
    backupScript.initialize();

    // Analyser les arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('\n📋 Utilisation:');
      console.log('  npm run backup -- <command> [options]');
      console.log('\n📌 Commandes:');
      console.log('  create              Créer une sauvegarde manuelle');
      console.log('  list                Lister les sauvegardes');
      console.log('  restore <id>        Restaurer une sauvegarde');
      console.log('  delete <id>         Supprimer une sauvegarde');
      console.log('  verify <path>       Vérifier une sauvegarde');
      console.log('  export <path>       Exporter vers un disque externe');
      console.log('  import <path>       Importer depuis un disque externe');
      console.log('  sync <path>         Synchroniser avec un disque externe');
      console.log('  auto on/off        Activer/Désactiver la sauvegarde automatique');
      console.log('\n📌 Exemples:');
      console.log('  npm run backup -- create');
      console.log('  npm run backup -- list');
      console.log('  npm run backup -- export /mnt/external-drive');
      
      backupScript.close();
      process.exit(0);
    }

    const command = args[0];

    switch (command) {
      case 'create':
        const result = await backupScript.createBackup({ isManual: true });
        if (!result.success) {
          console.error('❌ Échec de la sauvegarde:', result.error);
          process.exit(1);
        }
        break;

      case 'list':
        const backups = backupScript.getBackupList();
        if (backups.success) {
          console.log('\n📋 Liste des sauvegardes:');
          backups.data.forEach(backup => {
            console.log(`\nID: ${backup.id}`);
            console.log(`  Chemin: ${backup.backup_path}`);
            console.log(`  Date: ${new Date(backup.created_at).toLocaleString('fr-FR')}`);
            console.log(`  Taille: ${backupScript.formatSize(backup.size_bytes)}`);
            console.log(`  Médias: ${backup.media_count}, Utilisateurs: ${backup.user_count}`);
            console.log(`  Externe: ${backup.is_external ? 'Oui' : 'Non'}`);
          });
        } else {
          console.error('❌ Erreur:', backups.error);
          process.exit(1);
        }
        break;

      case 'restore':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier l\'ID de la sauvegarde à restaurer');
          process.exit(1);
        }
        const backup = backupScript.db.prepare('SELECT * FROM backups WHERE id = ?').get(args[1]);
        if (!backup) {
          console.error('❌ Sauvegarde non trouvée');
          process.exit(1);
        }
        const restoreResult = await backupScript.restoreBackup(backup.backup_path);
        if (!restoreResult.success) {
          console.error('❌ Échec de la restauration:', restoreResult.error);
          process.exit(1);
        }
        break;

      case 'delete':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier l\'ID de la sauvegarde à supprimer');
          process.exit(1);
        }
        const deleteResult = backupScript.deleteBackup(args[1]);
        if (!deleteResult.success) {
          console.error('❌ Échec de la suppression:', deleteResult.error);
          process.exit(1);
        }
        break;

      case 'verify':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le chemin de la sauvegarde à vérifier');
          process.exit(1);
        }
        const isValid = await backupScript.verifyBackup(args[1]);
        console.log(isValid ? '✅ Sauvegarde valide' : '❌ Sauvegarde invalide');
        process.exit(isValid ? 0 : 1);
        break;

      case 'export':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le chemin du disque externe');
          process.exit(1);
        }
        const exportResult = await backupScript.backupToExternal(args[1]);
        if (!exportResult.success) {
          console.error('❌ Échec de l\'export:', exportResult.error);
          process.exit(1);
        }
        break;

      case 'import':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le chemin du disque externe');
          process.exit(1);
        }
        const importResult = await backupScript.importFromExternal(args[1]);
        if (!importResult.success) {
          console.error('❌ Échec de l\'import:', importResult.error);
          process.exit(1);
        }
        break;

      case 'sync':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier le chemin du disque externe');
          process.exit(1);
        }
        const syncResult = await backupScript.syncWithExternal(args[1]);
        if (!syncResult.success) {
          console.error('❌ Échec de la synchronisation:', syncResult.error);
          process.exit(1);
        }
        break;

      case 'auto':
        if (args.length < 2) {
          console.error('❌ Veuillez spécifier on ou off');
          process.exit(1);
        }
        const enable = args[1] === 'on';
        backupScript.configureAutoBackup({ autoBackup: enable });
        break;

      default:
        console.error(`❌ Commande inconnue: ${command}`);
        process.exit(1);
    }

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  } finally {
    backupScript.close();
  }
}

// Démarrer le script
runBackup();
