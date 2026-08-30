import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useToast } from '../contexts/ToastContext';
import { Search, X, Filter, LayoutGrid, LayoutList } from 'lucide-react';

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { media, isLoading, searchMedia } = useDatabase();
  const { error: showError } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [isSearching, setIsSearching] = useState(false);

  // Extraire la requête de recherche de l'URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const query = params.get('q') || '';
    setSearchQuery(query);
    
    if (query) {
      handleSearch(query);
    } else {
      setResults(media);
    }
  }, [location.search, media]);

  // Effectuer la recherche
  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setResults(media);
      return;
    }

    try {
      setIsSearching(true);
      const response = await searchMedia(query);
      
      if (response.success) {
        setResults(response.data);

        // Mettre à jour l'URL
        navigate(`/search?q=${encodeURIComponent(query)}`);
      } else {
        showError(response.error || 'Erreur lors de la recherche');
        setResults([]);
      }
    } catch (err) {
      console.error('Erreur lors de la recherche:', err);
      showError(`Erreur lors de la recherche: ${err.message}`);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchMedia, showError, navigate, media]);

  // Effacer la recherche
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setResults(media);
    navigate('/search');
  }, [media, navigate]);

  // Gérer la soumission du formulaire
  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  // Formatage de la durée
  const formatDuration = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Obtenir l'icône du type
  const getTypeIcon = (typeId) => {
    switch (typeId) {
      case 1: return '📀';
      case 2: return '🎬';
      case 3: return '💿';
      default: return '📚';
    }
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

  if (isLoading) {
    return (
      <div className="p-lg">
        <div className="animate-pulse space-y-md">
          <div className="h-8 bg-tertiary rounded w-1/3" />
          <div className="h-12 bg-tertiary rounded w-full max-w-md" />
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
          <h1 className="text-2xl font-bold">Résultats de recherche</h1>
          <p className="text-tertiary mt-xs">
            {results.length} résultat(s) trouvé(s) pour "{searchQuery || 'tous les médias'}"
          </p>
        </div>
        
        {/* Boutons de vue */}
        <div className="flex bg-tertiary rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-sm rounded ${viewMode === 'grid' ? 'bg-secondary' : ''} transition-colors`}
            aria-label="Vue grille"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-sm rounded ${viewMode === 'list' ? 'bg-secondary' : ''} transition-colors`}
            aria-label="Vue liste"
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="bg-secondary rounded-xl p-lg">
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-md top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un média..."
            className="w-full pl-12 pr-12 py-sm bg-primary border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-md top-1/2 -translate-y-1/2 text-tertiary hover:text-primary"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </form>

        {/* Filtres rapides */}
        <div className="mt-lg pt-lg border-t flex flex-wrap gap-md">
          <button
            onClick={() => handleSearch(`type:DVD ${searchQuery}`)}
            className="text-sm text-tertiary hover:text-primary transition-colors"
          >
            DVDs uniquement
          </button>
          <button
            onClick={() => handleSearch(`type:Blu-ray ${searchQuery}`)}
            className="text-sm text-tertiary hover:text-primary transition-colors"
          >
            Blu-rays uniquement
          </button>
          <button
            onClick={() => handleSearch(`type:CD ${searchQuery}`)}
            className="text-sm text-tertiary hover:text-primary transition-colors"
          >
            CDs uniquement
          </button>
        </div>
      </div>

      {/* Résultats */}
      {isSearching ? (
        <div className="text-center py-lg">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent mx-auto" />
          <p className="mt-md text-tertiary">Recherche en cours...</p>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-secondary rounded-xl p-lg text-center">
          <p className="text-tertiary mb-md">Aucun résultat trouvé pour "{searchQuery}"</p>
          <div className="flex flex-col sm:flex-row gap-md justify-center">
            <button
              onClick={clearSearch}
              className="bg-primary border rounded px-lg py-sm hover:bg-tertiary transition-colors"
            >
              Effacer la recherche
            </button>
            <Link to="/media/add">
              <button className="bg-accent text-white px-lg py-sm rounded hover:bg-accent-light transition-colors">
                Ajouter un nouveau média
              </button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-md">
              {results.map(mediaItem => (
                <MediaCard
                  key={mediaItem.id}
                  media={mediaItem}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          ) : (
            <div className="bg-secondary rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-sm px-md text-left">Titre</th>
                    <th className="py-sm px-md text-left hidden md:table-cell">Type</th>
                    <th className="py-sm px-md text-left hidden md:table-cell">Année</th>
                    <th className="py-sm px-md text-left hidden lg:table-cell">Durée</th>
                    <th className="py-sm px-md text-left">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(mediaItem => (
                    <tr
                      key={mediaItem.id}
                      className="border-b last:border-0 hover:bg-tertiary transition-colors"
                    >
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
                      <td className="py-sm px-md">
                        {mediaItem.average_rating ? (
                          <span className="flex items-center gap-xs">
                            ⭐ {mediaItem.average_rating}
                          </span>
                        ) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Composant MediaCard pour les résultats
const MediaCard = ({ media, searchQuery }) => {
  const getStateColor = (stateId) => {
    switch (stateId) {
      case 1: return 'bg-success';
      case 2: return 'bg-info';
      case 3: return 'bg-warning';
      case 4: return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getTypeIcon = (typeId) => {
    switch (typeId) {
      case 1: return '📀';
      case 2: return '🎬';
      case 3: return '💿';
      default: return '📚';
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="group bg-secondary rounded-xl overflow-hidden">
      <Link to={`/media/detail/${media.id}`} className="block">
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
                {getTypeIcon(media.type_id)}
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
          {media.average_rating && (
            <div className="mt-sm flex items-center gap-xs text-sm">
              <span>⭐ {media.average_rating}</span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default SearchResults;
