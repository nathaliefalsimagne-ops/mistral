import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useToast } from '../contexts/ToastContext';
import {
  ArrowLeft,
  Save,
  X,
  Film,
  Music,
  Disc,
  BookOpen,
  Search,
  Camera,
  Barcode,
  Image as ImageIcon,
  MapPin,
  Tag,
  Users,
  Plus,
  Trash2,
  AlertTriangle
} from 'lucide-react';

const AddMedia = ({ isEdit = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { media: allMedia, getMediaById, addMedia, updateMedia, locations, locationTypes, categories, persons, createLocation } = useDatabase();
  const { success, error: showError } = useToast();

  const [media, setMedia] = useState({
    id: '',
    title: '',
    original_title: '',
    type_id: 1,
    release_year: '',
    duration_minutes: '',
    synopsis: '',
    average_rating: 0,
    state_id: 2,
    location_id: '',
    has_jacket: true,
    barcode: '',
    jacket_image_url: '',
    imdb_id: '',
    tmdb_id: '',
    musicbrainz_id: '',
    added_date: new Date().toISOString()
  });
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedPersons, setSelectedPersons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newPerson, setNewPerson] = useState({ name: '', role: '', type: 1 });
  const [newLocation, setNewLocation] = useState({ name: '', type_id: 1 });
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState(null);
  const [isReimportingGenres, setIsReimportingGenres] = useState(false);

  // Charger les données si c'est une édition
  useEffect(() => {
    const loadMediaData = async () => {
      if (isEdit && id) {
        try {
          const response = await getMediaById(id);
          if (response.success) {
            setMedia(response.data);
            
            const categoriesResponse = await window.electronAPI.db.getMediaCategories(id);
            setSelectedCategories(categoriesResponse.success ? categoriesResponse.data : []);

            const personsResponse = await window.electronAPI.db.getMediaPersons(id);
            setSelectedPersons(personsResponse.success ? personsResponse.data : []);
          } else {
            showError('Média introuvable');
            navigate('/404');
          }
        } catch (err) {
          console.error('Erreur lors du chargement du média:', err);
          showError('Erreur lors du chargement du média');
          navigate('/404');
        }
      }
      setIsLoading(false);
    };

    loadMediaData();
  }, [id, isEdit, getMediaById, showError, navigate]);

  // Générer un nouvel ID si nécessaire
  useEffect(() => {
    if (!isEdit && !media.id) {
      setMedia(prev => ({ ...prev, id: window.electronAPI.utils.generateId() }));
    }
  }, [isEdit, media.id]);

  // Pré-remplir le code-barres transmis depuis le Scanner (?barcode=...)
  useEffect(() => {
    const scannedBarcode = searchParams.get('barcode');
    if (!isEdit && scannedBarcode) {
      setMedia(prev => ({ ...prev, barcode: scannedBarcode }));
    }
  }, [isEdit, searchParams]);

  // Rechercher dans TMDB
  const searchInTMDB = useCallback(async () => {
    if (!searchQuery.trim()) return;

    try {
      // Appeler l'API TMDB via Electron
      const response = await window.electronAPI.api.searchTMDB(searchQuery, 'movie');
      if (response.success) {
        setSearchResults(response.results.slice(0, 5));
      } else {
        showError(response.error || 'Erreur lors de la recherche TMDB');
      }
    } catch (err) {
      console.error('Erreur lors de la recherche TMDB:', err);
      showError('Erreur lors de la recherche TMDB');
    }
  }, [searchQuery, showError]);

  // Sélectionner un résultat de recherche
  const selectSearchResult = useCallback(async (result) => {
    setMedia(prev => ({
      ...prev,
      title: result.title,
      original_title: result.original_title,
      release_year: result.release_year,
      duration_minutes: result.runtime,
      synopsis: result.overview,
      // La note n'est pas importée : c'est à l'utilisateur de noter le média
      // s'il le souhaite (ex: au moment d'un emprunt), pas TMDB.
      imdb_id: result.imdb_id,
      tmdb_id: result.id,
      jacket_image_url: result.poster_path ? `https://image.tmdb.org/t/p/w500${result.poster_path}` : ''
    }));
    setSearchResults([]);
    setSearchQuery('');
    success('Informations importées depuis TMDB');

    if (result.genres?.length > 0) {
      setSelectedCategories(result.genres.map(name => ({ id: window.electronAPI.utils.generateId(), name })));
    }

    // Récupérer le casting (réalisateur, scénaristes, acteurs) en tâche de
    // fond : un échec ici (ex: clé API désactivée entre temps) ne doit pas
    // bloquer l'import des informations principales, déjà appliquées.
    try {
      const creditsResponse = await window.electronAPI.api.getTmdbCredits(result.id, 'movie');
      if (creditsResponse.success) {
        const { directors, writers, cast } = creditsResponse.data;
        const importedPersons = [
          ...directors.map(name => ({ id: window.electronAPI.utils.generateId(), name, role: 'Réalisateur', type: 1 })),
          ...writers.map(name => ({ id: window.electronAPI.utils.generateId(), name, role: 'Scénariste', type: 7 })),
          ...cast.map(({ name, character }) => ({
            id: window.electronAPI.utils.generateId(),
            name,
            role: character || 'Acteur',
            type: 2
          }))
        ];
        if (importedPersons.length > 0) {
          setSelectedPersons(importedPersons);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la récupération du casting TMDB:', err);
    }
  }, [success]);

  // Gérer le changement des champs
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setMedia(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value) || '' : 
              value
    }));
  }, []);

  // Ajouter une catégorie
  const addCategory = useCallback(() => {
    if (!newCategory.trim()) return;
    
    const newCat = {
      id: window.electronAPI.utils.generateId(),
      name: newCategory
    };
    setSelectedCategories(prev => [...prev, newCat]);
    setNewCategory('');
    setShowCategoryModal(false);
    success('Catégorie ajoutée');
  }, [newCategory, success]);

  // Supprimer une catégorie
  const removeCategory = useCallback((id) => {
    setSelectedCategories(prev => prev.filter(cat => cat.id !== id));
  }, []);

  // Réimporter les genres TMDB d'un média déjà identifié (ex: ajouté avant
  // que l'import des catégories n'existe). Complète sans écraser les
  // catégories déjà présentes (ex: ajoutées à la main).
  const reimportGenres = useCallback(async () => {
    if (!media.tmdb_id) return;

    setIsReimportingGenres(true);
    try {
      const res = await window.electronAPI.api.getTmdbGenres(media.tmdb_id, 'movie');
      if (res.success) {
        const existingNames = new Set(selectedCategories.map(c => c.name.toLowerCase()));
        const newGenres = res.data.genres.filter(name => !existingNames.has(name.toLowerCase()));
        if (newGenres.length > 0) {
          setSelectedCategories(prev => [
            ...prev,
            ...newGenres.map(name => ({ id: window.electronAPI.utils.generateId(), name }))
          ]);
          success(`${newGenres.length} genre(s) importé(s)`);
        } else {
          success('Genres déjà à jour');
        }
      } else {
        showError(res.error || 'Erreur lors de la réimportation des genres');
      }
    } catch (err) {
      showError(`Erreur: ${err.message}`);
    } finally {
      setIsReimportingGenres(false);
    }
  }, [media.tmdb_id, selectedCategories, success, showError]);

  // Créer un nouvel emplacement (ex: "Disque dur externe")
  const createNewLocation = useCallback(async () => {
    if (!newLocation.name.trim()) return;

    setIsCreatingLocation(true);
    const locationId = window.electronAPI.utils.generateId();
    const res = await createLocation({
      id: locationId,
      name: newLocation.name,
      type_id: newLocation.type_id
    });
    setIsCreatingLocation(false);

    if (res.success) {
      setMedia(prev => ({ ...prev, location_id: locationId }));
      setNewLocation({ name: '', type_id: 1 });
      setShowLocationModal(false);
      success('Emplacement créé');
    } else {
      showError(res.error || 'Erreur lors de la création de l\'emplacement');
    }
  }, [newLocation, createLocation, success, showError]);

  // Ajouter une personne
  const addPerson = useCallback(() => {
    if (!newPerson.name.trim()) return;
    
    const newPer = {
      id: window.electronAPI.utils.generateId(),
      ...newPerson
    };
    setSelectedPersons(prev => [...prev, newPer]);
    setNewPerson({ name: '', role: '', type: 1 });
    setShowPersonModal(false);
    success('Personne ajoutée');
  }, [newPerson, success]);

  // Supprimer une personne
  const removePerson = useCallback((id) => {
    setSelectedPersons(prev => prev.filter(person => person.id !== id));
  }, []);

  // Enregistrer réellement le média (après confirmation d'un doublon éventuel)
  const performSave = useCallback(async () => {
    setDuplicateMatches(null);
    setIsSubmitting(true);

    try {
      const mediaData = {
        ...media,
        has_jacket: media.has_jacket ? 1 : 0
      };

      let response;
      if (isEdit) {
        response = await updateMedia(mediaData);
      } else {
        response = await addMedia(mediaData);
      }

      if (response.success) {
        // Les personnes associées (importées de TMDB ou ajoutées à la main)
        // ne sont pas incluses dans addMedia/updateMedia : on les enregistre
        // séparément via la table de liaison media_persons.
        try {
          await window.electronAPI.db.saveMediaPersons(media.id, selectedPersons);
        } catch (personsErr) {
          console.error('Erreur lors de l\'enregistrement des personnes:', personsErr);
        }

        // Idem pour les catégories (genres TMDB ou ajoutées à la main).
        try {
          await window.electronAPI.db.saveMediaCategories(media.id, selectedCategories);
        } catch (categoriesErr) {
          console.error('Erreur lors de l\'enregistrement des catégories:', categoriesErr);
        }

        success(`Média ${isEdit ? 'mis à jour' : 'ajouté'} avec succès`);
        navigate(`/media/detail/${response.data?.lastInsertRowid || media.id}`);
      } else {
        showError(response.error || `Erreur lors de l'${isEdit ? 'update' : 'ajout'}`);
      }
    } catch (err) {
      console.error('Erreur lors de la soumission:', err);
      showError(`Erreur lors de la soumission: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [media, isEdit, addMedia, updateMedia, selectedPersons, selectedCategories, showError, success, navigate]);

  // Soumettre le formulaire : avertit si un média du même titre existe déjà
  // (ex: re-scanner par erreur un DVD déjà enregistré), sans bloquer -
  // posséder à la fois le DVD et le Blu-ray d'un même titre est légitime.
  const handleSubmit = useCallback((e) => {
    e.preventDefault();

    if (!media.title.trim()) {
      showError('Le titre est obligatoire');
      return;
    }

    if (!isEdit) {
      const normalizedTitle = media.title.trim().toLowerCase();
      const matches = allMedia.filter(m => m.title.trim().toLowerCase() === normalizedTitle);
      if (matches.length > 0) {
        setDuplicateMatches(matches);
        return;
      }
    }

    performSave();
  }, [media.title, isEdit, allMedia, showError, performSave]);

  // Scanner un code-barres
  const handleScanBarcode = useCallback(() => {
    navigate('/scan?from=add-media');
  }, [navigate]);

  // Prendre une photo pour la reconnaissance visuelle
  const handleTakePhoto = useCallback(() => {
    navigate('/recognize?from=add-media');
  }, [navigate]);

  // Annuler et retourner
  const handleCancel = useCallback(() => {
    if (window.confirm('Voulez-vous vraiment annuler ? Les modifications non sauvegardées seront perdues.')) {
      navigate(-1);
    }
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="p-lg">
        <div className="animate-pulse space-y-md">
          <div className="h-8 bg-tertiary rounded w-1/3" />
          <div className="space-y-md">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-10 bg-tertiary rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold">{isEdit ? 'Modifier le média' : 'Ajouter un média'}</h1>
          <p className="text-tertiary mt-xs">
            {isEdit ? `Modification de "${media.title}"` : 'Remplissez les informations du nouveau média'}
          </p>
        </div>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-secondary rounded-xl p-lg">
        {/* Recherche automatique : en premier pour pré-remplir le reste du
            formulaire (titre, année, synopsis, casting, genres...) avant de
            passer aux champs manuels. */}
        <div className="space-y-md pb-lg border-b mb-lg">
          <h2 className="text-xl font-semibold">Recherche automatique</h2>
          <div className="flex gap-sm">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans TMDB..."
              className="flex-1 bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              onClick={searchInTMDB}
              className="bg-accent text-white px-md py-sm rounded hover:bg-accent-light transition-colors flex items-center gap-sm"
            >
              <Search className="w-5 h-5" />
              <span>Rechercher</span>
            </button>
          </div>

          {/* Résultats de recherche */}
          {searchResults.length > 0 && (
            <div className="mt-md space-y-sm">
              {searchResults.map(result => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => selectSearchResult(result)}
                  className="w-full flex items-center gap-md p-md rounded-lg hover:bg-tertiary transition-colors text-left"
                >
                  <div className="w-10 h-14 bg-tertiary rounded overflow-hidden flex-shrink-0">
                    {result.poster_path ? (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                        alt={result.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Film className="w-6 h-6 text-tertiary m-auto" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{result.title}</p>
                    <p className="text-xs text-tertiary">
                      {result.release_date?.substring(0, 4)} • ⭐ {result.vote_average}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Section 1: Informations de base */}
        <div className="space-y-lg">
          <h2 className="text-xl font-semibold border-b pb-md">Informations de base</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {/* Titre */}
            <div>
              <label className="block text-sm font-medium mb-sm">
                Titre *
              </label>
              <input
                type="text"
                name="title"
                value={media.title}
                onChange={handleChange}
                placeholder="Titre du média"
                className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                required
              />
            </div>

            {/* Titre original */}
            <div>
              <label className="block text-sm font-medium mb-sm">
                Titre original
              </label>
              <input
                type="text"
                name="original_title"
                value={media.original_title || ''}
                onChange={handleChange}
                placeholder="Titre original (si différent)"
                className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Type de média */}
            <div>
              <label className="block text-sm font-medium mb-sm">
                Type de média *
              </label>
              <select
                name="type_id"
                value={media.type_id}
                onChange={handleChange}
                className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                required
              >
                <option value="1">DVD</option>
                <option value="2">Blu-ray</option>
                <option value="3">CD</option>
              </select>
            </div>

            {/* Année de sortie */}
            <div>
              <label className="block text-sm font-medium mb-sm">
                Année de sortie
              </label>
              <input
                type="number"
                name="release_year"
                value={media.release_year || ''}
                onChange={handleChange}
                placeholder="Année"
                min="1900"
                max={new Date().getFullYear() + 1}
                className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Durée */}
            <div>
              <label className="block text-sm font-medium mb-sm">
                Durée (minutes)
              </label>
              <input
                type="number"
                name="duration_minutes"
                value={media.duration_minutes || ''}
                onChange={handleChange}
                placeholder="Durée en minutes"
                min="0"
                className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {/* Note moyenne */}
            <div>
              <label className="block text-sm font-medium mb-sm">
                Note moyenne
              </label>
              <input
                type="number"
                name="average_rating"
                value={media.average_rating || ''}
                onChange={handleChange}
                placeholder="Note sur 10"
                min="0"
                max="10"
                step="0.1"
                className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          {/* Synopsis */}
          <div>
            <label className="block text-sm font-medium mb-sm">
              Synopsis
            </label>
            <textarea
              name="synopsis"
              value={media.synopsis || ''}
              onChange={handleChange}
              placeholder="Description du média..."
              rows="4"
              className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
        </div>

        {/* Section 2: Identification et localisation */}
        <div className="mt-lg pt-lg border-t space-y-lg">
          <h2 className="text-xl font-semibold">Identification et localisation</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {/* État */}
            {/* Emplacement */}
            <div>
              <label className="block text-sm font-medium mb-sm">
                Emplacement
              </label>
              <div className="flex items-center gap-sm">
                <select
                  name="location_id"
                  value={media.location_id || ''}
                  onChange={handleChange}
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">Sélectionnez un emplacement</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="shrink-0 text-sm text-accent hover:underline whitespace-nowrap"
                  title="Créer un nouvel emplacement (ex: Disque dur externe)"
                >
                  + Nouveau
                </button>
              </div>
              {locations.length === 0 && (
                <p className="text-xs text-tertiary mt-xs">
                  Aucun emplacement encore créé — clique sur "+ Nouveau" pour en créer un (ex: étagère, disque dur externe).
                </p>
              )}
            </div>


            {/* Code-barres */}
            <div>
              <label className="block text-sm font-medium mb-sm">
                Code-barres
              </label>
              <div className="flex gap-sm">
                <input
                  type="text"
                  name="barcode"
                  value={media.barcode || ''}
                  onChange={handleChange}
                  placeholder="Code-barres"
                  className="flex-1 bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={handleScanBarcode}
                  className="p-sm bg-primary border rounded hover:bg-tertiary transition-colors"
                  title="Scanner un code-barres"
                >
                  <Barcode className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Image de la jaquette */}
          <div>
            <label className="block text-sm font-medium mb-sm">
              Image de la jaquette
            </label>
            <div className="flex items-center gap-md">
              {media.jacket_image_url ? (
                <div className="w-20 h-28 bg-tertiary rounded overflow-hidden">
                  <img
                    src={media.jacket_image_url}
                    alt="Jaquette"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-28 bg-tertiary rounded flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-tertiary" />
                </div>
              )}
              <div className="flex gap-sm">
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  className="flex items-center gap-sm bg-primary border rounded px-md py-sm hover:bg-tertiary transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  <span>Prendre une photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMedia(prev => ({ ...prev, jacket_image_url: '' }))}
                  className="p-sm bg-primary border rounded hover:bg-tertiary transition-colors"
                  title="Supprimer l'image"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Identifiants externes */}
        <div className="mt-lg pt-lg border-t space-y-lg">
          <h2 className="text-xl font-semibold">Identifiants externes</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
            <div>
              <label className="block text-sm font-medium mb-sm">
                IMDb ID
              </label>
              <input
                type="text"
                name="imdb_id"
                value={media.imdb_id || ''}
                onChange={handleChange}
                placeholder="tt1234567"
                className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-sm">
                TMDB ID
              </label>
              <input
                type="text"
                name="tmdb_id"
                value={media.tmdb_id || ''}
                onChange={handleChange}
                placeholder="123456"
                className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-sm">
                MusicBrainz ID
              </label>
              <input
                type="text"
                name="musicbrainz_id"
                value={media.musicbrainz_id || ''}
                onChange={handleChange}
                placeholder="ID MusicBrainz"
                className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Catégories et personnes */}
        <div className="mt-lg pt-lg border-t space-y-lg">
          <h2 className="text-xl font-semibold">Classification</h2>

          {/* Catégories */}
          <div>
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-lg font-medium">Catégories</h3>
              <div className="flex items-center gap-md">
                {isEdit && media.tmdb_id && (
                  <button
                    type="button"
                    onClick={reimportGenres}
                    disabled={isReimportingGenres}
                    className="text-sm text-accent hover:underline disabled:opacity-50"
                  >
                    {isReimportingGenres ? 'Réimport...' : 'Réimporter les genres'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(true)}
                  className="text-sm text-accent hover:underline"
                >
                  + Ajouter
                </button>
              </div>
            </div>
            
            {selectedCategories.length > 0 ? (
              <div className="flex flex-wrap gap-sm">
                {selectedCategories.map(category => (
                  <div
                    key={category.id}
                    className="bg-tertiary text-sm px-md py-xs rounded-full flex items-center gap-xs"
                  >
                    <span>{category.name}</span>
                    <button
                      type="button"
                      onClick={() => removeCategory(category.id)}
                      className="text-tertiary hover:text-danger transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-tertiary">Aucune catégorie sélectionnée</p>
            )}
          </div>

          {/* Personnes */}
          <div>
            <div className="flex items-center justify-between mb-md">
              <h3 className="text-lg font-medium">Personnes associées</h3>
              <button
                type="button"
                onClick={() => setShowPersonModal(true)}
                className="text-sm text-accent hover:underline"
              >
                + Ajouter
              </button>
            </div>
            
            {selectedPersons.length > 0 ? (
              <div className="space-y-sm">
                {selectedPersons.map(person => (
                  <div
                    key={person.id}
                    className="flex items-center gap-md p-md rounded-lg bg-tertiary"
                  >
                    <div className="w-10 h-10 bg-accent bg-opacity-10 rounded-full flex items-center justify-center">
                      <span className="text-accent font-bold">{person.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{person.name}</p>
                      <p className="text-xs text-tertiary">{person.role}</p>
                    </div>
                    <select
                      value={person.type}
                      onChange={(e) => {
                        setSelectedPersons(prev => 
                          prev.map(p => 
                            p.id === person.id ? { ...p, type: parseInt(e.target.value) } : p
                          )
                        );
                      }}
                      className="bg-primary border rounded px-sm py-xs text-xs"
                    >
                      <option value="1">Réalisateur</option>
                      <option value="2">Acteur</option>
                      <option value="3">Actrice</option>
                      <option value="4">Musicien</option>
                      <option value="5">Groupe</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => removePerson(person.id)}
                      className="text-tertiary hover:text-danger transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-tertiary">Aucune personne associée</p>
            )}
          </div>
        </div>

        {/* Boutons de soumission */}
        <div className="mt-lg pt-lg border-t flex items-center justify-end gap-md">
          <button
            type="button"
            onClick={handleCancel}
            className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
            disabled={isSubmitting}
          >
            Annuler
          </button>
          <button
            type="submit"
            className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors flex items-center gap-sm"
            disabled={isSubmitting || !media.title.trim()}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                <span>Enregistrement...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{isEdit ? 'Enregistrer les modifications' : 'Ajouter le média'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Modal pour ajouter une catégorie */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-md">
          <div className="bg-secondary rounded-xl p-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="text-xl font-semibold">Ajouter une catégorie</h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-tertiary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-md">
              <div>
                <label className="block text-sm font-medium mb-sm">
                  Nom de la catégorie
                </label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Nom de la catégorie"
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
            <div className="mt-lg flex items-center justify-end gap-md">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={addCategory}
                className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors"
                disabled={!newCategory.trim()}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour ajouter une personne */}
      {showPersonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-md">
          <div className="bg-secondary rounded-xl p-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="text-xl font-semibold">Ajouter une personne</h2>
              <button
                onClick={() => setShowPersonModal(false)}
                className="text-tertiary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-md">
              <div>
                <label className="block text-sm font-medium mb-sm">
                  Nom *
                </label>
                <input
                  type="text"
                  value={newPerson.name}
                  onChange={(e) => setNewPerson(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom de la personne"
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-sm">
                  Rôle
                </label>
                <input
                  type="text"
                  value={newPerson.role}
                  onChange={(e) => setNewPerson(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Rôle (ex: Réalisateur, Acteur)"
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-sm">
                  Type
                </label>
                <select
                  value={newPerson.type}
                  onChange={(e) => setNewPerson(prev => ({ ...prev, type: parseInt(e.target.value) }))}
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="1">Réalisateur</option>
                  <option value="2">Acteur</option>
                  <option value="3">Actrice</option>
                  <option value="4">Musicien</option>
                  <option value="5">Groupe</option>
                  <option value="6">Compositeur</option>
                  <option value="7">Scénariste</option>
                  <option value="8">Producteur</option>
                </select>
              </div>
            </div>
            <div className="mt-lg flex items-center justify-end gap-md">
              <button
                onClick={() => setShowPersonModal(false)}
                className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={addPerson}
                className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors"
                disabled={!newPerson.name.trim()}
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerte de doublon possible (même titre déjà en base) */}
      {duplicateMatches && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-md">
          <div className="bg-secondary rounded-xl p-lg w-full max-w-md">
            <div className="flex items-center gap-md mb-md">
              <AlertTriangle className="w-6 h-6 text-warning flex-shrink-0" />
              <h2 className="text-xl font-semibold">Média déjà présent ?</h2>
            </div>
            <p className="text-sm text-tertiary mb-md">
              Un média avec ce titre existe déjà dans votre médiathèque :
            </p>
            <div className="space-y-sm mb-md">
              {duplicateMatches.map(m => (
                <div key={m.id} className="bg-tertiary rounded-lg px-md py-sm text-sm">
                  <span className="font-medium">{m.title}</span>
                  {' — '}
                  {window.electronAPI.utils.getMediaTypeLabel(m.type_id)}
                  {m.release_year ? ` • ${m.release_year}` : ''}
                </div>
              ))}
            </div>
            <p className="text-sm text-tertiary mb-lg">
              Si c'est un format différent du même titre (ex: DVD et Blu-ray), vous pouvez l'ajouter quand même.
            </p>
            <div className="flex items-center justify-end gap-md">
              <button
                type="button"
                onClick={() => setDuplicateMatches(null)}
                className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={performSave}
                className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors"
              >
                Ajouter quand même
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pour créer un emplacement */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-modal p-md">
          <div className="bg-secondary rounded-xl p-lg w-full max-w-md">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="text-xl font-semibold">Nouvel emplacement</h2>
              <button
                onClick={() => setShowLocationModal(false)}
                className="text-tertiary hover:text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-md">
              <div>
                <label className="block text-sm font-medium mb-sm">
                  Nom *
                </label>
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Disque dur externe, Étagère salon..."
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-sm">
                  Type
                </label>
                <select
                  value={newLocation.type_id}
                  onChange={(e) => setNewLocation(prev => ({ ...prev, type_id: parseInt(e.target.value) }))}
                  className="w-full bg-primary border rounded px-md py-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {locationTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-lg flex items-center justify-end gap-md">
              <button
                onClick={() => setShowLocationModal(false)}
                className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createNewLocation}
                className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors disabled:opacity-50"
                disabled={!newLocation.name.trim() || isCreatingLocation}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddMedia;
