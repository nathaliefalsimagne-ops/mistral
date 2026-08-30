import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useToast } from '../contexts/ToastContext';
import { useModal } from '../contexts/ModalContext';
import {
  LayoutGrid,
  LayoutList,
  Filter,
  SortAsc,
  SortDesc,
  Plus,
  Search,
  X
} from 'lucide-react';

// Obtenir l'icône du type de média
const getTypeIcon = (mediaItem) => {
  switch (mediaItem.type_id) {
    case 1: return '📀';
    case 2: return '🎬';
    case 3: return '💿';
    default: return '📚';
  }
};

const MediaLibrary = () => {
  const { media, locations, categories, isLoading, filters, updateFilters, resetFilters, deleteMedia } = useDatabase();
  const { success, error: showError } = useToast();
  const { openModal } = useModal();
  const { type } = useParams();

  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [sortBy, setSortBy] = useState('title'); // title, date, rating, year
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [mediaCategoryMap, setMediaCategoryMap] = useState(new Map());

  // Associations média -> catégories, pour le filtre par genre (une simple
  // requête, plutôt que d'interroger media_categories pour chaque média).
  useEffect(() => {
    const loadMediaCategories = async () => {
      const response = await window.electronAPI.db.query(
        'SELECT media_id, category_id FROM media_categories',
        []
      );
      if (response.success) {
        const map = new Map();
        for (const row of response.data) {
          if (!map.has(row.media_id)) map.set(row.media_id, new Set());
          map.get(row.media_id).add(row.category_id);
        }
        setMediaCategoryMap(map);
      }
    };
    loadMediaCategories();
  }, [media]);

  // Filtrer les médias selon le type
  const filteredByType = type 
    ? media.filter(m => {
        const typeLabel = window.electronAPI.utils.getMediaTypeLabel(m.type_id);
        return typeLabel.toLowerCase() === type.toLowerCase();
      })
    : media;

  // Appliquer les filtres
  const filteredMedia = filteredByType.filter(m => {
    // Filtre par recherche
    if (filters.search && !m.title.toLowerCase().includes(filters.search.toLowerCase()) &&
        !m.original_title?.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }

    // Filtre par emplacement
    if (filters.location && m.location_id !== filters.location) {
      return false;
    }

    // Filtre par catégorie
    if (filters.category && !mediaCategoryMap.get(m.id)?.has(filters.category)) {
      return false;
    }

    return true;
  });

  // Trier les médias
  const sortedMedia = [...filteredMedia].sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case 'date':
        aValue = new Date(a.added_date || a.created_at).getTime();
        bValue = new Date(b.added_date || b.created_at).getTime();
        break;
      case 'rating':
        aValue = a.average_rating || 0;
        bValue = b.average_rating || 0;
        break;
      case 'year':
        aValue = a.release_year || 0;
        bValue = b.release_year || 0;
        break;
      case 'title':
      default:
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  // Sélectionner/désélectionner tous les médias
  const toggleSelectAll = useCallback(() => {
    if (selectedMedia.length === filteredMedia.length) {
      setSelectedMedia([]);
    } else {
      setSelectedMedia(filteredMedia.map(m => m.id));
    }
  }, [filteredMedia, selectedMedia]);

  // Sélectionner/désélectionner un média
  const toggleSelectMedia = useCallback((id) => {
    setSelectedMedia(prev => {
      if (prev.includes(id)) {
        return prev.filter(mid => mid !== id);
      } else {
        return [...prev, id];
      }
    });
  }, []);

  // Supprimer les médias sélectionnés
  const handleDeleteSelected = useCallback(async () => {
    if (selectedMedia.length === 0) {
      showError('Aucun média sélectionné');
      return;
    }

    if (window.confirm(`Voulez-vous vraiment supprimer ${selectedMedia.length} média(s) ?`)) {
      try {
        for (const id of selectedMedia) {
          await deleteMedia(id);
        }
        setSelectedMedia([]);
        success(`${selectedMedia.length} média(s) supprimé(s) avec succès`);
      } catch (err) {
        showError(`Erreur lors de la suppression: ${err.message}`);
      }
    }
  }, [selectedMedia, deleteMedia, showError, success]);

  // Obtenir le type de média actuel
  const getCurrentTypeLabel = () => {
    if (!type) return 'Tous les médias';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Obtenir la couleur de l'état
  const getStateColor = (stateId) => {
    switch (stateId) {
      case 1: return 'bg-success';
      case 2: return 'bg-info';
      case 3: return 'bg-warning';
      case 4: return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  // Formatage de la durée
  const formatDuration = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Changer le mode d'affichage
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('mediaViewMode', mode);
  };

  // Charger le mode d'affichage depuis localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('mediaViewMode');
    if (savedMode) {
      setViewMode(savedMode);
    }
  }, []);

  // Réinitialiser la sélection lors du changement de filtres
  useEffect(() => {
    setSelectedMedia([]);
  }, [filters, type]);

  if (isLoading) {
    return (
      <div className="p-lg">
        <div className="animate-pulse space-y-md">
          <div className="h-8 bg-tertiary rounded w-1/3" />
          <div className="flex justify-between items-center">
            <div className="h-6 bg-tertiary rounded w-1/4" />
            <div className="h-6 bg-tertiary rounded w-1/4" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-md">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="aspect-[2/3] bg-tertiary rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
        <div>
          <h1 className="text-2xl font-bold">{getCurrentTypeLabel()}</h1>
          <p className="text-tertiary mt-xs">
            {filteredMedia.length} média(s) trouvé(s)
          </p>
        </div>
        
        <div className="flex items-center gap-md">
          {/* Boutons de vue */}
          <div className="flex bg-tertiary rounded-lg p-1">
            <button
              onClick={() => handleViewModeChange('grid')}
              className={`p-sm rounded ${viewMode === 'grid' ? 'bg-secondary' : ''} transition-colors`}
              aria-label="Vue grille"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`p-sm rounded ${viewMode === 'list' ? 'bg-secondary' : ''} transition-colors`}
              aria-label="Vue liste"
            >
              <LayoutList className="w-4 h-4" />
            </button>
          </div>

          {/* Bouton ajouter */}
          <Link to="/media/add">
            <button className="flex items-center gap-sm bg-accent text-white px-md py-sm rounded-lg hover:bg-accent-light transition-colors">
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Ajouter</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Filtres et tri */}
      <div className="bg-secondary rounded-xl p-lg">
        <div className="flex flex-col md:flex-row md:items-center gap-lg">
          {/* Barre de recherche */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-md top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => updateFilters({ search: e.target.value })}
                placeholder="Rechercher un média..."
                className="w-full pl-10 pr-10 py-sm bg-primary border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {filters.search && (
                <button
                  onClick={() => updateFilters({ search: '' })}
                  className="absolute right-md top-1/2 -translate-y-1/2 text-tertiary hover:text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtres */}
          <div className="flex items-center gap-md">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-sm text-secondary hover:text-primary transition-colors"
            >
              <Filter className="w-5 h-5" />
              <span>Filtres</span>
              {(filters.location || filters.category) && (
                <span className="bg-accent text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {Object.values(filters).filter(f => f !== '' && f !== null).length}
                </span>
              )}
            </button>

            {/* Tri */}
            <div className="flex items-center gap-sm">
              <span className="text-sm text-tertiary">Trier par</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-primary border rounded px-sm py-xs text-base focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="title">Titre</option>
                <option value="date">Date d'ajout</option>
                <option value="year">Année</option>
                <option value="rating">Note</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-sm text-secondary hover:text-primary transition-colors"
              >
                {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
              </button>
            </div>

            {/* Actions sur la sélection */}
            {selectedMedia.length > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="text-danger hover:underline text-sm"
              >
                Supprimer ({selectedMedia.length})
              </button>
            )}
          </div>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="mt-lg pt-lg border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
            <div>
              <label className="block text-sm font-medium mb-sm">Emplacement</label>
              <select
                value={filters.location || ''}
                onChange={(e) => updateFilters({ location: e.target.value || null })}
                className="w-full bg-primary border rounded px-sm py-xs focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Tous les emplacements</option>
                {locations.map(location => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-sm">Catégorie</label>
              <select
                value={filters.category || ''}
                onChange={(e) => updateFilters({ category: e.target.value || null })}
                className="w-full bg-primary border rounded px-sm py-xs focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Toutes les catégories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-sm">Type de média</label>
              <select
                value={type || ''}
                onChange={(e) => {
                  // Changer le type dans l'URL
                  // Cela serait géré par React Router
                }}
                className="w-full bg-primary border rounded px-sm py-xs focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Tous les types</option>
                <option value="DVD">DVD</option>
                <option value="Blu-ray">Blu-ray</option>
                <option value="CD">CD</option>
              </select>
            </div>
            
          </div>
        )}
      </div>

      {/* Résultats */}
      {filteredMedia.length === 0 ? (
        <div className="bg-secondary rounded-xl p-lg text-center">
          <p className="text-tertiary mb-md">Aucun média trouvé</p>
          <Link to="/media/add">
            <button className="bg-accent text-white px-md py-sm rounded-lg hover:bg-accent-light transition-colors">
              Ajouter votre premier média
            </button>
          </Link>
        </div>
      ) : (
        <>
          {/* Actions en masse */}
          {selectedMedia.length > 0 && (
            <div className="bg-secondary rounded-xl p-md flex items-center justify-between">
              <p className="text-sm">
                {selectedMedia.length} média(s) sélectionné(s)
              </p>
              <div className="flex items-center gap-md">
                <button
                  onClick={() => setSelectedMedia([])}
                  className="text-sm text-tertiary hover:text-primary"
                >
                  Tout désélectionner
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="text-sm text-danger hover:underline"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )}

          {/* Affichage des médias */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-md">
              {sortedMedia.map(mediaItem => (
                <MediaCard
                  key={mediaItem.id}
                  media={mediaItem}
                  isSelected={selectedMedia.includes(mediaItem.id)}
                  onSelect={toggleSelectMedia}
                />
              ))}
            </div>
          ) : (
            <div className="bg-secondary rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-sm px-md text-left">
                      <input
                        type="checkbox"
                        checked={selectedMedia.length === filteredMedia.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="py-sm px-md text-left">Titre</th>
                    <th className="py-sm px-md text-left hidden md:table-cell">Type</th>
                    <th className="py-sm px-md text-left hidden md:table-cell">Année</th>
                    <th className="py-sm px-md text-left hidden lg:table-cell">Durée</th>
                    <th className="py-sm px-md text-left hidden lg:table-cell">Note</th>
                    <th className="py-sm px-md text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMedia.map(mediaItem => {
                    const location = locations.find(l => l.id === mediaItem.location_id);
                    return (
                      <tr
                        key={mediaItem.id}
                        className={`border-b last:border-0 hover:bg-tertiary transition-colors ${
                          selectedMedia.includes(mediaItem.id) ? 'bg-tertiary' : ''
                        }`}
                      >
                        <td className="py-sm px-md">
                          <input
                            type="checkbox"
                            checked={selectedMedia.includes(mediaItem.id)}
                            onChange={() => toggleSelectMedia(mediaItem.id)}
                            className="w-4 h-4"
                          />
                        </td>
                        <td className="py-sm px-md">
                          <Link 
                            to={`/media/detail/${mediaItem.id}`} 
                            className="font-medium hover:text-accent transition-colors"
                          >
                            {mediaItem.title}
                          </Link>
                          {mediaItem.original_title && mediaItem.original_title !== mediaItem.title && (
                            <p className="text-xs text-tertiary italic">{mediaItem.original_title}</p>
                          )}
                        </td>
                        <td className="py-sm px-md hidden md:table-cell">
                          {window.electronAPI.utils.getMediaTypeLabel(mediaItem.type_id)}
                        </td>
                        <td className="py-sm px-md hidden md:table-cell">
                          {mediaItem.release_year || 'N/A'}
                        </td>
                        <td className="py-sm px-md hidden lg:table-cell">
                          {formatDuration(mediaItem.duration_minutes)}
                        </td>
                        <td className="py-sm px-md hidden lg:table-cell">
                          {mediaItem.average_rating ? (
                            <span className="flex items-center gap-xs">
                              ⭐ {mediaItem.average_rating}
                            </span>
                          ) : 'N/A'}
                        </td>
                        <td className="py-sm px-md">
                          <div className="flex items-center gap-sm">
                            <Link
                              to={`/media/detail/${mediaItem.id}`}
                              className="text-accent hover:underline text-sm"
                            >
                              Voir
                            </Link>
                            <Link
                              to={`/media/edit/${mediaItem.id}`}
                              className="text-secondary hover:text-primary text-sm"
                            >
                              Modifier
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Réinitialiser les filtres */}
      {(filters.search || filters.location || filters.category) && (
        <div className="text-center">
          <button
            onClick={resetFilters}
            className="text-sm text-tertiary hover:text-primary"
          >
            Réinitialiser les filtres
          </button>
        </div>
      )}
    </div>
  );
};

// Composant MediaCard pour la vue grille
const MediaCard = ({ media, isSelected, onSelect }) => {
  const getStateColor = (stateId) => {
    switch (stateId) {
      case 1: return 'bg-success';
      case 2: return 'bg-info';
      case 3: return 'bg-warning';
      case 4: return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  return (
    <div
      className={`group bg-secondary rounded-xl overflow-hidden cursor-pointer transition-all ${
        isSelected ? 'ring-2 ring-accent' : 'hover:ring-2 ring-accent hover:ring-opacity-50'
      }`}
      onClick={() => onSelect(media.id)}
    >
      {/* Checkbox pour la sélection */}
      <div className="absolute top-sm left-sm z-10" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(media.id)}
          className="w-4 h-4"
        />
      </div>

      {/* Image */}
      <div className="aspect-[2/3] bg-tertiary relative overflow-hidden">
        {media.jacket_image_url ? (
          <img
            src={media.jacket_image_url}
            alt={media.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
            <span className="text-white text-4xl font-bold opacity-50">
              {getTypeIcon(media)}
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-sm right-sm flex flex-col gap-xs">
          {media.state_id && (
            <span className={`text-white text-xs px-sm py-xs rounded ${getStateColor(media.state_id)}`}>
              {window.electronAPI.utils.getMediaStateLabel(media.state_id)}
            </span>
          )}
        </div>
      </div>

      {/* Infos */}
      <div className="p-md">
        <h3 className="font-medium text-ellipsis overflow-hidden whitespace-nowrap">
          {media.title}
        </h3>
        {media.original_title && media.original_title !== media.title && (
          <p className="text-xs text-tertiary italic">
            {media.original_title}
          </p>
        )}
        <div className="flex items-center justify-between mt-sm text-xs text-tertiary">
          <span>{media.release_year || 'N/A'}</span>
          <span>
            {window.electronAPI.utils.getMediaTypeLabel(media.type_id)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary;
