// Import de données Movie Buddy (Kimico) vers le schéma de Médiathèque NATAN.
// Partagé entre l'application Electron (menu Fichier > Importer depuis > Movie Buddy)
// et le script CLI scripts/migrate.js, pour n'avoir qu'une seule implémentation.
//
// Le format exact exporté par Movie Buddy n'a pas pu être vérifié : les
// en-têtes du fichier CSV sont détectées automatiquement et plusieurs
// variantes de noms de colonnes usuelles sont reconnues (voir `pick`).

const { v4: uuidv4 } = require('uuid');

const PERSON_TYPE = { REALISATEUR: 1, ACTEUR: 2, SCENARISTE: 7 };
const DEFAULT_MEDIA_STATE_ID = 2; // 'Bon' — état par défaut pour une collection existante importée
const DEFAULT_LOCATION_TYPE_ID = 3; // 'Archivage' — type par défaut pour une location créée à la volée

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

/** Normalise les clés d'une ligne CSV (trim + minuscules) pour un accès tolérant aux variantes d'en-têtes. */
function normalizeRow(row) {
  const map = {};
  for (const [key, value] of Object.entries(row)) {
    map[key.trim().toLowerCase()] = typeof value === 'string' ? value.trim() : value;
  }
  return map;
}

/** Retourne la première valeur non vide parmi plusieurs noms de colonnes possibles. */
function pick(normalizedRow, ...candidateKeys) {
  for (const key of candidateKeys) {
    const value = normalizedRow[key.toLowerCase()];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

async function getMediaTypeId(db, typeName) {
  if (!typeName) return 1;
  const type = await dbGet(db, 'SELECT id FROM media_types WHERE name = ?', [typeName]);
  return type ? type.id : 1;
}

async function getOrCreateLocation(db, name, cache) {
  if (!name) return null;
  if (cache.has(name)) return cache.get(name);

  const existing = await dbGet(db, 'SELECT id FROM locations WHERE name = ?', [name]);
  if (existing) {
    cache.set(name, existing.id);
    return existing.id;
  }

  const locationId = uuidv4();
  await dbRun(db, 'INSERT INTO locations (id, name, type_id) VALUES (?, ?, ?)', [locationId, name, DEFAULT_LOCATION_TYPE_ID]);
  cache.set(name, locationId);
  return locationId;
}

async function linkPerson(db, fullName, personTypeId, role, mediaId, personMap) {
  if (!fullName) return;

  let personId = personMap.get(fullName);
  if (!personId) {
    personId = uuidv4();
    const names = fullName.split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || 'Inconnu';
    await dbRun(
      db,
      'INSERT OR IGNORE INTO persons (id, first_name, last_name, type_id) VALUES (?, ?, ?, ?)',
      [personId, firstName, lastName, personTypeId]
    );
    personMap.set(fullName, personId);
  }

  await dbRun(db, 'INSERT OR IGNORE INTO media_persons (media_id, person_id, role) VALUES (?, ?, ?)', [mediaId, personId, role]);
}

/**
 * Importe des lignes CSV Movie Buddy dans la base `db` (déjà ouverte, schéma déjà créé).
 * @returns {Promise<{ imported: number, errors: number, errorDetails: string[] }>}
 */
async function importMovieBuddyRows(db, rows) {
  const personMap = new Map();
  const categoryMap = new Map();
  const locationMap = new Map();
  const userMap = new Map();

  let imported = 0;
  let errors = 0;
  const errorDetails = [];

  for (const rawItem of rows) {
    const item = normalizeRow(rawItem);
    const title = pick(item, 'title', 'name') || 'Sans titre';
    try {
      const mediaId = pick(item, 'id') || uuidv4();
      const originalTitle = pick(item, 'original_title', 'originaltitle');
      const year = parseInt(pick(item, 'year', 'release_year'), 10) || null;
      const runtime = parseInt(pick(item, 'runtime', 'duration', 'duration_minutes'), 10) || null;
      const plot = pick(item, 'plot', 'synopsis', 'overview');
      const posterUrl = pick(item, 'poster_url', 'poster', 'image_url');
      const imdbId = pick(item, 'imdb_id', 'imdbid');
      const tmdbId = parseInt(pick(item, 'tmdb_id', 'tmdbid'), 10) || null;
      const rating = parseFloat(pick(item, 'rating', 'average_rating')) || null;
      const barcode = pick(item, 'barcode', 'upc');
      const mediaTypeId = await getMediaTypeId(db, pick(item, 'media_type', 'type', 'category'));

      let locationId = null;
      const locationName = pick(item, 'location', 'shelf');
      if (locationName) {
        locationId = await getOrCreateLocation(db, locationName, locationMap);
      }

      await dbRun(
        db,
        `INSERT OR IGNORE INTO media (
          id, title, original_title, type_id, release_year, duration_minutes,
          synopsis, average_rating, state_id, location_id, barcode,
          jacket_image_url, imdb_id, tmdb_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mediaId, title, originalTitle, mediaTypeId, year, runtime,
          plot, rating, DEFAULT_MEDIA_STATE_ID, locationId, barcode,
          posterUrl, imdbId, tmdbId
        ]
      );

      const genres = pick(item, 'genres', 'genre');
      if (genres) {
        for (const genre of genres.split(',').map((g) => g.trim()).filter(Boolean)) {
          if (!categoryMap.has(genre)) {
            const categoryId = uuidv4();
            await dbRun(db, 'INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)', [categoryId, genre]);
            categoryMap.set(genre, categoryId);
          }
          await dbRun(db, 'INSERT OR IGNORE INTO media_categories (media_id, category_id) VALUES (?, ?)', [mediaId, categoryMap.get(genre)]);
        }
      }

      await linkPerson(db, pick(item, 'director', 'directors'), PERSON_TYPE.REALISATEUR, 'Réalisateur', mediaId, personMap);
      await linkPerson(db, pick(item, 'writer', 'writers', 'screenplay'), PERSON_TYPE.SCENARISTE, 'Scénariste', mediaId, personMap);
      const actors = pick(item, 'actors', 'cast');
      if (actors) {
        for (const actor of actors.split(',').map((a) => a.trim()).filter(Boolean)) {
          await linkPerson(db, actor, PERSON_TYPE.ACTEUR, 'Acteur', mediaId, personMap);
        }
      }

      const loanedTo = pick(item, 'loaned_to', 'borrower');
      if (loanedTo) {
        if (!userMap.has(loanedTo)) {
          const userId = uuidv4();
          const [firstName, ...lastNameParts] = loanedTo.split(' ');
          const lastName = lastNameParts.join(' ') || 'Inconnu';
          await dbRun(db, 'INSERT OR IGNORE INTO users (id, first_name, last_name, access_level_id) VALUES (?, ?, ?, ?)', [userId, firstName, lastName, 2]);
          userMap.set(loanedTo, userId);
        }

        const loanDate = pick(item, 'loan_date') || new Date().toISOString();
        const dueDate = pick(item, 'due_date') || new Date(new Date(loanDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

        await dbRun(
          db,
          'INSERT OR IGNORE INTO loans (id, user_id, media_id, loan_date, due_date) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), userMap.get(loanedTo), mediaId, loanDate, dueDate]
        );
      }

      imported++;
    } catch (error) {
      errors++;
      errorDetails.push(`${title}: ${error.message}`);
    }
  }

  return { imported, errors, errorDetails };
}

module.exports = { importMovieBuddyRows };
