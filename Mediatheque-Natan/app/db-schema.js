// Schéma SQLite de Médiathèque NATAN — source unique de vérité.
// Utilisé par app/main.js (application Electron) et par les scripts CLI
// (migrate.js, backup.js, sync-external.js) pour garantir un schéma identique.
const SCHEMA_SQL = `
    -- Table des types de médias
    CREATE TABLE IF NOT EXISTS media_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    -- Table des états des médias
    CREATE TABLE IF NOT EXISTS media_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    -- Table des types de personnes
    CREATE TABLE IF NOT EXISTS person_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    -- Table des types d'emplacements
    CREATE TABLE IF NOT EXISTS location_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    -- Table des niveaux d'accès utilisateur
    CREATE TABLE IF NOT EXISTS user_access_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT
    );

    -- Table des catégories
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT,
      level INTEGER NOT NULL DEFAULT 1,
      description TEXT,
      FOREIGN KEY (parent_id) REFERENCES categories(id)
    );

    -- Table des emplacements
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type_id INTEGER NOT NULL,
      capacity_max INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (type_id) REFERENCES location_types(id)
    );

    -- Table des personnes (artistes, réalisateurs)
    CREATE TABLE IF NOT EXISTS persons (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT NOT NULL,
      type_id INTEGER NOT NULL,
      biography TEXT,
      birth_date TEXT,
      death_date TEXT,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (type_id) REFERENCES person_types(id)
    );

    -- Table des médias
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      original_title TEXT,
      type_id INTEGER NOT NULL,
      release_year INTEGER,
      duration_minutes INTEGER,
      synopsis TEXT,
      average_rating DECIMAL(3,1) DEFAULT 0.0,
      added_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      state_id INTEGER NOT NULL,
      location_id TEXT,
      has_jacket BOOLEAN NOT NULL DEFAULT TRUE,
      barcode VARCHAR(50),
      jacket_image_url TEXT,
      imdb_id TEXT,
      tmdb_id INTEGER,
      musicbrainz_id TEXT,
      tmdb_collection_id INTEGER,
      tmdb_collection_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (type_id) REFERENCES media_types(id),
      FOREIGN KEY (state_id) REFERENCES media_states(id),
      FOREIGN KEY (location_id) REFERENCES locations(id)
    );

    -- Table de liaison médias-personnes
    CREATE TABLE IF NOT EXISTS media_persons (
      media_id TEXT NOT NULL,
      person_id TEXT NOT NULL,
      role TEXT NOT NULL,
      PRIMARY KEY (media_id, person_id, role),
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
      FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
    );

    -- Table de liaison médias-catégories
    CREATE TABLE IF NOT EXISTS media_categories (
      media_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      relevance INTEGER DEFAULT 5,
      PRIMARY KEY (media_id, category_id),
      FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    -- Table des utilisateurs
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      password_hash TEXT,
      registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      access_level_id INTEGER NOT NULL DEFAULT 1,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT TRUE,
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (access_level_id) REFERENCES user_access_levels(id)
    );

    -- Table des profils utilisateurs
    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY,
      preferred_categories JSON,
      avoided_genres JSON,
      loan_frequency TEXT,
      search_history JSON,
      preferences JSON,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Table des emprunts
    CREATE TABLE IF NOT EXISTS loans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      media_id TEXT NOT NULL,
      loan_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      due_date DATETIME NOT NULL,
      return_date DATETIME,
      user_rating INTEGER,
      user_note TEXT,
      return_state TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (media_id) REFERENCES media(id)
    );

    -- Table des sauvegardes
    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      backup_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      size_bytes INTEGER,
      media_count INTEGER,
      user_count INTEGER,
      is_external BOOLEAN DEFAULT FALSE
    );

    -- Table des synchronisations
    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      destination TEXT NOT NULL,
      sync_type TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      items_added INTEGER DEFAULT 0,
      items_updated INTEGER DEFAULT 0,
      items_deleted INTEGER DEFAULT 0,
      conflicts INTEGER DEFAULT 0,
      error_message TEXT
    );

    -- Table des logs
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      context TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Table des métadonnées de version
    CREATE TABLE IF NOT EXISTS version_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      schema_version INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT
    );

    -- Index pour les recherches
    CREATE INDEX IF NOT EXISTS idx_media_title ON media(title);
    CREATE INDEX IF NOT EXISTS idx_media_type ON media(type_id);
    CREATE INDEX IF NOT EXISTS idx_media_year ON media(release_year);
    CREATE INDEX IF NOT EXISTS idx_media_barcode ON media(barcode);
    CREATE INDEX IF NOT EXISTS idx_media_location ON media(location_id);
    CREATE INDEX IF NOT EXISTS idx_media_categories ON media_categories(media_id, category_id);
    CREATE INDEX IF NOT EXISTS idx_media_persons ON media_persons(media_id, person_id);
    CREATE INDEX IF NOT EXISTS idx_loans_user ON loans(user_id);
    CREATE INDEX IF NOT EXISTS idx_loans_media ON loans(media_id);
    CREATE INDEX IF NOT EXISTS idx_loans_dates ON loans(loan_date, due_date, return_date);

    -- Trigger pour les timestamps
    CREATE TRIGGER IF NOT EXISTS update_media_timestamp AFTER UPDATE ON media
    FOR EACH ROW BEGIN
      UPDATE media SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_location_timestamp AFTER UPDATE ON locations
    FOR EACH ROW BEGIN
      UPDATE locations SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS update_user_timestamp AFTER UPDATE ON users
    FOR EACH ROW BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
    END;

    -- Données de référence initiales
    INSERT OR IGNORE INTO media_types (id, name, description) VALUES
    (1, 'DVD', 'Digital Versatile Disc'),
    (2, 'Blu-ray', 'Blu-ray Disc'),
    (3, 'CD', 'Compact Disc'),
    (4, 'Vinyl', 'Disque vinyle');

    INSERT OR IGNORE INTO media_states (id, name, description) VALUES
    (1, 'Neuf', 'État neuf, jamais utilisé'),
    (2, 'Bon', 'Bon état, quelques traces d''usure'),
    (3, 'Moyen', 'État moyen, rayures visibles'),
    (4, 'Usagé', 'Usagé, nécessite vérification');

    INSERT OR IGNORE INTO person_types (id, name) VALUES
    (1, 'Réalisateur'),
    (2, 'Acteur'),
    (3, 'Actrice'),
    (4, 'Musicien'),
    (5, 'Groupe'),
    (6, 'Compositeur'),
    (7, 'Scénariste'),
    (8, 'Producteur');

    INSERT OR IGNORE INTO location_types (id, name, description) VALUES
    (1, 'DVDthèque_Jacquettes', 'Emplacement pour DVDs avec jaquettes et codes-barres'),
    (2, 'CDthèque_Sans_Jacquettes', 'Emplacement pour CDs sans jaquettes'),
    (3, 'Archivage', 'Archives, accès peu fréquent'),
    (4, 'En_Prêt', 'Médias actuellement en prêt'),
    (5, 'En_Réparation', 'Médias en cours de réparation'),
    (6, 'Disque_Dur_Externe', 'Copie numérique stockée sur un disque dur externe');

    INSERT OR IGNORE INTO user_access_levels (id, name, description) VALUES
    (1, 'Invité', 'Accès limité, consultation uniquement'),
    (2, 'Membre', 'Accès complet aux emprunts'),
    (3, 'Admin', 'Accès complet y compris la gestion du catalogue');

    -- Version du schéma
    INSERT OR IGNORE INTO version_info (schema_version, description) VALUES
    (1, 'Version initiale du schéma');
`;

module.exports = { SCHEMA_SQL };
